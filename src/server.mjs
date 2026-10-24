import { freePort, prepare, randomPassword, spawnEngine } from "./engine.mjs"
import { startGateway } from "./gateway.mjs"

async function waitForEngine(url, password, child, timeoutMs = 60000) {
  const auth = "Basic " + Buffer.from(`opencode:${password}`).toString("base64")
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`engine exited with code ${child.exitCode}`)
    try {
      const r = await fetch(`${url}/agent`, { headers: { Authorization: auth } })
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error("engine did not start in time")
}

export async function startServer(settings, { port = 0, log = process.stderr } = {}) {
  const { env } = prepare(settings)
  const enginePort = await freePort()
  const password = randomPassword()
  env.OPENCODE_SERVER_PASSWORD = password
  const engineUrl = `http://127.0.0.1:${enginePort}`
  const child = spawnEngine(["serve", "--hostname", "127.0.0.1", "--port", String(enginePort)], { env, cwd: settings.workspace })
  if (log) child.stderr.pipe(log)
  child.stdout.resume()
  try {
    await waitForEngine(engineUrl, password, child)
  } catch (e) {
    child.kill("SIGTERM")
    throw e
  }
  const { server, loginUrl } = await startGateway({ port, engineUrl, password, workspace: settings.workspace })
  const stop = () => {
    server.close()
    child.kill("SIGTERM")
  }
  return { child, loginUrl, stop }
}
