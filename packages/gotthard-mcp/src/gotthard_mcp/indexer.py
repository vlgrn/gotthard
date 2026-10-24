from __future__ import annotations

import json
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np

from . import readers
from .common import gotthard_dir, log_event, rel, workspace_root

CHUNK_CHARS = 1200
CHUNK_OVERLAP = 200
MAX_FILE_BYTES = 30 * 1024 * 1024
SKIP_DIRS = {".gotthard", ".git", "node_modules", ".opencode", "__pycache__", ".venv"}
EMBED_BATCH = 16

SCHEMA = """
CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, mtime REAL, size INTEGER, indexed_at REAL, error TEXT);
CREATE TABLE IF NOT EXISTS chunks(id INTEGER PRIMARY KEY, path TEXT, location TEXT, text TEXT, embedding BLOB);
CREATE INDEX IF NOT EXISTS chunks_path ON chunks(path);
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(text, tokenize='unicode61 remove_diacritics 2');
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
"""


def db_path() -> Path:
    return gotthard_dir() / "index.db"


def connect() -> sqlite3.Connection:
    con = sqlite3.connect(db_path(), timeout=30)
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript(SCHEMA)
    return con


class Embedder:

    def __init__(self) -> None:
        self.base = (os.environ.get("GOTTHARD_EMBED_BASE_URL") or "").rstrip("/")
        self.model = os.environ.get("GOTTHARD_EMBED_MODEL") or ""
        self.key = os.environ.get("GOTTHARD_EMBED_API_KEY") or ""
        self.enabled = bool(self.base and self.model)
        self.last_error: str | None = None

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        if not self.enabled or not texts:
            return None
        body = json.dumps({"model": self.model, "input": texts}).encode()
        req = urllib.request.Request(f"{self.base}/embeddings", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        if self.key:
            req.add_header("Authorization", f"Bearer {self.key}")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)["data"]
            self.last_error = None
            return [d["embedding"] for d in sorted(data, key=lambda d: d.get("index", 0))]
        except (urllib.error.URLError, KeyError, ValueError, TimeoutError) as e:
            self.last_error = str(e)
            log_event("index", level="warn", msg="embedding failed, falling back to keyword search", error=str(e))
            return None


