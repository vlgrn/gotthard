# Swiss Agentic Desktop — MVP Spec

**Codename:** Gotthard (working name, final brand TBD)
**Version:** 0.1 draft · 24 October 2026
**Basis:** fork of OpenWork (MIT) + bundled OpenCode engine (MIT), Swiss-sovereign models via Infomaniak

---

## 1. Overview

### Problem
Swiss SMEs in regulated or confidentiality-bound professions (fiduciaries, law firms, medical practices, small public bodies) want AI that actually *does work*: reads their files, builds spreadsheets, drafts documents. The available Swiss options (Infomaniak Euria, AlpineAI, Swisscom myAI) are chat and document Q&A products. US agentic tools (Claude Cowork, Codex) send data abroad, which many of these firms can't or won't accept.

### Product
A downloadable desktop app (.dmg / .exe) that gives a small business an AI agent working directly on a local folder. It runs on Swiss-hosted open models (Infomaniak by default) or a fully local model. Files and memory stay on the machine; only model prompts leave it, and only to a Swiss provider.

### MVP goal
Prove that a non-technical Swiss office worker can install the app in under 10 minutes and reliably complete 3 real weekly tasks with it, using Infomaniak-hosted models.

### Principles
1. **Local first.** User data and memory live on the user's machine. No vendor backend in the MVP.
2. **Sovereign by default.** The default model endpoint is Swiss. No US routing anywhere unless the user explicitly configures it.
3. **Open and auditable.** Fully open source (MIT); every network destination documented.
4. **Safe by default.** The agent is confined to one workspace folder and asks before executing or deleting anything.
5. **Thin fork.** Swiss value lives in add-on modules; the upstream core stays mergeable.

---

## 2. Target users and use cases

### Primary persona (MVP vertical: fiduciaries / Treuhand)
- 2–20 person Treuhand office, German-speaking first (FR/IT later in MVP).
- Users: accountants and assistants, comfortable with Excel and Outlook, not with terminals.
- Buyer: owner/partner, often advised by a local IT service provider.

### MVP use cases (to be confirmed in customer interviews, see §10)
| # | Use case | Example prompt | Output |
|---|---|---|---|
| U1 | Bank statement / receipt processing | "Categorise all transactions in these 3 PDFs and build an Excel summary by account." | .xlsx |
| U2 | Client letter drafting | "Draft a letter to client Müller explaining the missing VAT documents, using our template." | .docx |
| U3 | Folder triage | "Sort the scans in /Eingang into client folders and rename them by date and type." | moved/renamed files + log |
| U4 | Document Q&A | "What did we agree with client Keller about the 2025 closing fees?" | answer with file references |
| U5 | Recurring checklist | "Run the year-end closing checklist for client X and list what's missing." | .md / .xlsx report |

### Secondary personas (post-MVP)
Law firms, medical practices, municipal administrations, Swiss IT service providers reselling the app.

---

## 3. Scope

### In scope (MVP)
- Rebranded desktop app for macOS (Apple Silicon + Intel) and Windows 10/11.
- Bundled OpenCode engine (no separate install).
- First-run wizard: language, Infomaniak credentials, workspace folder.
- Agent chat with streaming, visible plan/todo timeline, tool-call display.
- Approval flow for risky actions.
- File outputs: .xlsx, .docx, .pdf, .md, .csv.
- Local memory (company profile, notes, document index).
- 5 Swiss skills (matching U1–U5).
- German UI and skills; French UI.
- Local-only mode via Ollama (advanced setting).
- Signed, notarized installers; manual update check.

### Out of scope (MVP)
- Hosted/SaaS version, accounts, billing.
- Team features: shared memory, central admin, SSO, audit server.
- Messaging connectors (kChat, WhatsApp, Slack).
- Bexio / Abacus connectors (design the slot, ship later).
- Linux builds (community-supported only).
- Mobile apps.
- Image generation, voice.

---

## 4. Architecture

