# Gotthard

**Swiss-sovereign, open-source agentic assistant for SMEs.** An AI agent that works directly on a local folder – reads bank statements, builds Excel summaries, drafts letters from your letterhead, sorts scans – running on Swiss-hosted open models (Infomaniak) or fully local (Ollama). Files and memory never leave the machine; only model prompts go to the chosen provider.

> Status: **MVP engine layer + CLI** (spec v0.1, [SPEC.md](SPEC.md)). The Tauri desktop shell (fork of OpenWork) is the next milestone; everything it needs from the engine side is here and works today through a browser UI or the terminal.

---

## Try it in 3 minutes

Requirements: macOS / Linux / Windows with **Node ≥ 20** and **[uv](https://docs.astral.sh/uv/)** (Python is fetched by uv).

```bash
git clone https://github.com/vlgrn/gotthard && cd gotthard
npm install              # installs the pinned engine (opencode 1.19.4) and the Python tools
./gotthard setup       # wizard: language → model provider → workspace (+ demo files) → profile
./gotthard start       # opens the chat in your browser, already logged in
```

In the wizard, pick **OpenCode Zen** and leave the key empty: the free models work without an account. Accept the demo files when asked; they create a fictional Treuhand office with bank statements, scans and client folders.

Then try the five use cases in the chat:

| # | Prompt (German, works the same in French) | Expected result |
|---|---|---|
| U1 | *Kategorisiere alle Transaktionen in den 3 PDFs im Ordner Bankauszuege und erstelle eine Excel-Zusammenfassung nach Konto.* | `Ergebnisse/Kontierung_….xlsx` with transactions, totals per KMU account, balance check |
| U2 | *Entwirf einen Brief an den Klienten Müller AG, in dem du die fehlenden MWST-Unterlagen erklärst. Verwende unsere Briefvorlage.* | `Klienten/Mueller_AG/Korrespondenz/…_Brief_….docx` on the letterhead template |
| U3 | *Sortiere die Scans im Ordner Eingang in die Klientenordner und benenne sie nach Datum und Dokumenttyp um.* | files moved to `Klienten/<client>/2026-02-14_Steuerveranlagung_….pdf` + log |
| U4 | *Was haben wir mit dem Klienten Keller über die Honorare für den Abschluss 2025 vereinbart?* | CHF 2'400 flat fee, CHF 140/h payroll extra, with file references; proposes a memory note (you approve it) |
| U5 | *Führe die Jahresabschluss-Checkliste 2025 für den Klienten Müller AG durch und liste auf, was fehlt.* | `Checkliste_….md` + `.xlsx` with present / missing / unclear items |

Prefer the terminal? `./gotthard tui`. For a one-shot run without UI: `./gotthard run "…"`.

Other things to try:
- Switch to the **nur-lesen** agent (agent picker): it can answer but every write/move is blocked.
- Ask it to run a shell command or fetch a web page: you get an approval prompt (Allow once / Always / Reject).
- `./gotthard memory show` shows the company memory, including notes you approved. `./gotthard memory forget "Keller"` removes them.
- `./gotthard logs approvals` / `logs moves` show the local audit trail.

### Automated check of all use cases

```bash
./gotthard eval            # fresh demo workspace per task, headless, scored against a rubric
./gotthard eval --model kimi-k2.6 --only u1-bank
npm test                     # unit tests (Python tools + config/plugin)
```

This is the spec's feasibility gate (V2) and regression suite (V3): it prints PASS/FAIL per task and the overall pass rate against the 70 % threshold.

Last run (24.10.2026, free model `opencode/glm-5.3-flash-free`): **6/6 tasks passed**, 20–110 s and roughly 22–39k tokens per task.

| Task | Result | Time |
|---|---|---|
| u1-bank (3 statements → Excel by account) | PASS 3/3 | 111 s |
| u2-letter (letter on letterhead) | PASS 3/3 | 67 s |
| u3-triage (6 scans sorted and renamed) | PASS 5/5 | 48 s |
| u4-qa (Keller fee agreement) | PASS 3/3 | 28 s |
| u5-checklist (year-end checklist) | PASS 3/3 | 87 s |
| fr-qa (same question in French) | PASS 2/2 | 19 s |

The demo set is small and synthetic. The real V2 gate needs the 20 anonymised tasks from customer interviews, run against the Infomaniak models.

---

## Switching to Swiss hosting (Infomaniak)

OpenCode Zen is for **testing with fictional data only**: it is not hosted in Switzerland, and `gotthard doctor` warns about it. For real client data:

```bash
./gotthard setup     # choose "Infomaniak AI", paste API token + product ID, "Test connection" lists models
```

All non-Zen providers (Infomaniak, Ollama, any OpenAI-compatible endpoint) share one code path: the engine's bundled OpenAI-compatible adapter. Default base URL: `https://api.infomaniak.com/2/ai/<product_id>/openai/v1`. With Infomaniak or Ollama the document index also gets semantic search (embeddings: `bge_multilingual_gemma2` or `bge-m3`). With Zen it falls back to keyword search (SQLite FTS5).

---

## What's inside

```
bin/gotthard.mjs              CLI (setup, start, tui, run, serve, memory, skills, trust, logs, eval, doctor)
src/                          launcher: settings, keychain secrets, providers, config preset, engine env
packages/
  gotthard-preset/prompts/    system prompts for the two agents (assistent / nur-lesen) in DE, FR, EN
  gotthard-skills/{de,fr}/    5 Swiss skills (U1–U5), written natively in DE and FR
  gotthard-skills/common/     office-python: how to edit Word/Excel with Python via bash (forms, tables)
  gotthard-brand/             logo, colours, title: injected into the web UI by the local gateway
  gotthard-skills/templates/  Briefvorlage.docx, Modele_lettre.docx, kmu-kontenrahmen.csv
  gotthard-mcp/               Python MCP servers
    office.py                 read_document, create_xlsx, create_docx (templates), create_pdf, convert_to_pdf, move_file
    memory.py                 search_documents, remember (needs approval)
    indexer.py                local SQLite index: FTS5 + optional embeddings, hybrid ranking
  gotthard-plugin/gotthard.js engine plugin: approval/action audit log, no-overwrite guard
evals/                        task set + runner for V2/V3
scripts/build_assets.py       builds templates and the demo workspace
```

### How it maps to the spec

| Spec | Implementation |
|---|---|
| Bundled engine, pinned (§4) | `opencode-ai@1.19.4`, run with isolated `XDG_*` dirs under the app data folder, so it never reads the user's own opencode config, auth or sessions |
| F1 onboarding | `gotthard setup`: language (OS default), provider with live connection test and model list, workspace, optional demo files, company profile, privacy summary |
| F3.7 agents | `assistent` (default) and `nur-lesen` (FR: `assistant` / `lecture-seule`); built-in coding agents disabled |
| F4.1 permissions | read/glob/grep/list/edit inside workspace = allow; bash, webfetch = ask; websearch = deny; anything outside the workspace = deny; `.env` unreadable; `.gotthard/` not editable by the agent |
| F4.3 trusted mode | `gotthard trust --yes` (per workspace, warning shown) |
| F4.4 approval log | `.gotthard/logs/approvals.jsonl` (+ `actions`, `moves`, `files`, `memory`) |
| F5 skills | 5 skills DE + FR; `gotthard skills list/disable/enable/import` |
| F6.1 company memory | `.gotthard/memory.md`, injected into every session, plain Markdown |
| F6.2 session notes | `remember` tool is permission-gated: every note is shown and must be approved |
| F6.3/6.4 document index | background indexing of PDF/docx/xlsx/csv/txt/md into `.gotthard/index.db`; `search_documents` returns passages with paths and pages |
| F6.5 forget | `gotthard memory forget "<client>"` removes notes and excludes matching documents from the index |
| F7 file outputs | xlsx (formats, formulas, totals, multiple sheets), docx (from templates with `{{FIELDS}}`, or from scratch), pdf (direct, or docx→pdf via LibreOffice if installed); outputs never overwrite: `_v2`, `_v3` |
| M1–M5 providers | Zen (testing), Infomaniak, Ollama (detects local install, warns on small models), custom endpoint |
| M7 | share disabled, autoupdate off, models.dev fetch off, only the configured provider enabled, project-level configs in client folders ignored |
| S3 | engine listens on 127.0.0.1 only, random port, random per-launch password |
| S5 | API tokens in the OS keychain (`@napi-rs/keyring`), passed to the engine via env, never written to config |
| L1 | UI strings and prompts DE/FR, Swiss conventions (ss, CHF 1'234.50, 24.10.2026) |

### Not in this milestone

- **Desktop app** (Tauri fork of OpenWork, rebranding, approval dialogs in a native UI, memory screen, file panel, signed installers, updater). The CLI's `gotthard serve` already prints `{url, username, password}` as JSON: that is the sidecar contract the desktop shell will use.
- Bundled Python runtime: currently provided by `uv` from `packages/gotthard-mcp/uv.lock`.
- OCR for scanned images without a text layer (reported as "no text layer").
- CHF usage display (M6): per-model prices can be set in `settings.json` → `prices` (CHF per 1M tokens) and show up in the engine's cost figures; a dedicated CHF view comes with the desktop UI.
- Italian skills and UI (IT currently uses English UI and French skills).
- Windows is untested; paths for the Python venv on Windows are handled but not verified.

## Development

```bash
npm install                 # also runs uv sync for packages/gotthard-mcp
npm test
npm run build:templates     # regenerate docx/csv templates
GOTTHARD_HOME=/tmp/gh ./gotthard setup   # isolated app data for experiments
```

Settings live in `~/Library/Application Support/Gotthard` (macOS), `%APPDATA%\Gotthard` (Windows) or `~/.config/gotthard`. `gotthard config` prints the generated engine configuration.

## License

MIT, see [LICENSE](LICENSE). Bundles opencode (MIT, © opencode contributors), see [LICENSES/](LICENSES/).
