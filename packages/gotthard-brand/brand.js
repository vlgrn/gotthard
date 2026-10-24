;(() => {
  const NAME = "Gotthard"
  const meta = (name) => document.querySelector(`meta[name="gotthard-${name}"]`)?.content
  const workspace = meta("workspace")
  const version = meta("version")
  const HELP = "/__gotthard/help"
  const FOREIGN = /opencode\.ai|discord/i
  const BRAND = /OpenCode(?! Zen)( Desktop)?/g
  const SKIP = "[contenteditable], pre, code, textarea, input"

  const open = window.open.bind(window)
  window.open = (url, ...rest) => {
    if (FOREIGN.test(String(url))) {
      location.href = HELP
      return null
    }
    return open(url, ...rest)
  }
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest?.("a[href]")
      if (a && FOREIGN.test(a.href)) {
        e.preventDefault()
        e.stopPropagation()
        location.href = HELP
      }
    },
    true,
  )

  const rename = (node) => {
    if (node.parentElement?.closest(SKIP)) return
    let text = node.nodeValue
    if (text.includes("OpenCode")) text = text.replace(BRAND, NAME)
    if (version && /^v?1\.\d+\.\d+$/.test(text.trim()) && (text.trim().startsWith("v") || node.previousSibling?.nodeValue === "v")) {
      text = text.trim().startsWith("v") ? `v${version}` : version
    }
    if (text !== node.nodeValue) node.nodeValue = text
  }
  const renameAll = (root) => {
    if (root.nodeType === Node.TEXT_NODE) return rename(root)
    if (root.nodeType !== Node.ELEMENT_NODE) return
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) rename(n)
  }

  if (workspace) {
    try {
      const key = "opencode.global.dat:server"
      const state = JSON.parse(localStorage.getItem(key) || "{}")
      state.list ??= []
      state.projects ??= {}
      state.lastProject ??= {}
      state.recentlyClosed ??= {}
      const local = (state.projects.local ??= []).filter((p) => p.worktree)
      if (!local.some((p) => p.worktree === workspace)) local.unshift({ worktree: workspace, expanded: true })
      state.projects.local = local
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }
  const WORDMARK =
    '<rect x="196" y="30" width="70" height="70" rx="15" fill="#D52B1E"/>' +
    '<path d="M216.5 86V64.5a14.5 14.5 0 0 1 29 0V86z" fill="#fff"/>' +
    '<text x="290" y="87" fill="currentColor" font-size="66" font-weight="600" letter-spacing="-2" ' +
    'style="font-family: var(--v2-font-family-sans, system-ui, sans-serif)">gotthard</text>'

  const LABELS = {
    de: ["Sitzung löschen", "Löschen?"],
    fr: ["Supprimer la session", "Supprimer ?"],
    it: ["Elimina sessione", "Eliminare?"],
    en: ["Delete session", "Delete?"],
  }
  const [delLabel, delConfirm] = LABELS[meta("lang")] || LABELS.en
  const TRASH =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">' +
    '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>'

  const findSession = async (row) => {
    const title = row.querySelector("span")?.textContent?.trim()
    const rows = [...document.querySelectorAll('[data-component="home-session-row"]')]
    const nth = rows.filter((r) => r.querySelector("span")?.textContent?.trim() === title).indexOf(row)
    const res = await fetch("/api/session?limit=5000&order=desc")
    const list = (await res.json()).data || []
    return list.filter((x) => (x.title || "").trim() === title)[nth]
  }

  const addDelete = (row) => {
    const box = row.parentElement
    if (!box || box.querySelector(".gotthard-del")) return
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "gotthard-del"
    btn.title = delLabel
    btn.setAttribute("aria-label", delLabel)
    btn.innerHTML = TRASH
    let armed = null
    const disarm = () => {
      clearTimeout(armed)
      armed = null
      btn.classList.remove("armed")
      btn.innerHTML = TRASH
    }
    btn.addEventListener("click", async (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!armed) {
        btn.classList.add("armed")
        btn.textContent = delConfirm
        armed = setTimeout(disarm, 3000)
        return
      }
      disarm()
      btn.disabled = true
      try {
        const session = await findSession(row)
        if (!session) throw new Error("session not found")
        const dir = session.location?.directory || session.directory || ""
        const r = await fetch(`/session/${encodeURIComponent(session.id)}?directory=${encodeURIComponent(dir)}`, { method: "DELETE" })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        box.remove()
      } catch (err) {
        btn.disabled = false
        console.error("[gotthard] delete failed", err)
      }
    })
    box.appendChild(btn)
  }

  let queued = false
  const apply = () => {
    document.querySelectorAll('[data-component="home-session-row"]').forEach(addDelete)
    queued = false
    if (document.title.includes("OpenCode")) document.title = document.title.replaceAll("OpenCode", NAME)
    for (const svg of document.querySelectorAll('svg[viewBox="0 0 720 129"]:not([data-gotthard])')) {
      svg.setAttribute("data-gotthard", "")
      svg.innerHTML = WORDMARK
    }
  }
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") rename(r.target)
      else r.addedNodes.forEach(renameAll)
    }
    if (!queued) {
      queued = true
      requestAnimationFrame(apply)
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  apply()
  renameAll(document.documentElement)
})()
