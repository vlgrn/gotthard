import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { appHome } from "./paths.mjs"

const FILE = () => join(appHome(), "settings.json")

export const DEFAULTS = {
  version: 1,
  lang: "de",
  provider: {
    kind: "zen", // zen | infomaniak | ollama | custom
    baseURL: "",
    productId: "",
    model: "",
    smallModel: "",
    embedModel: "",
    models: [], // models offered by the provider (M4)
  },
  workspace: "",
  recentWorkspaces: [],
  trusted: {}, // workspace path -> true (F4.3: bash allowed without asking)
  disabledSkills: [],
  // M6: CHF per 1M tokens, used for the usage estimate. Adjust to the current Infomaniak price list.
  prices: {},
}

export function loadSettings() {
  const f = FILE()
  if (!existsSync(f)) return null
  const raw = JSON.parse(readFileSync(f, "utf8"))
  return { ...DEFAULTS, ...raw, provider: { ...DEFAULTS.provider, ...raw.provider } }
}

export function saveSettings(s) {
  mkdirSync(appHome(), { recursive: true })
  writeFileSync(FILE(), JSON.stringify(s, null, 2))
}

export function requireSettings() {
  const s = loadSettings()
  if (!s || !s.workspace) {
    console.error("Gotthard is not set up yet. Run: gotthard setup")
    process.exit(1)
  }
  return s
}

export function setWorkspace(s, path) {
  const ws = resolve(path)
  s.workspace = ws
  s.recentWorkspaces = [ws, ...s.recentWorkspaces.filter((p) => p !== ws)].slice(0, 8)
  return s
}
