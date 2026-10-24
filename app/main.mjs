import { BrowserWindow, Menu, app, dialog, ipcMain, nativeImage, shell } from "electron"
import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { osLanguage, t } from "../src/i18n.mjs"
import { ensureMemory } from "../src/memory.mjs"
import { defaultWorkspace } from "../src/paths.mjs"
import { PROVIDERS, listModels } from "../src/providers.mjs"
import { getSecret, setSecret } from "../src/secrets.mjs"
import { startServer } from "../src/server.mjs"
import { DEFAULTS, loadSettings, saveSettings, setWorkspace } from "../src/settings.mjs"
import { createDemo, pythonReady } from "../src/wizard.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const ICON = join(HERE, "icon.png")

let wizardWin = null
let mainWin = null
let server = null

app.setName("Gotthard")

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "Gotthard",
    backgroundColor: "#fafafa",
    icon: ICON,
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith("http://127.0.0.1")) shell.openExternal(url)
    return { action: "deny" }
  })
  mainWin.on("page-title-updated", (e) => e.preventDefault())
  mainWin.on("closed", () => (mainWin = null))
  return mainWin
}

async function openWorkspace(settings) {
  if (!mainWin) createMainWindow()
  await mainWin.loadFile(join(HERE, "loading.html"))
  server?.stop()
  server = null
  try {
    server = await startServer(settings, { log: null })
    await mainWin.loadURL(server.loginUrl)
  } catch (e) {
    dialog.showErrorBox("Gotthard", `Der Assistent konnte nicht gestartet werden.\n\n${e.message}`)
  }
}

function openWizard() {
  if (wizardWin) return wizardWin.focus()
  wizardWin = new BrowserWindow({
    width: 760,
    height: 780,
    resizable: false,
    title: "Gotthard",
    backgroundColor: "#fafafa",
    icon: ICON,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: { preload: join(HERE, "preload.cjs"), contextIsolation: true, sandbox: true },
  })
  wizardWin.loadFile(join(HERE, "wizard", "index.html"))
  wizardWin.on("closed", () => (wizardWin = null))
}

function systemLanguage() {
  const code = (app.getPreferredSystemLanguages()[0] || osLanguage()).slice(0, 2).toLowerCase()
  return ["de", "fr", "it", "en"].includes(code) ? code : "de"
}

function strings(lang, kind) {
  const s = t(lang)
  const p = PROVIDERS[kind] || PROVIDERS.zen
  return {
    ...Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === "string")),
    privacy: s.privacy(p.label, p.swiss),
    testOk: s.testOk("{n}"),
  }
}

ipcMain.handle("wizard:init", () => {
  const prev = loadSettings()
  return {
    pythonReady: pythonReady(),
    lang: prev?.lang || systemLanguage(),
    provider: prev?.provider || DEFAULTS.provider,
    workspace: prev?.workspace || defaultWorkspace(),
    hasKey: prev ? !!getSecret(prev.provider.kind) : false,
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([k, v]) => [k, { label: v.label, note: v.note, swiss: v.swiss, recommended: v.recommended, recommendedSmall: v.recommendedSmall }]),
    ),
  }
})

ipcMain.handle("wizard:strings", (_e, lang, kind) => strings(lang, kind))

ipcMain.handle("wizard:test", async (_e, provider, key) => {
  try {
    const models = await listModels(provider, key || getSecret(provider.kind))
    if (!models.length) throw new Error("0 models")
    return { ok: true, models }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle("wizard:pickFolder", async (_e, current) => {
  const r = await dialog.showOpenDialog(wizardWin, { defaultPath: current, properties: ["openDirectory", "createDirectory"] })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle("wizard:folderEmpty", (_e, path) => {
  const p = resolve(path)
  return !existsSync(p) || readdirSync(p).filter((f) => !f.startsWith(".")).length === 0
})

ipcMain.handle("wizard:finish", async (_e, data) => {
  const settings = structuredClone(loadSettings() || DEFAULTS)
  settings.lang = data.lang
  settings.provider = { ...DEFAULTS.provider, ...data.provider }
  if (data.key !== undefined) setSecret(data.provider.kind, data.key)
  const ws = resolve(data.workspace)
  mkdirSync(ws, { recursive: true })
  if (data.demo && readdirSync(ws).filter((f) => !f.startsWith(".")).length === 0) createDemo(ws)
  setWorkspace(settings, ws)
  saveSettings(settings)
  const profile = data.profile && Object.values(data.profile).some(Boolean) ? data.profile : undefined
  ensureMemory(settings, profile)
  wizardWin?.close()
  await openWorkspace(settings)
  return true
})

function buildMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "Gotthard",
      submenu: [
        { label: "Einrichtung / Configuration…", click: () => openWizard() },
        {
          label: "Arbeitsordner öffnen / Ouvrir le dossier",
          click: () => {
            const s = loadSettings()
            if (s?.workspace) shell.openPath(s.workspace)
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        ...(process.platform === "darwin" ? [] : [{ type: "separator" }, { role: "quit" }]),
      ],
    },
    { role: "editMenu" },
    { role: "windowMenu" },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  if (process.platform === "darwin" && existsSync(ICON)) app.dock.setIcon(nativeImage.createFromPath(ICON))
  buildMenu()
  const settings = loadSettings()
  if (settings?.workspace && existsSync(settings.workspace)) await openWorkspace(settings)
  else openWizard()
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length) return
    const s = loadSettings()
    if (s?.workspace) await openWorkspace(s)
    else openWizard()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => server?.stop())
