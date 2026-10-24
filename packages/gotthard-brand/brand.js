;(() => {
  const NAME = "Gotthard"
  const WORDMARK =
    '<rect x="196" y="30" width="70" height="70" rx="15" fill="#D52B1E"/>' +
    '<path d="M216.5 86V64.5a14.5 14.5 0 0 1 29 0V86z" fill="#fff"/>' +
    '<text x="290" y="87" fill="currentColor" font-size="66" font-weight="600" letter-spacing="-2" ' +
    'style="font-family: var(--v2-font-family-sans, system-ui, sans-serif)">gotthard</text>'

  let queued = false
  const apply = () => {
    queued = false
    if (document.title.includes("OpenCode")) document.title = document.title.replaceAll("OpenCode", NAME)
    for (const svg of document.querySelectorAll('svg[viewBox="0 0 720 129"]:not([data-gotthard])')) {
      svg.setAttribute("data-gotthard", "")
      svg.innerHTML = WORDMARK
    }
  }
  new MutationObserver(() => {
    if (!queued) {
      queued = true
      requestAnimationFrame(apply)
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  apply()
})()
