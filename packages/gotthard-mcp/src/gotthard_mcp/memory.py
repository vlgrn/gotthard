from __future__ import annotations

import json
import os
import re
import sys
import time

from mcp.server.mcpserver import MCPServer

from .common import gotthard_dir, log_event
from .indexer import Indexer, connect

NOTES_HEADINGS = {"de": "## Notizen", "fr": "## Notes", "it": "## Note", "en": "## Notes"}

server = MCPServer(
    name="gotthard-memory",
    instructions=(
        "Local memory of this practice. Use search_documents to find passages in the user's files before "
        "answering questions about patients, procedures or past correspondence, and cite the returned file paths. "
        "Use remember to propose a short organisational fact for the practice memory; the user approves every note."
    ),
)
indexer = Indexer()


def memory_file():
    return gotthard_dir() / "memory.md"


def lang() -> str:
    return (os.environ.get("GOTTHARD_LANG") or "de")[:2]


@server.tool()
def search_documents(query: str, limit: int = 8, folder: str | None = None) -> dict:
    """Search all documents in the workspace (PDF, Word, Excel, text) and return the most relevant
    passages with file path and page/sheet. Use natural-language or keyword queries, e.g.
    "Überweisung Kardiologie Muster". Optionally restrict to a folder (relative path)."""
    indexer.maybe_rescan()
    results = indexer.search(query, limit=max(1, min(limit, 20)), folder=folder)
    st = indexer.status()
    note = None
    if st["indexing_now"]:
        note = f"Index is still being built ({st['progress']['files_done']}/{st['progress']['files_total']} files); results may be incomplete."
    return {"results": results, "note": note}


@server.tool()
def remember(note: str, subject: str | None = None) -> dict:
    """Save ONE short, durable organisational fact to the practice memory, e.g. subject="Rezepte",
    note="Wiederholungsrezepte nur nach Rücksprache mit Dr. Meier ausstellen".
    The user sees the note and must approve it. Never store patients' health data, secrets or passwords."""
    note = " ".join(note.split())
    if not note:
        raise ValueError("Empty note")
    if len(note) > 500:
        raise ValueError("Note too long – keep it to one or two sentences")
    line = f"- {time.strftime('%d.%m.%Y')}" + (f" · **{subject.strip()}**" if subject else "") + f": {note}"
    f = memory_file()
    text = f.read_text(encoding="utf-8") if f.exists() else ""
    heading = next((h for h in NOTES_HEADINGS.values() if h in text), None)
    if heading is None:
        heading = NOTES_HEADINGS.get(lang(), "## Notes")
        text = text.rstrip() + f"\n\n{heading}\n"
    idx = text.index(heading) + len(heading)
    nxt = re.search(r"\n## ", text[idx:])
    end = idx + nxt.start() if nxt else len(text)
    section = text[idx:end].rstrip()
    text = text[:idx] + section + "\n" + line + "\n" + text[end:]
    f.write_text(text, encoding="utf-8")
    log_event("memory", action="remember", subject=subject, note=note)
    return {"saved": line}


def forget(name: str) -> dict:
    needle = name.lower()
    removed_notes = 0
    f = memory_file()
    if f.exists():
        kept = []
        for line in f.read_text(encoding="utf-8").splitlines():
            if line.lstrip().startswith("- ") and needle in line.lower():
                removed_notes += 1
                continue
            kept.append(line)
        f.write_text("\n".join(kept) + "\n", encoding="utf-8")
    con = connect()
    paths = {r[0] for r in con.execute("SELECT DISTINCT path FROM chunks WHERE lower(path) LIKE ? OR lower(text) LIKE ?", (f"%{needle}%", f"%{needle}%"))}
    for p in paths:
        Indexer._drop(con, p)
    con.commit()
    con.close()
    cfg_path = gotthard_dir() / "config.json"
    try:
        cfg = json.loads(cfg_path.read_text())
    except (OSError, ValueError):
        cfg = {}
    excl = set(cfg.get("index_exclude", []))
    excl.add(name)
    cfg["index_exclude"] = sorted(excl)
    cfg_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
    log_event("memory", action="forget", name=name, notes=removed_notes, documents=len(paths))
    return {"notes_removed": removed_notes, "documents_removed_from_index": sorted(paths)}


def main() -> None:
    args = sys.argv[1:]
    if not args:
        indexer.start_background()
        server.run("stdio")
        return
    cmd = args[0]
    if cmd == "forget" and len(args) > 1:
        print(json.dumps(forget(" ".join(args[1:])), ensure_ascii=False, indent=2))
    elif cmd == "reindex":
        print(json.dumps(indexer.index(full="--full" in args), indent=2))
        print(json.dumps(indexer.status(), indent=2))
    elif cmd == "status":
        print(json.dumps(indexer.status(), indent=2))
    elif cmd == "search" and len(args) > 1:
        print(json.dumps(indexer.search(" ".join(args[1:])), ensure_ascii=False, indent=2))
    else:
        raise SystemExit("usage: gotthard-memory [forget <name> | reindex [--full] | status | search <query>]")


if __name__ == "__main__":
    main()
