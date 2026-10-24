#!/usr/bin/env node
import { spawn } from "node:child_process"
import { cpSync, existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { runEval } from "../evals/run.mjs"
import { freePort, prepare, randomPassword, runEngine, spawnEngine } from "../src/engine.mjs"
import { t } from "../src/i18n.mjs"
import { memoryCli, memoryPath } from "../src/memory.mjs"
import { appHome, engineHome, mcpCommand, opencodeBin } from "../src/paths.mjs"
import { AGENT_NAMES, listSkills, userSkillsDir } from "../src/preset.mjs"
import { PROVIDERS, listModels } from "../src/providers.mjs"
import { getSecret } from "../src/secrets.mjs"
import { startServer } from "../src/server.mjs"
import { loadSettings, requireSettings, saveSettings, setWorkspace } from "../src/settings.mjs"
import { createDemo, pythonReady, wizard } from "../src/wizard.mjs"

const HELP = `gotthard – Swiss agentic desktop (MVP CLI)

Setup
  gotthard setup                 first-run wizard (language, model provider, workspace, profile)
  gotthard demo [dir]            create a demo Treuhand workspace and switch to it
  gotthard doctor                check installation, provider connection and workspace

Work
  gotthard start                 open the chat UI in your browser (local engine, 127.0.0.1 only)
  gotthard tui                   chat in the terminal
  gotthard run "<prompt>"        one-shot task without UI  [--agent nur-lesen] [--auto]
  gotthard serve                 headless engine for the desktop shell (prints URL + password as JSON)

Workspace & safety
  gotthard workspace [path]      show / switch the active workspace (recent list without argument)
  gotthard trust | untrust       allow shell commands without asking in this workspace (F4.3)
  gotthard logs [approvals|actions|moves|files|memory]   show the local audit logs

Memory & skills
  gotthard memory [show|edit|status|reindex|search <q>|forget <name>]
  gotthard skills [list|disable <name>|enable <name>|import <folder>]

Other
  gotthard config                print the generated engine configuration
  gotthard eval [--model m] [--only id]   run the feasibility/regression task set (V2/V3)
  gotthard privacy               what stays local, what goes where
`

const [cmd = "help", ...args] = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const positional = () => args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--auto", "--json"].includes(args[i - 1])))

function ensurePython() {
  if (!pythonReady()) {
    console.error("Python tools missing. Run once:  npm run setup:python")
    process.exit(1)
  }
}

async function main() {
  switch (cmd) {
    case "setup": {
      ensurePython()
      await wizard()
      break
    }

    case "demo": {
      ensurePython()
      const s = loadSettings()
      if (!s) {
        console.error("Run `gotthard setup` first (choose a provider), then `gotthard demo`.")
        process.exit(1)
      }
      const dir = resolve(positional()[0] || join(s.workspace ? join(s.workspace, "..") : process.cwd(), "Gotthard-Demo"))
      if (!existsSync(join(dir, "Eingang"))) createDemo(dir)
      setWorkspace(s, dir)
      saveSettings(s)
      console.log(`Active workspace: ${dir}\nNext: gotthard start`)
      break
    }

    case "start":
    case "web": {
      const s = requireSettings()
      const { child, loginUrl } = await startServer(s, { port: Number(opt("port")) || 0 })
      stopWith(child)
      banner(s, loginUrl)
      if (!flag("no-open")) openBrowser(loginUrl)
      break
    }

    case "tui": {
      const s = requireSettings()
      const { env } = prepare(s)
      process.exitCode = await runEngine([s.workspace], { env, cwd: s.workspace })
      break
    }

    case "run": {
      const s = requireSettings()
      const { env } = prepare(s)
      const prompt = positional().join(" ")
      if (!prompt) throw new Error('Usage: gotthard run "<prompt>"')
      const a = ["run", "--dir", s.workspace]
      if (opt("agent")) a.push("--agent", opt("agent"))
      if (opt("model")) a.push("--model", opt("model"))
      if (flag("auto")) a.push("--auto")
      if (flag("json")) a.push("--format", "json")
      a.push(prompt)
      process.exitCode = await runEngine(a, { env, cwd: s.workspace })
      break
    }

    case "serve": {
      const s = requireSettings()
      const { env } = prepare(s)
      const port = await freePort()
      const password = randomPassword()
      env.OPENCODE_SERVER_PASSWORD = password
      const child = spawnEngine(["serve", "--hostname", "127.0.0.1", "--port", String(port)], { env, cwd: s.workspace })
      child.stderr.pipe(process.stderr)
      child.stdout.on("data", () => {})
      console.log(JSON.stringify({ url: `http://127.0.0.1:${port}`, username: "opencode", password, workspace: s.workspace, pid: child.pid }))
      stopWith(child)
      break
    }

    case "workspace": {
      const s = requireSettings()
      const target = positional()[0]
      if (!target) {
        console.log(`active: ${s.workspace}\nrecent:\n${s.recentWorkspaces.map((w) => `  ${w}`).join("\n")}`)
        break
      }
      setWorkspace(s, target)
      saveSettings(s)
      console.log(`Active workspace: ${s.workspace}`)
      break
    }

    case "trust":
    case "untrust": {
      const s = requireSettings()
      if (cmd === "trust") {
        console.log(
          "⚠  Trusted mode: the assistant may run shell commands in this workspace WITHOUT asking.\n" +
            "   Shell commands can delete or change any file your user account can access.\n" +
            "   Only enable this if you understand the risk. Re-run with --yes to confirm.",
        )
        if (!flag("yes")) break
        s.trusted[s.workspace] = true
      } else delete s.trusted[s.workspace]
      saveSettings(s)
      console.log(`${s.workspace}: ${s.trusted[s.workspace] ? "trusted (bash allowed)" : "normal (bash asks)"}`)
      break
    }

    case "logs": {
      const s = requireSettings()
      const which = positional()[0] || "approvals"
      const f = join(s.workspace, ".gotthard", "logs", `${which}.jsonl`)
      console.log(existsSync(f) ? readFileSync(f, "utf8") : `(no ${which} log yet)`)
      break
    }

    case "memory": {
      const s = requireSettings()
      const [sub = "show", ...rest] = positional()
      if (sub === "show") console.log(readFileSync(memoryPath(s.workspace), "utf8"))
      else if (sub === "edit") {
        const editor = process.env.VISUAL || process.env.EDITOR || (process.platform === "darwin" ? "open -t" : process.platform === "win32" ? "notepad" : "nano")
        const [bin, ...ea] = editor.split(" ")
        spawn(bin, [...ea, memoryPath(s.workspace)], { stdio: "inherit" })
      } else if (sub === "forget") {
        if (!rest.length) throw new Error('Usage: gotthard memory forget "<client name>"')
        console.log(memoryCli(s, ["forget", rest.join(" ")]))
      } else if (["status", "reindex", "search"].includes(sub)) {
        const { env } = prepare(s)
        console.log(memoryCli(s, [sub, ...(sub === "reindex" && flag("full") ? ["--full"] : []), ...rest], memoryEnv(env, s)))
      } else throw new Error(`unknown memory command: ${sub}`)
      break
    }

    case "skills": {
      const s = requireSettings()
      const [sub = "list", name] = positional()
      if (sub === "list") {
        const user = existsSync(userSkillsDir()) ? readdirSync(userSkillsDir()) : []
        for (const n of [...listSkills(s.lang), ...user]) console.log(`${s.disabledSkills.includes(n) ? "  [off]" : "  [on] "} ${n}${user.includes(n) ? "  (imported)" : ""}`)
      } else if (sub === "disable" || sub === "enable") {
        s.disabledSkills = s.disabledSkills.filter((x) => x !== name)
        if (sub === "disable") s.disabledSkills.push(name)
        saveSettings(s)
        console.log(`${name}: ${sub}d`)
      } else if (sub === "import") {
        const src = resolve(name)
        if (!existsSync(join(src, "SKILL.md"))) throw new Error(`${src} has no SKILL.md`)
        cpSync(src, join(userSkillsDir(), basename(src)), { recursive: true })
        console.log(`imported ${basename(src)} – review its SKILL.md before use; skills are instructions to the assistant.`)
      }
      break
    }

    case "config": {
      const s = requireSettings()
      const { config } = prepare(s)
      console.log(JSON.stringify(config, null, 2))
      break
    }

    case "doctor": {
      await doctor()
      break
    }

    case "privacy": {
      const s = requireSettings()
      const def = PROVIDERS[s.provider.kind]
      console.log(t(s.lang).privacy(def.label, def.swiss))
      console.log("\nNetwork destinations: see NETWORK.md")
      break
    }

    case "eval": {
      await runEval({ model: opt("model"), only: opt("only"), keep: flag("keep") })
      break
    }

    default:
      console.log(HELP)
  }
}

function memoryEnv(env, s) {
  const { config } = prepare(s)
  const e = { ...env }
  for (const [k, v] of Object.entries(config.mcp["gotthard-memory"].environment)) e[k] = v === "{env:GOTTHARD_ENGINE_KEY}" ? env.GOTTHARD_ENGINE_KEY : v
  return e
}

function stopWith(child) {
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => child.kill("SIGTERM"))
  process.on("exit", () => child.kill("SIGTERM"))
  child.on("exit", (code) => process.exit(code ?? 0))
}

