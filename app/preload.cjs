const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("gotthard", {
  init: () => ipcRenderer.invoke("wizard:init"),
  strings: (lang, kind) => ipcRenderer.invoke("wizard:strings", lang, kind),
  test: (provider, key) => ipcRenderer.invoke("wizard:test", provider, key),
  pickFolder: (current) => ipcRenderer.invoke("wizard:pickFolder", current),
  folderEmpty: (path) => ipcRenderer.invoke("wizard:folderEmpty", path),
  finish: (data) => ipcRenderer.invoke("wizard:finish", data),
})
