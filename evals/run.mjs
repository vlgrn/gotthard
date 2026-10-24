import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { MCP_DIR, REPO } from "../src/paths.mjs"
import { saveSettings, requireSettings } from "../src/settings.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))

function walk(dir, root = dir, out = []) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.name === ".gotthard") continue
    const p = join(dir, d.name)
    if (d.isDirectory()) walk(p, root, out)
    else out.push(relative(root, p))
  }
  return out
}

function extractText(file) {
  const py = join(MCP_DIR, ".venv", "bin", "python")
  const r = spawnSync(py, ["-c", "import sys;from gotthard_mcp.readers import extract,to_text;print(to_text(extract(__import__('pathlib').Path(sys.argv[1]))))", file], { encoding: "utf8" })
  return r.stdout || ""
}

function runTask(task, settings, home, timeoutMs) {
  return new Promise((resolve) => {
    const env = { ...process.env, GOTTHARD_HOME: home }
    const args = [join(REPO, "bin", "gotthard.mjs"), "run", "--auto", "--json", task.prompt]
    const child = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"] })
    let out = ""
    let err = ""
    child.stdout.on("data", (d) => (out += d))
    child.stderr.on("data", (d) => (err += d))
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs)
    child.on("exit", (code) => {
      clearTimeout(timer)
      const events = out.split("\n").filter(Boolean).flatMap((l) => {
        try {
          return [JSON.parse(l)]
        } catch {
          return []
        }
      })
      const text = events.filter((e) => e.type === "text").map((e) => e.part?.text || "").join("\n")
      const tools = events.filter((e) => e.type === "tool_use").map((e) => e.part?.tool)
      const tokens = events.filter((e) => e.type === "step_finish").reduce((n, e) => n + (e.part?.tokens?.input || 0) + (e.part?.tokens?.output || 0), 0)
      resolve({ code, text, tools, tokens, stderr: err.slice(-2000) })
    })
  })
}

function check(c, ws, before, res) {
  const after = walk(ws)
  const created = after.filter((f) => !before.includes(f))
  const re = c.glob ? new RegExp(c.glob) : null
  const texts = () => created.filter((f) => re.test(f)).map((f) => extractText(join(ws, f))).join("\n")
  const has = (hay, list) => list.every((s) => hay.toLowerCase().includes(s.toLowerCase()))
  const any = (hay, list) => list.some((s) => hay.toLowerCase().includes(s.toLowerCase()))
  switch (c.type) {
    case "new_file":
      return created.some((f) => re.test(f))
    case "new_file_contains": {
      const t = texts()
      return c.all ? has(t, c.all) : any(t, c.any)
    }
    case "new_file_not_contains": {
      const t = texts()
      return t.length > 0 && !any(t, c.any)
    }
    case "answer_contains":
      return c.all ? has(res.text, c.all) : any(res.text, c.any)
    case "no_new_files":
      return created.length === 0
    case "files_left":
      return readdirSync(join(ws, c.dir)).filter((f) => new RegExp(c.pattern).test(f)).length <= c.max
    case "exists_match":
      return after.some((f) => new RegExp(c.pattern).test(f.split("\\").join("/")))
    case "log_lines": {
      const f = join(ws, ".gotthard", "logs", `${c.log}.jsonl`)
      return existsSync(f) && readFileSync(f, "utf8").trim().split("\n").length >= c.min
    }
    default:
      throw new Error(`unknown check ${c.type}`)
  }
}

export async function runEval({ model, only, keep } = {}) {
  const base = requireSettings()
  const tasks = JSON.parse(readFileSync(join(HERE, "tasks.json"), "utf8")).filter((t) => !only || t.id === only)
  const results = []
  for (const task of tasks) {
    const root = mkdtempSync(join(tmpdir(), "gotthard-eval-"))
    const ws = join(root, "workspace")
    const home = join(root, "home")
    spawnSync(join(MCP_DIR, ".venv", "bin", "python"), [join(REPO, "scripts", "build_assets.py"), "demo", ws], { stdio: "ignore" })
    const settings = structuredClone(base)
    settings.workspace = ws
    settings.lang = task.lang || "de"
    settings.trusted = {}
    if (model) settings.provider.model = model
    process.env.GOTTHARD_HOME = home
    saveSettings(settings)
    delete process.env.GOTTHARD_HOME
    const before = walk(ws)
    const t0 = Date.now()
    process.stdout.write(`▶ ${task.id.padEnd(14)} `)
    const res = await runTask(task, settings, home, 15 * 60 * 1000)
    const checks = task.checks.map((c) => ({ ...c, pass: (() => { try { return check(c, ws, before, res) } catch { return false } })() }))
    const passed = checks.filter((c) => c.pass).length
    const ok = passed === checks.length
    const secs = Math.round((Date.now() - t0) / 1000)
    console.log(`${ok ? "PASS" : "FAIL"}  ${passed}/${checks.length} checks  ${secs}s  ${res.tokens} tokens  tools: ${[...new Set(res.tools)].join(", ")}`)
    for (const c of checks.filter((c) => !c.pass)) console.log(`    ✗ ${c.type} ${JSON.stringify(c.all || c.any || c.glob || c.pattern || c.log || "")}`)
    if (res.code !== 0 && res.stderr) console.log(`    stderr: ${res.stderr.split("\n").slice(-3).join(" | ")}`)
    results.push({ id: task.id, use_case: task.use_case, ok, passed, total: checks.length, secs, tokens: res.tokens })
    if (keep) console.log(`    workspace kept: ${ws}`)
    else rmSync(root, { recursive: true, force: true })
  }
  const okCount = results.filter((r) => r.ok).length
  console.log(`\n${okCount}/${results.length} tasks passed (${Math.round((100 * okCount) / results.length)}%) – model ${base.provider.kind}/${model || base.provider.model}. Go/no-go threshold (V2): 70%.`)
  return results
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runEval().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
