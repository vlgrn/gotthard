"""memory MCP server (F6.1–F6.5): company memory (.gotthard/memory.md), approved notes, document search.

Also usable as a CLI by the launcher:
    gotthard-memory forget "Keller"     # remove notes + exclude matching documents from the index
    gotthard-memory reindex [--full]
    gotthard-memory status
"""

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
        "Local memory of this office. Use search_documents to find passages in the user's files before "
        "answering questions about clients, agreements or past work, and cite the returned file paths. "
        "Use remember to propose a short durable fact for the company memory; the user approves every note."
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
    "Keller Honorar Abschluss 2025". Optionally restrict to a folder (relative path)."""
    indexer.maybe_rescan()
    results = indexer.search(query, limit=max(1, min(limit, 20)), folder=folder)
    st = indexer.status()
    note = None
    if st["indexing_now"]:
        note = f"Index is still being built ({st['progress']['files_done']}/{st['progress']['files_total']} files); results may be incomplete."
    return {"results": results, "note": note}


@server.tool()
def index_status() -> dict:
    """Show how many workspace documents are indexed and whether semantic (embedding) search is active."""
    return indexer.status()


@server.tool()
def memory_read() -> str:
    """Return the company memory (.gotthard/memory.md): firm profile and approved notes."""
    f = memory_file()
    return f.read_text(encoding="utf-8") if f.exists() else "(empty)"


@server.tool()
def remember(note: str, subject: str | None = None) -> dict:
    """Save ONE short, durable fact to the company memory, e.g. subject="Klient Keller",
    note="Pauschalhonorar CHF 2'400 für den Abschluss 2025 vereinbart (Mail vom 12.03.2026)".
    The user sees the note and must approve it. Do not store secrets, passwords or bank credentials."""
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
    # append at the end of the notes section
    idx = text.index(heading) + len(heading)
    nxt = re.search(r"\n## ", text[idx:])
    end = idx + nxt.start() if nxt else len(text)
    section = text[idx:end].rstrip()
    text = text[:idx] + section + "\n" + line + "\n" + text[end:]
    f.write_text(text, encoding="utf-8")
    log_event("memory", action="remember", subject=subject, note=note)
    return {"saved": line}


@server.tool()
def reindex(full: bool = False) -> dict:
    """Start re-indexing the workspace documents in the background (full=true rebuilds from scratch)."""
    started = indexer.start_background(full=full)
    return {"started": started, "status": indexer.status()}


# ---------------------------------------------------------------- CLI (used by the launcher)


def forget(name: str) -> dict:
    """Remove every memory note mentioning `name` and exclude/delete matching documents from the index."""
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
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
