export const INFOMANIAK_BASE = (productId) => `https://api.infomaniak.com/2/ai/${productId}/openai/v1`
export const OLLAMA_BASE = "http://127.0.0.1:11434"
const ZEN_MODELS_URL = "https://opencode.ai/zen/v1/models"

export const PROVIDERS = {
  zen: {
    label: "OpenCode Zen",
    swiss: false,
    note: "Test phase only – models hosted outside Switzerland. Free models work without an account.",
    recommended: ["kimi-k2.6", "qwen3.6-plus", "glm-5.3", "deepseek-v4-pro", "glm-5.3-flash-free"],
    recommendedSmall: ["glm-5.3-flash-free", "deepseek-v4.1-flash-free", "big-pickle"],
  },
  infomaniak: {
    label: "Infomaniak AI (Genf, CH)",
    swiss: true,
    note: "Recommended for production: Swiss-hosted, data processed in Geneva.",
    recommended: ["moonshotai/Kimi-K2.6", "Qwen/Qwen3.5-397B-A17B-FP8", "Qwen/Qwen3.5-122B-A10B-FP8", "mistralai/Mistral-Small-4-119B-2603"],
    recommendedSmall: ["mistralai/Ministral-3-14B-Instruct-2512", "mistralai/Mistral-Small-4-119B-2603"],
    embed: "bge_multilingual_gemma2",
  },
  ollama: {
    label: "Ollama (lokal, Fortgeschrittene)",
    swiss: true,
    note: "Fully local. Needs a strong machine; small models are unreliable for multi-step tasks.",
    recommended: [],
    recommendedSmall: [],
    embed: "bge-m3",
  },
  custom: {
    label: "Custom OpenAI-compatible endpoint",
    swiss: null,
    note: "Any OpenAI-compatible API (e.g. AlpineAI, a self-hosted vLLM).",
    recommended: [],
    recommendedSmall: [],
  },
}

async function getJSON(url, key, timeoutMs = 15000) {
  const headers = { Accept: "application/json" }
  if (key) headers.Authorization = `Bearer ${key}`
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status} from ${new URL(url).host}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

export function baseURL(p) {
  if (p.kind === "infomaniak") return p.baseURL || INFOMANIAK_BASE(p.productId)
  if (p.kind === "ollama") return `${p.baseURL || OLLAMA_BASE}/v1`
  if (p.kind === "custom") return p.baseURL.replace(/\/+$/, "")
  return "https://opencode.ai/zen/v1"
}

export async function listModels(p, key) {
  if (p.kind === "zen") {
    const data = await getJSON(ZEN_MODELS_URL)
    const ids = data.data.map((m) => m.id).filter((id) => id !== "test")
    const usable = key ? ids : ids.filter((id) => id.endsWith("-free") || id === "big-pickle")
    return usable.map((id) => ({ id, note: id.endsWith("-free") || id === "big-pickle" ? "free" : "" }))
  }
  if (p.kind === "ollama") {
    const data = await getJSON(`${p.baseURL || OLLAMA_BASE}/api/tags`, null, 3000)
    return data.models.map((m) => {
      const size = parseFloat(m.details?.parameter_size || "0")
      return { id: m.name, note: size && size < 14 ? `${m.details.parameter_size} – small, expect unreliable results` : m.details?.parameter_size || "" }
    })
  }
  const data = await getJSON(`${baseURL(p)}/models`, key)
  const list = data.data || data.models || []
  return list.map((m) => ({ id: m.id || m.name, note: "" }))
}

export async function ollamaRunning() {
  try {
    await getJSON(`${OLLAMA_BASE}/api/tags`, null, 1500)
    return true
  } catch {
    return false
  }
}

export function embedConfig(p, key) {
  if (p.kind === "zen") return null
  const model = p.embedModel || PROVIDERS[p.kind].embed
  if (!model) return null
  return { baseURL: baseURL(p), model, key: key || "" }
}

export function engineProvider(p, key, prices = {}) {
  if (p.kind === "zen") {
    return {
      id: "opencode",
      config: key ? { opencode: { options: { apiKey: "{env:GOTTHARD_ENGINE_KEY}" } } } : {},
      model: `opencode/${p.model}`,
      smallModel: `opencode/${p.smallModel || p.model}`,
    }
  }
  const id = p.kind === "infomaniak" ? "infomaniak" : p.kind === "ollama" ? "ollama" : "custom"
  const ids = [...new Set([p.model, p.smallModel, ...(p.models || [])].filter(Boolean))]
  const models = {}
  for (const m of ids) {
    models[m] = {
      name: m,
      tool_call: true,
      limit: { context: 128000, output: 16384 },
      ...(prices[m] ? { cost: { input: prices[m].input, output: prices[m].output } } : {}),
    }
  }
  return {
    id,
    config: {
      [id]: {
        npm: "@ai-sdk/openai-compatible",
        name: PROVIDERS[p.kind].label,
        options: { baseURL: baseURL(p), ...(key ? { apiKey: "{env:GOTTHARD_ENGINE_KEY}" } : { apiKey: "none" }) },
        models,
      },
    },
    model: `${id}/${p.model}`,
    smallModel: `${id}/${p.smallModel || p.model}`,
  }
}