def chunk(text: str) -> list[str]:
    text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) <= CHUNK_CHARS:
        return [text] if text else []
    out, start = [], 0
    while start < len(text):
        end = min(len(text), start + CHUNK_CHARS)
        if end < len(text):
            cut = text.rfind("\n", start + CHUNK_CHARS // 2, end)
            if cut == -1:
                cut = text.rfind(" ", start + CHUNK_CHARS // 2, end)
            if cut != -1:
                end = cut
        out.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return [c for c in out if c]


def excluded_patterns() -> list[str]:
    cfg = gotthard_dir() / "config.json"
    try:
        return [p.lower() for p in json.loads(cfg.read_text()).get("index_exclude", [])]
    except (OSError, ValueError):
        return []


def iter_files():
    root = workspace_root()
    excl = excluded_patterns()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.startswith((".", "~$")):
                continue
            p = Path(dirpath) / name
            if p.suffix.lower() not in readers.INDEXABLE:
                continue
            r = rel(p)
            if any(x in r.lower() for x in excl):
                continue
            yield p, r


class Indexer:
    def __init__(self) -> None:
        self.embedder = Embedder()
        self.lock = threading.Lock()
        self.running = False
        self.last_scan = 0.0
        self.progress = {"files_total": 0, "files_done": 0}

    def start_background(self, full: bool = False) -> bool:
        if self.running:
            return False
        self.running = True
        threading.Thread(target=self._run, args=(full,), daemon=True).start()
        return True

    def maybe_rescan(self, min_interval: float = 60) -> None:
        if time.time() - self.last_scan > min_interval:
            self.start_background()

    def _run(self, full: bool) -> None:
        try:
            self.index(full=full)
        except Exception as e:
            log_event("index", level="error", error=repr(e))
        finally:
            self.running = False
            self.last_scan = time.time()

    def index(self, full: bool = False) -> dict:
        con = connect()
        with self.lock:
            if full:
                con.executescript("DELETE FROM files; DELETE FROM chunks; DELETE FROM chunks_fts;")
            known = {r[0]: (r[1], r[2]) for r in con.execute("SELECT path, mtime, size FROM files")}
            seen, todo = set(), []
            for p, r in iter_files():
                seen.add(r)
                st = p.stat()
                if st.st_size > MAX_FILE_BYTES:
                    continue
                if known.get(r) != (st.st_mtime, st.st_size):
                    todo.append((p, r, st))
            removed = [r for r in known if r not in seen]
            for r in removed:
                self._drop(con, r)
            self.progress = {"files_total": len(todo), "files_done": 0}
            con.commit()
        for p, r, st in todo:
            try:
                segs = readers.extract(p)
                pieces = [(seg.location, c) for seg in segs for c in chunk(seg.text)]
                err = None
            except Exception as e:
                pieces, err = [], repr(e)
            vectors = self._embed_all([c for _, c in pieces]) if pieces else None
            with self.lock:
                self._drop(con, r)
                for i, (loc, text) in enumerate(pieces):
                    blob = _pack(vectors[i]) if vectors else None
                    cur = con.execute("INSERT INTO chunks(path, location, text, embedding) VALUES (?,?,?,?)", (r, loc, text, blob))
                    con.execute("INSERT INTO chunks_fts(rowid, text) VALUES (?,?)", (cur.lastrowid, f"{r}\n{text}"))
                con.execute(
                    "INSERT OR REPLACE INTO files(path, mtime, size, indexed_at, error) VALUES (?,?,?,?,?)",
                    (r, st.st_mtime, st.st_size, time.time(), err),
                )
                if vectors:
                    con.execute("INSERT OR REPLACE INTO meta(key, value) VALUES ('embed_model', ?)", (self.embedder.model,))
                con.commit()
            self.progress["files_done"] += 1
        con.close()
        if todo or removed:
            log_event("index", indexed=len(todo), removed=len(removed))
        return {"indexed": len(todo), "removed": len(removed)}

    def _embed_all(self, texts: list[str]):
        if not self.embedder.enabled:
            return None
        out: list[list[float]] = []
        for i in range(0, len(texts), EMBED_BATCH):
            v = self.embedder.embed(texts[i : i + EMBED_BATCH])
            if v is None:
                return None
            out.extend(v)
        return out

    @staticmethod
    def _drop(con: sqlite3.Connection, r: str) -> None:
        ids = [row[0] for row in con.execute("SELECT id FROM chunks WHERE path=?", (r,))]
        con.executemany("DELETE FROM chunks_fts WHERE rowid=?", [(i,) for i in ids])
        con.execute("DELETE FROM chunks WHERE path=?", (r,))
        con.execute("DELETE FROM files WHERE path=?", (r,))


    def search(self, query: str, limit: int = 8, folder: str | None = None) -> list[dict]:
        con = connect()
        fts = self._fts(con, query, 40)
        vec = self._vector(con, query, 40)
        scores: dict[int, float] = {}
        for ranked in (fts, vec):
            for rank, cid in enumerate(ranked):
                scores[cid] = scores.get(cid, 0) + 1 / (60 + rank)
        ordered = sorted(scores, key=scores.get, reverse=True)
        results = []
        for cid in ordered:
            row = con.execute("SELECT path, location, text FROM chunks WHERE id=?", (cid,)).fetchone()
            if not row:
                continue
            if folder and not row[0].lower().startswith(folder.lower().strip("/")):
                continue
            results.append({"path": row[0], "location": row[1], "passage": row[2]})
            if len(results) >= limit:
                break
        con.close()
        return results

    @staticmethod
    def _fts(con, query: str, k: int) -> list[int]:
        words = [w for w in re.findall(r"[\w']+", query.lower()) if len(w) >= 2]
        if not words:
            return []
        expr = " OR ".join(f'"{w}"*' for w in words)
        try:
            return [r[0] for r in con.execute("SELECT rowid FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT ?", (expr, k))]
        except sqlite3.OperationalError:
            return []

    def _vector(self, con, query: str, k: int) -> list[int]:
        if not self.embedder.enabled:
            return []
        rows = con.execute("SELECT id, embedding FROM chunks WHERE embedding IS NOT NULL").fetchall()
        if not rows:
            return []
        q = self.embedder.embed([query])
        if not q:
            return []
        mat = np.vstack([np.frombuffer(b, dtype=np.float32) for _, b in rows])
        qv = np.asarray(q[0], dtype=np.float32)
        if mat.shape[1] != qv.shape[0]:
            return []
        sims = (mat @ qv) / (np.linalg.norm(mat, axis=1) * np.linalg.norm(qv) + 1e-9)
        top = np.argsort(-sims)[:k]
        return [rows[i][0] for i in top]

    def status(self) -> dict:
        con = connect()
        files = con.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        errors = con.execute("SELECT path, error FROM files WHERE error IS NOT NULL LIMIT 10").fetchall()
        chunks, embedded = con.execute("SELECT COUNT(*), COUNT(embedding) FROM chunks").fetchone()
        con.close()
        return {
            "files_indexed": files,
            "passages": chunks,
            "passages_with_embeddings": embedded,
            "embedding_model": self.embedder.model if self.embedder.enabled else None,
            "embedding_error": self.embedder.last_error,
            "indexing_now": self.running,
            "progress": self.progress,
            "errors": [{"path": p, "error": e} for p, e in errors],
        }


def _pack(v: list[float]) -> bytes:
    return np.asarray(v, dtype=np.float32).tobytes()
