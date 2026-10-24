import { randomBytes, timingSafeEqual } from "node:crypto"
import { readFileSync } from "node:fs"
import { createServer, request } from "node:http"
import { connect } from "node:net"
import { join } from "node:path"
import { BRAND_DIR } from "./paths.mjs"

const COOKIE = "gotthard_session"
const BRAND_FILES = {
  "mark.svg": "image/svg+xml",
  "brand.css": "text/css; charset=utf-8",
  "brand.js": "text/javascript; charset=utf-8",
  "site.webmanifest": "application/manifest+json",
}
const BRAND_HEAD =
  '<link rel="icon" type="image/svg+xml" href="/__gotthard/brand/mark.svg" />' +
  '<link rel="stylesheet" href="/__gotthard/brand/brand.css" />' +
  '<script src="/__gotthard/brand/brand.js"></script>'

function brandHtml(html, workspace) {
  const attr = (workspace || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
  const boot = `<meta name="gotthard-workspace" content="${attr}" />`
  return html
    .replace(/<title>[^<]*<\/title>/, "<title>Gotthard</title>")
    .replace(/<link rel="(icon|shortcut icon|apple-touch-icon)"[^>]*>\s*/g, "")
    .replace(/<link rel="manifest"[^>]*>/, '<link rel="manifest" href="/__gotthard/brand/site.webmanifest" />')
    .replace("</head>", `${boot}${BRAND_HEAD}</head>`)
}

function serveBrand(name, res) {
  if (!BRAND_FILES[name]) return res.writeHead(404).end()
  res.writeHead(200, { "content-type": BRAND_FILES[name], "cache-control": "no-cache" }).end(readFileSync(join(BRAND_DIR, name)))
}

function sameToken(a, b) {
  const x = Buffer.from(a || "")
  const y = Buffer.from(b || "")
  return x.length === y.length && timingSafeEqual(x, y)
}

function cookieToken(req) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
  return m ? m[1] : ""
}

function upstreamHeaders(req, target, auth) {
  const h = { ...req.headers, host: target.host, authorization: auth }
  delete h.cookie
  delete h["accept-encoding"]
  if (h.origin) h.origin = target.origin
  if (h.referer) h.referer = target.origin + "/"
  return h
}

export function startGateway({ port, engineUrl, password, workspace }) {
  const target = new URL(engineUrl)
  const auth = "Basic " + Buffer.from(`opencode:${password}`).toString("base64")
  const session = randomBytes(24).toString("base64url")
  const loginToken = randomBytes(24).toString("base64url")
  const home = workspace ? `/${Buffer.from(workspace).toString("base64url")}/session` : "/"

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1")
    if (url.pathname === "/__gotthard/login") {
      if (!sameToken(url.searchParams.get("t"), loginToken)) {
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" }).end("Invalid link. Use the link printed by ./gotthard start")
        return
      }
      res.writeHead(302, { "set-cookie": `${COOKIE}=${session}; HttpOnly; SameSite=Strict; Path=/`, location: home }).end()
      return
    }
    if (url.pathname.startsWith("/__gotthard/brand/")) return serveBrand(url.pathname.slice(18), res)
    if (url.pathname === "/site.webmanifest") return serveBrand("site.webmanifest", res)
    if (!sameToken(cookieToken(req), session)) {
      res.writeHead(401, { "content-type": "text/plain; charset=utf-8" }).end("Not logged in. Use the link printed by ./gotthard start")
      return
    }
    const up = request(
      { host: target.hostname, port: target.port, method: req.method, path: req.url, headers: upstreamHeaders(req, target, auth) },
      (ur) => {
        if (!(ur.headers["content-type"] || "").startsWith("text/html")) {
          res.writeHead(ur.statusCode, ur.headers)
          return ur.pipe(res)
        }
        const chunks = []
        ur.on("data", (c) => chunks.push(c))
        ur.on("end", () => {
          const body = Buffer.from(brandHtml(Buffer.concat(chunks).toString("utf8"), workspace))
          const headers = { ...ur.headers, "content-length": body.length }
          delete headers["transfer-encoding"]
          res.writeHead(ur.statusCode, headers).end(body)
        })
      },
    )
    up.on("error", () => res.headersSent ? res.destroy() : res.writeHead(502).end("engine not reachable"))
    req.pipe(up)
  })

  server.on("upgrade", (req, socket, head) => {
    if (!sameToken(cookieToken(req), session)) {
      socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n")
      return
    }
    const up = connect(Number(target.port), target.hostname, () => {
      const headers = upstreamHeaders(req, target, auth)
      const lines = [`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), "", ""]
      up.write(lines.join("\r\n"))
      if (head?.length) up.write(head)
      up.pipe(socket)
      socket.pipe(up)
    })
    up.on("error", () => socket.destroy())
    socket.on("error", () => up.destroy())
  })

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", () => {
      const base = `http://127.0.0.1:${server.address().port}`
      resolve({ server, url: base, loginUrl: `${base}/__gotthard/login?t=${loginToken}` })
    })
  })
}
