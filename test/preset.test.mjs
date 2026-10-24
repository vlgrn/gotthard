import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

process.env.GOTTHARD_HOME = mkdtempSync(join(tmpdir(), "gotthard-test-home-"))
const { buildConfig, materialize } = await import("../src/preset.mjs")
const { engineProvider } = await import("../src/providers.mjs")
const { DEFAULTS } = await import("../src/settings.mjs")
const { GotthardPlugin } = await import("../packages/gotthard-plugin/gotthard.js")

function settings(over = {}) {
  const s = structuredClone(DEFAULTS)
  s.workspace = mkdtempSync(join(tmpdir(), "gotthard-test-ws-"))
  s.provider = { ...s.provider, kind: "zen", model: "glm-5.3-flash-free", smallModel: "glm-5.3-flash-free" }
  return Object.assign(s, over)
}

test("default permissions follow F4.1 / S4", () => {
  const c = buildConfig(settings(), { key: "", embed: null })
  assert.equal(c.permission.bash, "ask")
  assert.equal(c.permission.webfetch, "ask")
  assert.equal(c.permission.external_directory["*"], "deny")
  assert.equal(c.permission["gotthard-memory_remember"], "ask")
  assert.equal(c.permission.read["*.env"], "deny")
  assert.equal(c.permission.skill["customize-opencode"], "deny")
  assert.equal(c.share, "disabled")
  assert.equal(c.autoupdate, false)
  assert.deepEqual(c.enabled_providers, ["opencode"])
  assert.equal(c.agent.build.disable, true)
  assert.equal(c.default_agent, "assistent")
})

test("trusted mode only relaxes bash for that workspace", () => {
  const s = settings()
  s.trusted[s.workspace] = true
  assert.equal(buildConfig(s, { key: "", embed: null }).permission.bash, "allow")
  const other = settings({ trusted: { "/somewhere/else": true } })
  assert.equal(buildConfig(other, { key: "", embed: null }).permission.bash, "ask")
})

test("read-only agent cannot write, move, remember or delegate", () => {
  const c = buildConfig(settings({ lang: "fr" }), { key: "", embed: null })
  const ro = c.agent["lecture-seule"].permission
  for (const k of ["edit", "bash", "task", "gotthard-office_create_xlsx", "gotthard-office_move_file", "gotthard-memory_remember"]) assert.equal(ro[k], "deny", k)
  assert.equal(c.default_agent, "assistant")
})

test("secrets never land in the config file", () => {
  const s = settings({ provider: { ...DEFAULTS.provider, kind: "infomaniak", productId: "1234", model: "moonshotai/Kimi-K2.6", smallModel: "", models: [] } })
  const { cfgDir } = materialize(s, { key: "SECRET-TOKEN-123", embed: { baseURL: "https://x", model: "bge", key: "SECRET-TOKEN-123" } })
  const raw = readFileSync(join(cfgDir, "opencode.json"), "utf8")
  assert.ok(!raw.includes("SECRET-TOKEN-123"))
  assert.ok(raw.includes("{env:GOTTHARD_ENGINE_KEY}"))
  assert.ok(raw.includes("https://api.infomaniak.com/2/ai/1234/openai/v1"))
  assert.ok(existsSync(join(cfgDir, "skills", "bankauszuege-verbuchen", "SKILL.md")))
})

test("disabled skills are not installed", () => {
  const s = settings({ disabledSkills: ["klientenbrief"] })
  const { cfgDir } = materialize(s, { key: "", embed: null })
  assert.ok(!existsSync(join(cfgDir, "skills", "klientenbrief")))
  assert.ok(existsSync(join(cfgDir, "skills", "eingang-sortieren")))
})

test("openai-compatible providers share one code path", () => {
  const p = engineProvider({ kind: "ollama", model: "qwen3.5:32b", smallModel: "", models: [] }, "")
  assert.equal(p.id, "ollama")
  assert.equal(p.config.ollama.npm, "@ai-sdk/openai-compatible")
  assert.equal(p.config.ollama.options.baseURL, "http://127.0.0.1:11434/v1")
})

test("plugin refuses to overwrite an existing file with write (F7.5) and logs approvals (F4.4)", async () => {
  const ws = mkdtempSync(join(tmpdir(), "gotthard-test-plugin-"))
  writeFileSync(join(ws, "a.txt"), "keep me")
  process.env.GOTTHARD_WORKSPACE = ws
  const hooks = await GotthardPlugin({ directory: ws })
  await assert.rejects(hooks["tool.execute.before"]({ tool: "write" }, { args: { filePath: join(ws, "a.txt") } }), /Refusing to overwrite/)
  await hooks["tool.execute.before"]({ tool: "write" }, { args: { filePath: join(ws, "new.txt") } })
  await hooks["tool.execute.before"]({ tool: "edit" }, { args: { filePath: join(ws, "a.txt") } })
  await hooks.event({ event: { type: "permission.asked", properties: { permission: "bash" } } })
  const log = readFileSync(join(ws, ".gotthard", "logs", "approvals.jsonl"), "utf8")
  assert.match(log, /"permission":"bash"/)
  delete process.env.GOTTHARD_WORKSPACE
})
