from __future__ import annotations

import json
import os
import time
from pathlib import Path


class WorkspaceError(ValueError):
    pass


def workspace_root() -> Path:
    root = os.environ.get("GOTTHARD_WORKSPACE") or os.getcwd()
    return Path(root).expanduser().resolve()


def gotthard_dir() -> Path:
    d = workspace_root() / ".gotthard"
    d.mkdir(parents=True, exist_ok=True)
    return d


def resolve_in_workspace(path: str, *, must_exist: bool = False) -> Path:
    if not path or "\x00" in path:
        raise WorkspaceError("Empty or invalid path")
    root = workspace_root()
    p = Path(path).expanduser()
    if not p.is_absolute():
        p = root / p
    p = p.resolve()
    if p != root and root not in p.parents:
        raise WorkspaceError(f"Path is outside the workspace ({root}): {path}")
    if must_exist and not p.exists():
        raise WorkspaceError(f"File not found: {rel(p)}")
    return p


def rel(p: Path) -> str:
    try:
        return str(p.relative_to(workspace_root()))
    except ValueError:
        return str(p)


def versioned_path(p: Path) -> Path:
    if not p.exists():
        return p
    stem, suffix = p.stem, p.suffix
    base = stem
    if "_v" in stem:
        head, _, tail = stem.rpartition("_v")
        if tail.isdigit():
            base = head
    n = 2
    while True:
        cand = p.with_name(f"{base}_v{n}{suffix}")
        if not cand.exists():
            return cand
        n += 1


def output_path(path: str, overwrite: bool, expected_suffix: str) -> Path:
    p = resolve_in_workspace(path)
    if p.suffix.lower() != expected_suffix:
        p = p.with_suffix(expected_suffix)
    if {".gotthard", ".git"} & set(p.relative_to(workspace_root()).parts):
        raise WorkspaceError("Writing into .gotthard/ or .git/ is not allowed")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p if overwrite else versioned_path(p)


def log_event(kind: str, **data) -> None:
    try:
        logs = gotthard_dir() / "logs"
        logs.mkdir(exist_ok=True)
        with open(logs / f"{kind}.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), **data}, ensure_ascii=False) + "\n")
    except OSError:
        pass