```
┌──────────────────────────── User's machine ────────────────────────────┐
│                                                                        │
│  Gotthard desktop app (Tauri, fork of OpenWork)                        │
│  ├─ UI (OpenWork app, rebranded, localized)                            │
│  ├─ Onboarding wizard                         [new]                    │
│  ├─ Memory manager UI                         [new]                    │
│  └─ Approval dialogs                          [extended]               │
│        │  HTTP + SSE (@opencode-ai/sdk), 127.0.0.1 only                │
│        ▼                                                               │
│  Bundled opencode serve (sidecar binary, random free port, password)   │
│  ├─ Agent loop, sessions, todo/plan                                    │
│  ├─ Built-in tools: read, write, edit, glob, grep, list, bash, webfetch│
│  ├─ Swiss skills pack (.opencode/skills)      [new]                    │
│  ├─ Gotthard agents (.opencode/agents)        [new]                    │
│  └─ Local MCP servers:                                                 │
│       • memory-server (SQLite + vectors)      [new]                    │
│       • office-tools (docx/xlsx/pdf)          [new]                    │
│        │                                                               │
│  Sandboxed workspace folder (user-chosen)                              │
│  ├─ client files                                                       │
│  └─ .gotthard/ (memory.md, index.db, logs, config)                     │
│                                                                        │
│  Bundled Python runtime (for office-tools, document parsing)  [new]    │
└────────────────────────────────────────────────────────────────────────┘
          │ HTTPS, OpenAI-compatible API (prompts + context only)
          ▼
   Infomaniak AI Services (Geneva, CH)       — or —     Ollama (localhost)
```

### Components
| Component | Source | Work |
|---|---|---|
| Desktop shell + UI | OpenWork (MIT) | Rebrand, localize, simplify, add wizard and memory UI |
| Agent engine | OpenCode (MIT), pinned version | Bundle as sidecar; ship preset config |
| office-tools MCP | New | Create/read xlsx, docx, pdf via bundled Python (openpyxl, python-docx, pypdf, pdfplumber) |
| memory-server MCP | New | Memory notes, document index, retrieval |
| Swiss skills pack | New | Markdown skills + templates for U1–U5 |
| Config preset | New | Provider, permissions, agents, disabled services |

### Fork strategy
- Keep a `upstream/` tracking branch; merge OpenWork releases every 2–4 weeks.
- All Swiss changes in separate packages/folders where possible (`packages/gotthard-*`), minimal patches to upstream files.
- Pin the OpenCode version per release; upgrade only after the regression suite passes (§10).

---

## 5. Functional requirements

### 5.1 Onboarding (first run)
- F1.1 Choose language (DE / FR / IT / EN), defaulting to OS language.
- F1.2 Choose model provider: **Infomaniak (recommended)**, Ollama (local, advanced), or custom OpenAI-compatible endpoint.
- F1.3 For Infomaniak: field for API token and product ID, with a "How to get these" link and a live **Test connection** button that lists available models.
- F1.4 Choose workspace folder (default `~/Documents/Gotthard`).
- F1.5 Optional company profile: firm name, languages, typical clients, signature block. Stored in memory.
- F1.6 Show a one-screen privacy summary: what stays local, what goes to the provider.
- F1.7 Total time from first launch to first answer: under 3 minutes.

### 5.2 Workspace
- F2.1 One active workspace at a time; switchable; recent list.
- F2.2 File panel: browse workspace, open files in default OS app, drag-and-drop files in.
- F2.3 Agent tools restricted to the workspace path (see §7).

### 5.3 Agent chat
- F3.1 Sessions list with rename, delete, search.
- F3.2 Streaming responses; reasoning hidden by default (toggle to show).
- F3.3 Plan timeline rendered from OpenCode todos.
- F3.4 Tool calls shown as readable steps ("Read 3 PDFs", "Created Zusammenfassung.xlsx"), raw details on expand.
- F3.5 Created/modified files listed at the end of each run with Open / Show in folder.
- F3.6 Stop button that cancels the current run immediately.
- F3.7 Agent picker: *Assistent* (default, general work), *Nur lesen* (read-only Q&A).

### 5.4 Approvals
- F4.1 Default permissions: read/glob/grep/list = allow; write/edit inside workspace = allow; delete, move outside workspace, bash, webfetch = **ask**.
- F4.2 Approval dialog shows plain-language summary and exact command/path; options: Allow once / Allow for this session / Deny.
- F4.3 "Trusted mode" per workspace (allow bash for this workspace) behind a warning.
- F4.4 All approvals logged to `.gotthard/logs/`.

