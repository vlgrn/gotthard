import { randomBytes, timingSafeEqual } from "node:crypto"
import { createServer, request } from "node:http"
import { connect } from "node:net"

const COOKIE = "gotthard_session"

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
    if (!sameToken(cookieToken(req), session)) {
      res.writeHead(401, { "content-type": "text/plain; charset=utf-8" }).end("Not logged in. Use the link printed by ./gotthard start")
      return
    }
    const up = request(
      { host: target.hostname, port: target.port, method: req.method, path: req.url, headers: upstreamHeaders(req, target, auth) },
      (ur) => {
        res.writeHead(ur.statusCode, ur.headers)
        ur.pipe(res)
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
