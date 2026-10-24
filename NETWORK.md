# Network destinations (spec S1)

Gotthard has no backend and no telemetry. At runtime, the app and its engine contact only these destinations:

| Destination | When | What is sent |
|---|---|---|
| **Configured model endpoint**: `api.infomaniak.com` (Infomaniak, Geneva), `127.0.0.1:11434` (Ollama), a custom URL, or `opencode.ai/zen` (OpenCode Zen, test phase only) | every request to the assistant; document indexing (embeddings, Infomaniak/Ollama only) | the conversation, the system prompt including the company memory, and the file excerpts the assistant reads; for embeddings, text passages of workspace documents |
| `opencode.ai/zen/v1/models` | only in `setup` / `doctor` when Zen is the provider | nothing (public model list) |
| Web pages the user approves | only when the assistant calls `webfetch` and the user clicks Allow | an HTTP GET to that URL |
| LibreOffice (local process) | `convert_to_pdf`, if installed | nothing leaves the machine |

How the engine is locked down (see `src/engine.mjs`, `src/preset.mjs`):

- `enabled_providers` contains only the configured provider; all other built-in providers are off.
- `share: disabled`, `autoupdate: false`, `OPENCODE_DISABLE_AUTOUPDATE`, `OPENCODE_DISABLE_MODELS_FETCH` (no models.dev catalog download), `OPENCODE_DISABLE_LSP_DOWNLOAD`, `OPENCODE_DISABLE_DEFAULT_PLUGINS`, `lsp: false`, `formatter: false`.
- The Gotthard plugin is a local file with no npm dependencies, so the engine never runs `npm install`.
- `websearch` is denied; `webfetch` and `bash` require approval each time unless trusted mode is enabled.
- The engine server listens on `127.0.0.1` only, on a random port, protected by a random per-launch password.

Install time (not runtime): `npm install` downloads the pinned engine and libraries from the npm registry, and `uv sync` downloads the pinned Python packages (and, if missing, a Python build). The desktop installers will bundle all of these.

Planned (desktop milestone): update check against a Swiss-hosted, signed update manifest, only when the user clicks "Check for updates".