### 5.5 Skills
- F5.1 Ship 5 skills matching U1–U5, in DE and FR.
- F5.2 Skills tab: list, enable/disable, import a skill folder (upstream feature, localized).
- F5.3 Skills may include templates (docx letterhead, xlsx layouts) the user can replace with their own.

### 5.6 Memory
- F6.1 **Company memory**: `.gotthard/memory.md`, human-readable, editable in-app; injected into every session.
- F6.2 **Session notes**: after each session the agent proposes short memory notes ("Client Keller: fixed fee CHF 2'400 for 2025 closing"); user accepts/edits/rejects. No silent writes.
- F6.3 **Document index**: background indexing of workspace text (PDF, docx, xlsx, txt, md) into local SQLite with vector embeddings; exposed to the agent as a `search_documents` MCP tool returning passages with file paths.
- F6.4 Embeddings via Infomaniak embedding model by default (e.g. BGE multilingual), local embedding model in Ollama mode. Index rebuild button.
- F6.5 Memory screen: view, edit, delete everything; "Forget this client" bulk delete.

### 5.7 File outputs
- F7.1 Create .xlsx with formatting, formulas and multiple sheets.
- F7.2 Create .docx from templates (letterhead, styles) and from scratch.
- F7.3 Create .pdf (from docx or directly).
- F7.4 Read PDF (text + scanned via OCR, OCR optional in MVP), docx, xlsx, csv, images.
- F7.5 Never overwrite an existing file without approval; default to versioned names (`_v2`).

---

## 6. Model and provider configuration

- M1 Default provider: Infomaniak AI Services via its OpenAI-compatible endpoint (verify current base URL and auth format in their docs before build).
- M2 Recommended default model chosen by the evaluation in §10 (candidates: Kimi K2.6, Qwen3.5-397B-A17B, Qwen3.5-122B-A10B, Mistral Small 4). Requirement: reliable tool calling, ≥128K context, good German and French.
- M3 Separate "fast" model setting for cheap sub-tasks (titles, memory-note proposals, summaries).
- M4 Model picker in settings showing models returned by the provider.
- M5 Ollama mode: detects local Ollama, lists installed models, warns about quality on small models.
- M6 Usage display: tokens per session and rough CHF cost estimate (Infomaniak price table, configurable).
- M7 OpenCode Zen, remote sharing and any non-configured providers disabled in the shipped config.

---

## 7. Security, privacy and sovereignty

- S1 **Network allowlist**: the app and engine contact only (a) the configured model endpoint, (b) the update server, (c) URLs the user approves via webfetch. Documented in `NETWORK.md`.
- S2 **No telemetry** in the MVP. Crash reports only if the user opts in, stored locally for manual sending.
- S3 **Engine binding**: opencode serve listens on 127.0.0.1 only, random port, random per-launch password.
- S4 **Filesystem confinement**: agent file tools restricted to the workspace path; bash runs with workspace as working directory and requires approval. Post-MVP: run bash inside a container or OS sandbox (macOS sandbox-exec / App Sandbox, Windows AppContainer or WSL).
- S5 **Secrets**: API token stored in the OS keychain (macOS Keychain, Windows Credential Manager), never in plain config files. `.env` and keychain paths denied to read tools.
- S6 **Data at rest**: memory and index stored in the workspace; optional encryption of `.gotthard/` (post-MVP).
- S7 **Privacy doc**: plain-language description for nDSG purposes of what is processed where; template text a firm can use toward its clients.
- S8 **Supply chain**: pinned dependency versions, lockfiles, SBOM published with each release.

---

## 8. Packaging, distribution and updates

