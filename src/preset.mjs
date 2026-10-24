import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PLUGIN_FILE, PROMPTS_DIR, SKILLS_DIR, engineHome, mcpCommand } from "./paths.mjs"
import { engineProvider } from "./providers.mjs"

export const AGENT_NAMES = {
  de: { main: "assistent", readonly: "nur-lesen" },
  fr: { main: "assistant", readonly: "lecture-seule" },
  it: { main: "assistente", readonly: "sola-lettura" },
  en: { main: "assistant", readonly: "read-only" },
}

const PROMPT_LANG = { de: "de", fr: "fr", it: "en", en: "en" }
const SKILL_LANG = { de: "de", fr: "fr", it: "fr", en: "de" }

export function skillLang(lang) {
  return SKILL_LANG[lang] || "de"
}

export function listSkills(lang) {
  const dir = join(SKILLS_DIR, skillLang(lang))
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

export function userSkillsDir() {
  return join(engineHome(), "user-skills")
}

function basePermission(trusted) {
  const engine = engineHome()
  return {
    read: { "*": "allow", "*.env": "deny", "*.env.*": "deny", "*/.gotthard/index.db*": "deny" },
    edit: { "*": "allow", "*/.gotthard/*": "deny", ".gotthard/*": "deny", "*/.git/*": "deny", ".git/*": "deny" },
    glob: "allow",
    grep: "allow",
    list: "allow",
    todowrite: "allow",
    skill: { "*": "allow", "customize-opencode": "deny" },
    task: "allow",
    question: "allow",
    lsp: "deny",
    bash: trusted ? "allow" : "ask",
    webfetch: "ask",
    websearch: "deny",
    external_directory: {
      "*": "deny",
      [join(engine, "config", "opencode", "skills", "*")]: "allow",
      [join(engine, "data", "opencode", "tool-output", "*")]: "allow",
      [join(tmpdir(), "opencode", "*")]: "allow",
    },
    doom_loop: "ask",
    "gotthard-memory_remember": "ask",
  }
}

const READONLY_DENY = {
  edit: "deny",
  bash: "deny",
  task: "deny",
  webfetch: "deny",
  "gotthard-office_create_xlsx": "deny",
  "gotthard-office_create_docx": "deny",
  "gotthard-office_create_pdf": "deny",
  "gotthard-office_convert_to_pdf": "deny",
  "gotthard-office_move_file": "deny",
  "gotthard-memory_remember": "deny",
}

export function buildConfig(settings, { key, embed }) {
  const lang = settings.lang
  const names = AGENT_NAMES[lang] || AGENT_NAMES.en
  const pLang = PROMPT_LANG[lang] || "en"
  const ws = settings.workspace
  const trusted = !!settings.trusted[ws]
  const prov = engineProvider(settings.provider, key, settings.prices)

  const mcpEnv = {
    GOTTHARD_WORKSPACE: ws,
    GOTTHARD_LANG: lang,
    GOTTHARD_TEMPLATES: join(SKILLS_DIR, "templates"),
  }
  const memoryEnv = { ...mcpEnv }
  if (embed) {
    memoryEnv.GOTTHARD_EMBED_BASE_URL = embed.baseURL
    memoryEnv.GOTTHARD_EMBED_MODEL = embed.model
    if (embed.key) memoryEnv.GOTTHARD_EMBED_API_KEY = "{env:GOTTHARD_ENGINE_KEY}"
  }

  const base = basePermission(trusted)
  const config = {
    $schema: "https://opencode.ai/config.json",
    model: prov.model,
    small_model: prov.smallModel,
    enabled_providers: [prov.id],
    provider: prov.config,
    default_agent: names.main,
    share: "disabled",
    autoupdate: false,
    snapshot: false,
    formatter: false,
    lsp: false,
    instructions: [join(ws, ".gotthard", "memory.md")],
    plugin: [`file://${PLUGIN_FILE}`],
    permission: base,
    mcp: {
      "gotthard-office": { type: "local", command: [mcpCommand("gotthard-office")], environment: mcpEnv, enabled: true, timeout: 120000 },
      "gotthard-memory": { type: "local", command: [mcpCommand("gotthard-memory")], environment: memoryEnv, enabled: true, timeout: 120000 },
    },
    agent: {
      build: { disable: true },
      plan: { disable: true },
      [names.main]: {
        mode: "primary",
        description: { de: "Erledigt Büroarbeit im Arbeitsordner", fr: "Effectue le travail de bureau dans le dossier de travail" }[lang] || "Does office work in the workspace",
        prompt: `{file:${join(PROMPTS_DIR, pLang, "assistent.md")}}`,
        permission: base,
      },
      [names.readonly]: {
        mode: "primary",
        description: { de: "Nur lesen: beantwortet Fragen, ändert nichts", fr: "Lecture seule : répond aux questions, ne modifie rien" }[lang] || "Read-only: answers questions, changes nothing",
        prompt: `{file:${join(PROMPTS_DIR, pLang, "nur-lesen.md")}}`,
        permission: { ...base, ...READONLY_DENY },
      },
    },
  }
  return config
}

export function materialize(settings, ctx) {
  const cfgDir = join(engineHome(), "config", "opencode")
  mkdirSync(cfgDir, { recursive: true })
  const config = buildConfig(settings, ctx)
  writeFileSync(join(cfgDir, "opencode.json"), JSON.stringify(config, null, 2))

  const skillsOut = join(cfgDir, "skills")
  rmSync(skillsOut, { recursive: true, force: true })
  mkdirSync(skillsOut, { recursive: true })
  const sources = [join(SKILLS_DIR, skillLang(settings.lang)), userSkillsDir()]
  for (const src of sources) {
    if (!existsSync(src)) continue
    for (const d of readdirSync(src, { withFileTypes: true })) {
      if (!d.isDirectory() || settings.disabledSkills.includes(d.name)) continue
      cpSync(join(src, d.name), join(skillsOut, d.name), { recursive: true })
    }
  }
  return { cfgDir, config }
}
