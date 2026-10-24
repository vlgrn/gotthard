const UI = {
  de: {
    next: "Weiter", back: "Zurück", start: "Gotthard starten", starting: "Gotthard wird gestartet …",
    language: "Sprache", languageLead: "In welcher Sprache möchten Sie arbeiten?",
    providerTitle: "KI-Modell", test: "Verbindung testen", optional: "optional",
    swiss: "Schweiz", testOnly: "nur Test",
    workspaceTitle: "Arbeitsordner", choose: "Ordner wählen …",
    profileTitle: "Praxisprofil", profileLead: "Optional. Wird lokal im Praxisgedächtnis gespeichert und hilft z. B. bei Briefen.",
    privacyTitle: "Datenschutz", python: "Die Python-Werkzeuge fehlen. Führen Sie im Projektordner «npm run setup:python» aus und starten Sie die App neu.",
  },
  fr: {
    next: "Continuer", back: "Retour", start: "Démarrer Gotthard", starting: "Démarrage de Gotthard …",
    language: "Langue", languageLead: "Dans quelle langue souhaitez-vous travailler ?",
    providerTitle: "Modèle d'IA", test: "Tester la connexion", optional: "facultatif",
    swiss: "Suisse", testOnly: "test uniquement",
    workspaceTitle: "Dossier de travail", choose: "Choisir un dossier …",
    profileTitle: "Profil du cabinet", profileLead: "Facultatif. Enregistré localement dans la mémoire du cabinet, utile p. ex. pour les lettres.",
    privacyTitle: "Protection des données", python: "Les outils Python manquent. Exécutez « npm run setup:python » dans le dossier du projet, puis relancez l'application.",
  },
  en: {
    next: "Continue", back: "Back", start: "Start Gotthard", starting: "Starting Gotthard …",
    language: "Language", languageLead: "Which language do you want to work in?",
    providerTitle: "AI model", test: "Test connection", optional: "optional",
    swiss: "Switzerland", testOnly: "testing only",
    workspaceTitle: "Workspace folder", choose: "Choose folder …",
    profileTitle: "Practice profile", profileLead: "Optional. Stored locally in the practice memory, useful e.g. for letters.",
    privacyTitle: "Privacy", python: "The Python tools are missing. Run 'npm run setup:python' in the project folder and restart the app.",
  },
}
UI.it = UI.en

const PROVIDER_TEXT = {
  de: {
    zen: ["OpenCode Zen", "Nur für Tests – Modelle ausserhalb der Schweiz. Kostenlose Modelle ohne Konto."],
    infomaniak: ["Infomaniak AI", "Empfohlen für den Betrieb: Schweizer Hosting, Verarbeitung in Genf."],
    ollama: ["Ollama (lokal)", "Komplett lokal. Braucht einen leistungsstarken Computer."],
    custom: ["Eigener Endpunkt", "Jede OpenAI-kompatible API, z. B. AlpineAI oder ein eigener Server."],
  },
  fr: {
    zen: ["OpenCode Zen", "Pour les tests uniquement – modèles hors de Suisse. Modèles gratuits sans compte."],
    infomaniak: ["Infomaniak AI", "Recommandé en production : hébergement suisse, traitement à Genève."],
    ollama: ["Ollama (local)", "Entièrement local. Nécessite un ordinateur puissant."],
    custom: ["Point d'accès personnalisé", "Toute API compatible OpenAI, p. ex. AlpineAI ou votre propre serveur."],
  },
  en: {
    zen: ["OpenCode Zen", "Testing only – models hosted outside Switzerland. Free models without an account."],
    infomaniak: ["Infomaniak AI", "Recommended for production: Swiss hosting, processed in Geneva."],
    ollama: ["Ollama (local)", "Fully local. Needs a powerful computer."],
    custom: ["Custom endpoint", "Any OpenAI-compatible API, e.g. AlpineAI or your own server."],
  },
}
PROVIDER_TEXT.it = PROVIDER_TEXT.en

const LANGS = [
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["it", "Italiano"],
  ["en", "English"],
]

const state = {
  step: 0,
  lang: "de",
  provider: { kind: "zen", productId: "", baseURL: "", model: "", smallModel: "", models: [] },
  key: "",
  hasKey: false,
  tested: false,
  models: [],
  testMessage: null,
  workspace: "",
  empty: true,
  demo: true,
  profile: { name: "", address: "", languages: "", clients: "", signature: "" },
  busy: false,
}

