import { execFileSync, spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { createServer } from "node:net"
import { join } from "node:path"
import { ensureMemory } from "./memory.mjs"
import { engineHome, mcpCommand, opencodeBin } from "./paths.mjs"
import { materialize } from "./preset.mjs"
import { embedConfig } from "./providers.mjs"
import { getSecret } from "./secrets.mjs"

export function engineEnv(settings, extra = {}) {
  const home = engineHome()
  const dirs = { XDG_CONFIG_HOME: "config", XDG_DATA_HOME: "data", XDG_STATE_HOME: "state", XDG_CACHE_HOME: "cache" }
  const env = { ...process.env }
  for (const [k, sub] of Object.entries(dirs)) {
    env[k] = join(home, sub)
    mkdirSync(env[k], { recursive: true })
  }
  const key = getSecret(settings.provider.kind)
  Object.assign(env, {
    GOTTHARD_WORKSPACE: settings.workspace,
    GOTTHARD_LANG: settings.lang,
    OPENCODE_DISABLE_PROJECT_CONFIG: "1",
    OPENCODE_DISABLE_MODELS_FETCH: "1",
    OPENCODE_DISABLE_AUTOUPDATE: "1",
    OPENCODE_DISABLE_LSP_DOWNLOAD: "1",
    OPENCODE_DISABLE_CLAUDE_CODE: "1",
    OPENCODE_DISABLE_EXTERNAL_SKILLS: "1",
    OPENCODE_DISABLE_DEFAULT_PLUGINS: "1",
    ...extra,
  })
  delete env.OPENCODE_CONFIG
  delete env.OPENCODE_CONFIG_DIR
  delete env.OPENCODE_CONFIG_CONTENT
  if (key) env.GOTTHARD_ENGINE_KEY = key
  return { env, key }
}

export function ensureProject(ws) {
  if (existsSync(join(ws, ".git"))) return
  const git = (...args) => execFileSync("git", args, { cwd: ws, stdio: "pipe" })
  try {
    git("init", "-q")
    appendFileSync(join(ws, ".git", "info", "exclude"), "\n# Gotthard: the workspace is a project marker only, no file is tracked\n*\n")
    git("-c", "user.name=Gotthard", "-c", "user.email=gotthard@localhost", "commit", "-q", "--allow-empty", "-m", "Gotthard workspace")
  } catch (e) {
    throw new Error(`Could not prepare the workspace (git is required): ${e.message}`)
  }
}

export function prepare(settings) {
  if (!existsSync(settings.workspace)) mkdirSync(settings.workspace, { recursive: true })
  ensureProject(settings.workspace)
  if (!existsSync(mcpCommand("gotthard-office"))) {
    throw new Error("Python tools are not installed. Run: npm run setup:python")
  }
  ensureMemory(settings)
  const { env, key } = engineEnv(settings)
  const embed = embedConfig(settings.provider, key)
  const { cfgDir, config } = materialize(settings, { key, embed })
  return { env, cfgDir, config }
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on("error", reject)
  })
}

export function randomPassword() {
  return randomBytes(18).toString("base64url")
}

export function runEngine(args, { env, cwd, stdio = "inherit" }) {
  return new Promise((resolve) => {
    const child = spawn(opencodeBin(), args, { env, cwd, stdio })
    const stop = () => child.kill("SIGINT")
    process.on("SIGINT", stop)
    child.on("exit", (code) => {
      process.off("SIGINT", stop)
      resolve(code ?? 0)
    })
  })
}

export function spawnEngine(args, { env, cwd }) {
  return spawn(opencodeBin(), args, { env, cwd, stdio: ["ignore", "pipe", "pipe"] })
}
