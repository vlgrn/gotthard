// Company memory (F1.5, F6.1, F6.5). memory.md is plain Markdown the user can read and edit.
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { mcpCommand } from "./paths.mjs"

const HEAD = {
  de: { title: "# Firmengedächtnis", firm: "## Firma", notes: "## Notizen", hint: "<!-- Diese Datei wird jeder Sitzung mitgegeben. Sie können sie jederzeit bearbeiten. -->" },
  fr: { title: "# Mémoire de l'entreprise", firm: "## Entreprise", notes: "## Notes", hint: "<!-- Ce fichier est transmis à chaque session. Vous pouvez le modifier à tout moment. -->" },
  en: { title: "# Company memory", firm: "## Firm", notes: "## Notes", hint: "<!-- This file is given to every session. Edit it any time. -->" },
}

const LABELS = {
  de: { name: "Name", address: "Adresse", languages: "Sprachen", clients: "Typische Klienten", signature: "Signatur" },
  fr: { name: "Nom", address: "Adresse", languages: "Langues", clients: "Clients typiques", signature: "Signature" },
  en: { name: "Name", address: "Address", languages: "Languages", clients: "Typical clients", signature: "Signature" },
}

export function memoryPath(ws) {
  return join(ws, ".gotthard", "memory.md")
}

export function renderMemory(lang, profile = {}) {
  const h = HEAD[lang] || HEAD.en
  const l = LABELS[lang] || LABELS.en
  const lines = [h.title, "", h.hint, "", h.firm]
  for (const k of ["name", "address", "languages", "clients"]) if (profile[k]) lines.push(`- ${l[k]}: ${profile[k]}`)
  if (profile.signature) lines.push(`- ${l.signature}:`, "", "```", profile.signature, "```")
  lines.push("", h.notes, "")
  return lines.join("\n")
}

export function ensureMemory(settings, profile) {
  const dir = join(settings.workspace, ".gotthard")
  mkdirSync(join(dir, "logs"), { recursive: true })
  const f = memoryPath(settings.workspace)
  if (!existsSync(f)) writeFileSync(f, renderMemory(settings.lang, profile))
  else if (profile) {
    // new profile, but keep the approved notes
    const old = readFileSync(f, "utf8")
    const notesAt = Object.values(HEAD).map((h) => old.indexOf(h.notes)).find((i) => i >= 0)
    const fresh = renderMemory(settings.lang, profile)
    const notes = notesAt >= 0 ? old.slice(notesAt).replace(/^## [^\n]*\n/, "") : ""
    writeFileSync(f, fresh + notes)
  }
  const readme = join(dir, "README.txt")
  if (!existsSync(readme)) {
    writeFileSync(
      readme,
      "Gotthard – lokale Daten dieses Arbeitsordners / données locales de ce dossier\n\n" +
        "memory.md   Firmengedächtnis (bearbeitbar) / mémoire de l'entreprise (modifiable)\n" +
        "index.db    Dokumentenindex (kann gelöscht werden) / index des documents (peut être supprimé)\n" +
        "logs/       Freigaben, Aktionen, Verschiebungen / approbations, actions, déplacements\n",
    )
  }
}

export function readMemory(ws) {
  const f = memoryPath(ws)
  return existsSync(f) ? readFileSync(f, "utf8") : ""
}

/** Run the memory server's CLI (forget / reindex / status / search). */
export function memoryCli(settings, args, env = process.env) {
  const r = spawnSync(mcpCommand("gotthard-memory"), args, {
    env: { ...env, GOTTHARD_WORKSPACE: settings.workspace, GOTTHARD_LANG: settings.lang },
    encoding: "utf8",
  })
  if (r.status !== 0) throw new Error(r.stderr || `gotthard-memory exited with ${r.status}`)
  return r.stdout
}
