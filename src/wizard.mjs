// First-run onboarding (F1.1–F1.7). Terminal version of the desktop wizard; same steps and settings.
import * as p from "@clack/prompts"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { osLanguage, t } from "./i18n.mjs"
import { ensureMemory } from "./memory.mjs"
import { MCP_DIR, REPO, defaultWorkspace } from "./paths.mjs"
import { PROVIDERS, listModels, ollamaRunning } from "./providers.mjs"
import { getSecret, setSecret } from "./secrets.mjs"
import { DEFAULTS, loadSettings, saveSettings, setWorkspace } from "./settings.mjs"

function bail(v, s) {
  if (p.isCancel(v)) {
    p.cancel(s.cancelled)
    process.exit(1)
  }
  return v
}

function pickDefault(models, preferred) {
  const ids = models.map((m) => m.id)
  return preferred.find((id) => ids.includes(id)) || ids[0]
}

export async function wizard() {
  const prev = loadSettings() || structuredClone(DEFAULTS)
  const settings = structuredClone(prev)

  // F1.1 language
  const lang = bail(
    await p.select({
      message: "Sprache / Langue / Lingua / Language",
      initialValue: prev.lang || osLanguage(),
      options: [
        { value: "de", label: "Deutsch" },
        { value: "fr", label: "Français" },
        { value: "it", label: "Italiano (UI in English for now)" },
        { value: "en", label: "English" },
      ],
    }),
    t("en"),
  )
  settings.lang = lang
  const s = t(lang)
  p.intro(s.welcome)

  // F1.2 provider
  const kind = bail(
    await p.select({
      message: s.provider,
      initialValue: prev.provider.kind || "zen",
      options: Object.entries(PROVIDERS).map(([value, v]) => ({ value, label: v.label, hint: v.note })),
    }),
    s,
  )
  const prov = { ...DEFAULTS.provider, ...(prev.provider.kind === kind ? prev.provider : {}), kind }

  // F1.3 credentials + live test connection
  let key = getSecret(kind)
  let models = []
  for (;;) {
    if (kind === "zen") {
      key = bail(await p.password({ message: s.zenKey, mask: "•" }), s) || key || ""
    } else if (kind === "infomaniak") {
      p.note(s.infHelp)
      key = bail(await p.password({ message: s.infToken, mask: "•", validate: (v) => (!v && !key ? "required" : undefined) }), s) || key
      prov.productId = bail(await p.text({ message: s.infProduct, initialValue: prov.productId, validate: (v) => (/^\d+$/.test(v) ? undefined : "123456") }), s)
    } else if (kind === "custom") {
      prov.baseURL = bail(await p.text({ message: s.customUrl, initialValue: prov.baseURL, validate: (v) => (/^https?:\/\//.test(v) ? undefined : "https://…") }), s)
      key = bail(await p.password({ message: s.customKey, mask: "•" }), s) || ""
    } else if (kind === "ollama" && !(await ollamaRunning())) {
      p.note(s.ollamaMissing)
    }
    const spin = p.spinner()
    spin.start(s.testing)
    try {
      models = await listModels(prov, key)
      if (!models.length) throw new Error("0 models")
      spin.stop(s.testOk(models.length))
      break
    } catch (e) {
      spin.stop(`${s.testFail}: ${e.message}`)
      if (!bail(await p.confirm({ message: s.retry }), s)) process.exit(1)
    }
  }
  setSecret(kind, key)

  // M2/M3/M4 model choice
  const def = PROVIDERS[kind]
  const options = models.map((m) => ({ value: m.id, label: m.id, hint: m.note || (def.recommended.includes(m.id) ? "empfohlen / recommandé" : undefined) }))
  prov.model = bail(await p.select({ message: s.model, initialValue: pickDefault(models, [prov.model, ...def.recommended].filter(Boolean)), options, maxItems: 12 }), s)
  prov.smallModel = bail(
    await p.select({ message: s.smallModel, initialValue: pickDefault(models, [prov.smallModel, ...def.recommendedSmall, prov.model].filter(Boolean)), options, maxItems: 12 }),
    s,
  )
  prov.models = models.map((m) => m.id).slice(0, 50)
  settings.provider = prov

  // F1.4 workspace
  const ws = resolve(
    bail(await p.text({ message: s.workspace, initialValue: prev.workspace || defaultWorkspace() }), s).replace(/^~(?=$|\/)/, process.env.HOME),
  )
  mkdirSync(ws, { recursive: true })
  setWorkspace(settings, ws)
  const empty = readdirSync(ws).filter((f) => !f.startsWith(".")).length === 0
  if (empty && bail(await p.confirm({ message: s.demo, initialValue: true }), s)) createDemo(ws)

  // F1.5 company profile (optional)
  let profile
  if (bail(await p.confirm({ message: s.profile, initialValue: false }), s)) {
    profile = {}
    for (const k of ["name", "address", "languages", "clients", "signature"]) {
      const label = { name: s.firm, address: s.address, languages: s.languages, clients: s.clients, signature: s.signature }[k]
      profile[k] = bail(await p.text({ message: label, defaultValue: "" }), s)
    }
  }

  // F1.6 privacy summary
  p.note(s.privacy(def.label, def.swiss), s.privacyTitle)
  bail(await p.confirm({ message: s.accept, active: "OK", inactive: "✗", initialValue: true }), s) || process.exit(1)

  saveSettings(settings)
  ensureMemory(settings, profile)
  p.outro(`${s.done}\n${s.next}`)
  return settings
}

export function createDemo(target) {
  const r = spawnSync(join(MCP_DIR, ".venv", "bin", "python"), [join(REPO, "scripts", "build_assets.py"), "demo", target], { stdio: "inherit" })
  if (r.status !== 0) throw new Error("Could not create demo files")
}

export function pythonReady() {
  return existsSync(join(MCP_DIR, ".venv"))
}