- P1 Tauri builds: `.dmg` (universal or separate arm64/x64) and `.msi`/`.exe` (Windows x64).
- P2 Bundle: opencode binary, Python runtime with office libraries, MCP servers, skills, config preset. No prerequisites for the user.
- P3 Code signing: Apple Developer ID + notarization; Windows code-signing certificate (EV preferred to avoid SmartScreen warnings).
- P4 Updates: Tauri updater with signed update manifests hosted on a Swiss server; manual "Check for updates" in MVP.
- P5 Distribution: GitHub Releases (source + binaries) and a simple Swiss-hosted download page.
- P6 License compliance: MIT notices for OpenWork and OpenCode in `LICENSES/` and an About screen; third-party license list generated at build; no use of the OpenWork or OpenCode names or logos in branding.
- P7 Installer size target: under 400 MB.

---

## 9. Localization and Swiss content

- L1 UI: German (Swiss conventions: "ss" instead of "ß", CHF formatting `1'234.50`, dates `24.10.2026`) and French at MVP; Italian post-MVP.
- L2 Skills and system prompts written natively in DE and FR, not machine-translated.
- L3 Swiss domain content in skills: MWST rates and terminology, Swiss chart of accounts (KMU-Kontenrahmen) for categorisation, Swiss letter conventions, QR-bill awareness.
- L4 The agent replies in the user's language by default and keeps client documents in their original language.

---

## 10. Validation plan and success metrics

### Before building (weeks 0–2)
- V1 Interview 10–15 fiduciary offices; confirm or replace U1–U5; collect 20 anonymized sample tasks with real-style files.
- V2 **Model feasibility test**: run the 20 tasks through plain OpenCode + Infomaniak with 3 candidate models. Go/no-go: ≥70% of tasks completed acceptably by the best model.

### Regression suite
- V3 The 20 tasks become an automated eval set (expected outputs + rubric), run on every OpenCode/model upgrade.

### MVP success metrics (pilot with 5–10 offices, 4 weeks)
| Metric | Target |
|---|---|
| Install to first useful result | < 10 min, without help |
| Task success on real tasks (user-rated) | ≥ 70% |
| Weekly active pilot offices at week 4 | ≥ 60% |
| Tasks per active user per week | ≥ 5 |
| Unwanted file changes / data incidents | 0 |
| "Would pay" signal (stated price ≥ CHF 30/user/month) | ≥ 3 offices |

---

## 11. Milestones

| Week | Milestone |
|---|---|
| 0–2 | Interviews, model feasibility test, go/no-go |
| 2–4 | Fork set up, rebrand, bundled engine, Infomaniak preset, onboarding wizard |
| 4–6 | office-tools MCP (xlsx/docx/pdf), approval flow, workspace confinement |
| 6–8 | Memory (memory.md, session notes, document index), 5 skills in DE |
| 8–9 | FR localization, signing/notarization, installers, update channel |
| 9–10 | Internal eval pass, security review, privacy docs |
| 10–14 | Pilot with 5–10 offices, weekly releases |
| 14 | Decision: public open-source launch + business model |

Team assumption: 1–2 developers full-time, plus part-time help for skills content and pilot support.

---

## 12. Risks and open questions

### Risks
| Risk | Mitigation |
|---|---|
| Open models unreliable on multi-step tasks | Feasibility gate (V2); narrow skills with explicit steps; verification steps inside skills |
| Upstream OpenWork/OpenCode churn breaks the fork | Thin fork, pinned versions, regression suite, regular merges |
| Infomaniak ships agents in Euria | Move fast on the vertical; stay provider-agnostic; consider partnership instead of competition |
| Bash on user machines causes damage | Ask-by-default, workspace confinement, sandboxing post-MVP |
| SmartScreen/Gatekeeper warnings hurt adoption | Proper signing and notarization from the first pilot build |
| No revenue model | Decide by week 14 (support plans, enterprise edition, IT partner channel, Infomaniak referral) |

### Open questions
1. Final brand name and trademark check in CH/EU.
2. Exact Infomaniak API details: current base URL, tool-calling support per model, rate limits, pricing for agentic token volumes.
3. Does OpenWork's current runtime (orchestrator vs direct `opencode serve`) suit bundling, or do we use direct mode only?
4. OCR for scanned receipts: local (Tesseract) in MVP, or later?
5. Legal entity and liability model for an open-source tool used with client data.
6. Partnership approach with Infomaniak (and/or AlpineAI API as a second Swiss provider).