let init
let s = {}
const view = document.getElementById("view")
const next = document.getElementById("next")
const back = document.getElementById("back")
const ui = () => UI[state.lang] || UI.en

const STEPS = [renderLanguage, renderProvider, renderWorkspace, renderProfile, renderPrivacy]

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v)
    else if (k === "class") el.className = v
    else if (v === true) el.setAttribute(k, "")
    else if (v !== false && v != null) el.setAttribute(k, v)
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c)
  return el
}

async function refreshStrings() {
  s = await window.gotthard.strings(state.lang, state.provider.kind)
}

function render() {
  const steps = document.getElementById("steps")
  steps.replaceChildren(...STEPS.map((_, i) => h("li", { class: i < state.step ? "done" : i === state.step ? "current" : "" })))
  view.replaceChildren(...STEPS[state.step]())
  back.textContent = ui().back
  back.hidden = state.step === 0 || state.busy
  next.textContent = state.busy ? ui().starting : state.step === STEPS.length - 1 ? ui().start : ui().next
  next.disabled = state.busy || !canContinue()
}

function canContinue() {
  if (!init.pythonReady) return false
  if (state.step === 1) return state.tested && !!state.provider.model
  if (state.step === 2) return !!state.workspace
  return true
}

function renderLanguage() {
  const out = [h("h1", {}, ui().language), h("p", { class: "lead" }, ui().languageLead)]
  if (!init.pythonReady) out.push(h("p", { class: "error" }, ui().python))
  out.push(
    h(
      "div",
      { class: "choices two" },
      LANGS.map(([code, name]) =>
        h("button", { class: `choice${state.lang === code ? " selected" : ""}`, type: "button", onclick: async () => {
          state.lang = code
          await refreshStrings()
          render()
        } }, h("span", { class: "title" }, name)),
      ),
    ),
  )
  return out
}

function renderProvider() {
  const p = state.provider
  const field = (label, key, type = "text", placeholder = "") =>
    [h("label", {}, label), h("input", { type, value: key === "key" ? state.key : p[key], placeholder, oninput: (e) => {
      if (key === "key") state.key = e.target.value
      else p[key] = e.target.value
      state.tested = false
      state.testMessage = null
      updateNext()
    } })]

  const cards = Object.entries(init.providers).map(([kind, v]) =>
    h("button", { class: `choice${p.kind === kind ? " selected" : ""}`, type: "button", onclick: async () => {
      if (p.kind !== kind) {
        Object.assign(p, { kind, model: "", smallModel: "", models: [] })
        state.tested = false
        state.testMessage = null
        state.models = []
        state.key = ""
      }
      await refreshStrings()
      render()
      autoTest()
    } },
    h("span", {},
      h("span", { class: "title" }, (PROVIDER_TEXT[state.lang] || PROVIDER_TEXT.en)[kind]?.[0] || v.label),
      v.swiss === true ? h("span", { class: "badge swiss" }, ui().swiss) : v.swiss === false ? h("span", { class: "badge test" }, ui().testOnly) : null,
      h("span", { class: "hint" }, (PROVIDER_TEXT[state.lang] || PROVIDER_TEXT.en)[kind]?.[1] || v.note))),
  )

  const fields = []
  if (p.kind === "zen") fields.push(...field(s.zenKey, "key", "password", state.hasKey ? "••••••••" : ""))
  if (p.kind === "infomaniak") {
    fields.push(h("p", { class: "note" }, s.infHelp))
    fields.push(...field(s.infToken, "key", "password", state.hasKey ? "••••••••" : ""), ...field(s.infProduct, "productId", "text", "123456"))
  }
  if (p.kind === "custom") fields.push(...field(s.customUrl, "baseURL", "text", "https://…/v1"), ...field(s.customKey, "key", "password"))
  if (p.kind === "ollama") fields.push(h("p", { class: "note" }, s.ollamaMissing))

  const test = h("button", { class: "secondary", id: "test", type: "button", onclick: runTest }, ui().test)
  const status = state.testMessage ? h("div", { class: `status ${state.tested ? "ok" : "err"}` }, state.testMessage) : null

  const models = []
  if (state.tested && state.models.length) {
    const select = (label, key) => [h("label", {}, label), h("select", { onchange: (e) => (p[key] = e.target.value) },
      state.models.map((m) => h("option", { value: m.id, selected: p[key] === m.id }, m.note ? `${m.id} — ${m.note}` : m.id)))]
    models.push(h("div", { class: "grid2" }, h("div", {}, ...select(s.model, "model")), h("div", {}, ...select(s.smallModel, "smallModel"))))
  }

  return [h("h1", {}, ui().providerTitle), h("p", { class: "lead" }, s.provider), h("div", { class: "choices two" }, cards), ...fields,
    h("div", { class: "row spaced" }, test), status, ...models]
}

