// Gotthard opencode plugin.
// - F4.4: every permission request/answer is appended to <workspace>/.gotthard/logs/approvals.jsonl
// - audit trail of tool calls in .gotthard/logs/actions.jsonl (tool name + title, no file contents)
// - F7.5: the built-in `write` tool may not overwrite an existing file; the agent must create a _v2 or use `edit`
// Plain JS without imports from @opencode-ai/plugin so opencode never needs to npm-install anything.
import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"

export const GotthardPlugin = async ({ directory }) => {
  const workspace = process.env.GOTTHARD_WORKSPACE || directory
  const logDir = join(workspace, ".gotthard", "logs")

  const log = (file, data) => {
    try {
      mkdirSync(logDir, { recursive: true })
      appendFileSync(join(logDir, file), JSON.stringify({ ts: new Date().toISOString(), ...data }) + "\n")
    } catch {
      // logging must never break a run
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type.startsWith("permission.")) log("approvals.jsonl", { type: event.type, ...event.properties })
      if (process.env.GOTTHARD_DEBUG_EVENTS) log("events.jsonl", { type: event.type })
    },

    "tool.execute.before": async (input, output) => {
      if (input.tool !== "write") return
      const target = output.args?.filePath
      if (!target) return
      const abs = isAbsolute(target) ? target : resolve(workspace, target)
      if (existsSync(abs)) {
        log("actions.jsonl", { tool: "write", blocked: true, path: abs })
        throw new Error(
          `Refusing to overwrite existing file ${target}. Save under a new versioned name (e.g. *_v2) ` +
            `or use the edit tool for a targeted change.`,
        )
      }
    },

    "tool.execute.after": async (input, output) => {
      log("actions.jsonl", { tool: input.tool, session: input.sessionID, title: output?.title })
    },
  }
}