function openBrowser(url) {
  const [bin, ...a] = process.platform === "darwin" ? ["open"] : process.platform === "win32" ? ["cmd", "/c", "start", '""'] : ["xdg-open"]
  spawn(bin, [...a, url], { stdio: "ignore", detached: true }).unref()
}

function banner(s, loginUrl) {
  const names = AGENT_NAMES[s.lang] || AGENT_NAMES.en
  console.log(
    [
      "",
      "  Gotthard",
      `  workspace : ${s.workspace}`,
      `  model     : ${s.provider.kind} / ${s.provider.model}${PROVIDERS[s.provider.kind].swiss === false ? "   ⚠ not Swiss-hosted (test phase)" : ""}`,
      `  agents    : ${names.main} (default), ${names.readonly}`,
      `  open      : ${loginUrl}`,
      "",
      "  ready – press Ctrl+C to stop",
      "",
    ].join("\n"),
  )
}

async function doctor() {
  const ok = (b, msg, hint = "") => console.log(`${b ? "✓" : "✗"} ${msg}${!b && hint ? `\n    → ${hint}` : ""}`)
  ok(true, `app data: ${appHome()}`)
  let bin
  try {
    bin = opencodeBin()
  } catch {}
  ok(!!bin, "engine (opencode) installed", "npm install")
  ok(existsSync(mcpCommand("gotthard-office")), "python tools installed", "npm run setup:python")
  const s = loadSettings()
  ok(!!s, "settings present", "gotthard setup")
  if (!s) return
  ok(existsSync(s.workspace), `workspace: ${s.workspace}`, "gotthard workspace <path>")
  const key = getSecret(s.provider.kind)
  try {
    const models = await listModels(s.provider, key)
    ok(models.some((m) => m.id === s.provider.model), `provider ${s.provider.kind}: model ${s.provider.model} available (${models.length} models)`, "gotthard setup")
  } catch (e) {
    ok(false, `provider ${s.provider.kind} reachable`, e.message)
  }
  ok(PROVIDERS[s.provider.kind].swiss !== false, "Swiss-hosted provider", "OpenCode Zen is for testing only – switch to Infomaniak before using real client data")
  ok(!s.trusted[s.workspace], "bash requires approval in this workspace", "gotthard untrust")
  ok(existsSync(memoryPath(s.workspace)), "company memory present")
  console.log(`engine state: ${engineHome()}`)
}

main().catch((e) => {
  console.error(`gotthard: ${e.message}`)
  process.exit(1)
})
