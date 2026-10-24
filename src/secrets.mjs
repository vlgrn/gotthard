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
    }
  }
}
