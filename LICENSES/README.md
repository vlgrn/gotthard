# Third-party licenses

| Component | License | Notes |
|---|---|---|
| opencode (engine, `opencode-ai` 1.19.4) | MIT | [opencode-MIT.txt](opencode-MIT.txt). Bundled as an unmodified binary. |
| OpenWork (planned desktop shell) | MIT (core) | to be added with the desktop fork; check `ee/` licensing before reusing anything outside the MIT core |
| Python: mcp, openpyxl, python-docx, pypdf, pdfplumber, reportlab, numpy | MIT / BSD / Apache-2.0 | pinned in `packages/gotthard-mcp/uv.lock` |
| Node: @clack/prompts, @napi-rs/keyring | MIT | pinned in `package-lock.json` |

A full third-party license list and SBOM will be generated at build time for the desktop installers (spec P6, S8).