function autoTest() {
  if (!state.tested && ["zen", "ollama"].includes(state.provider.kind)) runTest()
}

async function runTest() {
  state.testMessage = s.testing
  render()
  const r = await window.gotthard.test(state.provider, state.key)
  if (r.ok) {
    const def = init.providers[state.provider.kind]
    const ids = r.models.map((m) => m.id)
    const pick = (list, current) => [current, ...list].find((id) => id && ids.includes(id)) || ids[0]
    state.models = r.models
    state.provider.model = pick(def.recommended, state.provider.model)
    state.provider.smallModel = pick([...def.recommendedSmall, state.provider.model], state.provider.smallModel)
    state.provider.models = ids.slice(0, 50)
    state.tested = true
    state.testMessage = s.testOk.replace("{n}", r.models.length)
  } else {
    state.tested = false
    state.testMessage = `${s.testFail}: ${r.error}`
  }
  render()
}

function renderWorkspace() {
  const pick = h("button", { class: "secondary", type: "button", onclick: async () => {
    const path = await window.gotthard.pickFolder(state.workspace)
    if (path) {
      state.workspace = path
      state.empty = await window.gotthard.folderEmpty(path)
      render()
    }
  } }, ui().choose)
  return [
    h("h1", {}, ui().workspaceTitle),
    h("p", { class: "lead" }, s.workspace),
    h("div", { class: "row" }, h("input", { type: "text", value: state.workspace, readonly: true }), pick),
    state.empty
      ? h("label", { class: "check" }, h("input", { type: "checkbox", checked: state.demo, onchange: (e) => (state.demo = e.target.checked) }), s.demo)
      : null,
  ]
}

function renderProfile() {
  const f = (label, key, multi = false) => [h("label", {}, label),
    h(multi ? "textarea" : "input", { type: "text", value: multi ? null : state.profile[key], oninput: (e) => (state.profile[key] = e.target.value) },
      multi ? state.profile[key] : null)]
  return [
    h("h1", {}, ui().profileTitle),
    h("p", { class: "lead" }, ui().profileLead),
    h("div", { class: "grid2" }, h("div", {}, ...f(s.firm, "name")), h("div", {}, ...f(s.languages, "languages"))),
    ...f(s.address, "address"),
    ...f(s.clients, "clients"),
    ...f(s.signature, "signature", true),
  ]
}

function renderPrivacy() {
  const lines = s.privacy.split("\n")
  return [
    h("h1", {}, s.privacyTitle || ui().privacyTitle),
    h("ul", { class: "privacy" }, lines.map((l) => h("li", { class: l.startsWith("⚠") ? "warn" : "" }, l))),
  ]
}

function updateNext() {
  next.disabled = state.busy || !canContinue()
}

next.addEventListener("click", async () => {
  if (state.step < STEPS.length - 1) {
    state.step++
    if (state.step === 2) state.empty = await window.gotthard.folderEmpty(state.workspace)
    render()
    if (state.step === 1) autoTest()
    return
  }
  state.busy = true
  render()
  await window.gotthard.finish({
    lang: state.lang,
    provider: state.provider,
    key: state.key || (state.hasKey ? undefined : ""),
    workspace: state.workspace,
    demo: state.empty && state.demo,
    profile: state.profile,
  })
})

back.addEventListener("click", () => {
  state.step = Math.max(0, state.step - 1)
  render()
})

;(async () => {
  init = await window.gotthard.init()
  state.lang = init.lang
  state.provider = { ...state.provider, ...init.provider }
  state.workspace = init.workspace
  state.hasKey = init.hasKey
  await refreshStrings()
  render()
})()
