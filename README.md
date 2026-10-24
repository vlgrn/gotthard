# Gotthard

**A Swiss-sovereign, open-source AI secretary for medical practices, clinics and hospitals.** Gotthard works directly on a local folder: it reads reports, drafts letters on your letterhead, fills in forms and sorts incoming documents. It runs on Swiss-hosted open models (Infomaniak) or fully local (Ollama). Files and memory stay on the machine; only model prompts go to the chosen provider. It does not make diagnoses.

> Status: MVP. Desktop app (Electron, development build) and CLI on top of a pinned opencode engine. See [SPEC.md](SPEC.md) for the original plan.

## Try it

Requirements: macOS with **Node ≥ 20**, **[uv](https://docs.astral.sh/uv/)** and git.

```bash
git clone https://github.com/vlgrn/gotthard && cd gotthard
npm install        # pinned engine (opencode 1.19.4), Electron, Python tools
npm run app        # desktop app; the first launch opens the setup wizard
```

In the wizard, pick **OpenCode Zen** (free models, no account, for fictional data only) and accept the demo files: a fictional practice with patient folders and an inbox of scans. Then try:

| Prompt | Expected result |
|---|---|
| *Seit wann ist Claire Dubois in psychologischer Behandlung und welche Therapie erhält sie?* | answer with the source file |
| *Sortiere die Scans im Ordner Eingang in die Patientenordner und benenne sie nach Datum und Dokumenttyp um.* | lab report, discharge letter and cost approval moved to the right patient folders, logged |
| *Schreibe einen Brief an Hans Weber zur Bestätigung seines nächsten Termins. Verwende unsere Briefvorlage.* | `.docx` on the letterhead, marked as draft for review |
| *Remplis le formulaire Word … avec les données du dossier patient.* | the agent writes and runs Python to fill the form fields, then verifies them |

A fresh first launch without touching your settings: `GOTTHARD_HOME=/tmp/gotthard-test npm run app`. The menu *Gotthard → Configuration…* reopens the wizard.

Terminal instead of the app: `./gotthard setup`, then `./gotthard start` (browser) or `./gotthard tui`.

### Checks

```bash
npm test             # unit tests (Python tools, config, plugin)
./gotthard eval      # demo tasks, headless, scored against a rubric
```

Last eval run (24.10.2026, free model `glm-5.3-flash-free`): 4/4 tasks passed (dossier question, inbox triage, appointment letter, question in French).

## Swiss hosting

OpenCode Zen is for testing with fictional data only; `./gotthard doctor` warns about it. For real patient data, choose **Infomaniak AI** in the wizard (API token + product ID; the connection test lists the models), or **Ollama** for fully local use. All non-Zen providers use the engine's OpenAI-compatible adapter; only the configured provider is enabled.

## How it works

- **Engine:** opencode, pinned, run with its own isolated config and data folders. Only the workspace folder is accessible; shell commands and web access ask for approval; sharing, update checks and the model catalog download are off.
- **Agents:** `assistent` (default) and `nur-lesen` (read-only). Medical-secretary prompts in DE/FR/EN: no diagnoses, medical content only from documents, drafts marked for physician review, no health data in the practice memory.
- **Tools:** `read_document`, `create_xlsx`, `create_docx` (letterhead templates), `create_pdf`, `convert_to_pdf`, `move_file` (never overwrites, logged), `search_documents` (local index), `remember` (practice memory, approved by the user). For anything else the agent writes and runs Python (python-docx, openpyxl, pypdf, pdfplumber, reportlab) via bash, guided by the `office-python` skill.
- **Desktop:** Electron app with a setup wizard; a local gateway puts the engine behind a per-launch password, logs the browser in with a cookie, and applies the Gotthard branding.
- **Local data:** `.gotthard/` in the workspace holds `memory.md`, the document index and audit logs (approvals, actions, moves). API keys live in the macOS Keychain.

```
app/                          Electron app: main process, setup wizard, loading screen
bin/gotthard.mjs              CLI (setup, start, tui, run, serve, memory, skills, trust, logs, eval, doctor)
src/                          settings, keychain, providers, engine config, gateway, server
packages/gotthard-preset/     agent prompts (DE, FR, EN)
packages/gotthard-skills/     office-python skill, letter templates
packages/gotthard-mcp/        Python MCP servers: office tools, memory and document index
packages/gotthard-plugin/     engine plugin: audit log, no-overwrite guard
packages/gotthard-brand/      logo, colours, help pages
evals/                        demo task set and runner
scripts/build_assets.py       letter templates and demo workspace
```

Not done yet: signed `.dmg` packaging, bundled Python runtime, OCR for scanned images, Windows.

## Privacy

See [PRIVACY.md](PRIVACY.md) (template for practices, DE/FR) and [NETWORK.md](NETWORK.md) (every network destination).

## License

MIT, see [LICENSE](LICENSE). Bundles opencode (MIT, © opencode contributors), see [LICENSES/](LICENSES/).
