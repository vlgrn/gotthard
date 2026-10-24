// S5: API tokens live in the OS keychain (macOS Keychain, Windows Credential Manager, Secret Service),
// never in settings.json. GOTTHARD_<ACCOUNT>_KEY env vars override for CI / evals.
import { Entry } from "@napi-rs/keyring"

const SERVICE = "ch.gotthard.app"

export function getSecret(account) {
  const env = process.env[`GOTTHARD_${account.toUpperCase()}_KEY`]
  if (env) return env
  try {
    return new Entry(SERVICE, account).getPassword() ?? ""
  } catch {
    return ""
  }
}

export function setSecret(account, value) {
  const e = new Entry(SERVICE, account)
  if (value) e.setPassword(value)
  else {
    try {
      e.deletePassword()
    } catch {
      // nothing stored
    }
  }
}
