import { existsSync } from "node:fs"
import { homedir, platform } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
export const PKG = join(REPO, "packages")
export const SKILLS_DIR = join(PKG, "gotthard-skills")
export const TEMPLATES_DIR = join(SKILLS_DIR, "templates")
export const PROMPTS_DIR = join(PKG, "gotthard-preset", "prompts")
export const PLUGIN_FILE = join(PKG, "gotthard-plugin", "gotthard.js")
export const MCP_DIR = join(PKG, "gotthard-mcp")

export function appHome() {
  if (process.env.GOTTHARD_HOME) return resolve(process.env.GOTTHARD_HOME)
  const home = homedir()
  if (platform() === "darwin") return join(home, "Library", "Application Support", "Gotthard")
  if (platform() === "win32") return join(process.env.APPDATA || join(home, "AppData", "Roaming"), "Gotthard")
  return join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "gotthard")
}

export function engineHome() {
  return join(appHome(), "engine")
}

export function defaultWorkspace() {
  return join(homedir(), "Documents", "Gotthard")
}

export function opencodeBin() {
  const bin = join(REPO, "node_modules", ".bin", platform() === "win32" ? "opencode.cmd" : "opencode")
  if (!existsSync(bin)) throw new Error("opencode engine not installed – run `npm install` in " + REPO)
  return bin
}

export function mcpCommand(name) {
  const bin = platform() === "win32" ? join(MCP_DIR, ".venv", "Scripts", `${name}.exe`) : join(MCP_DIR, ".venv", "bin", name)
  return bin
}
