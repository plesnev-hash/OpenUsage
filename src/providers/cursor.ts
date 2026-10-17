// Modified from OpenUsage 1.0.1 (https://github.com/paulocarinhena/OpenUsage), Apache-2.0.
// Cursor meters are the two plan pools, not the blended cycle or the bonus ledger. See FORK.md.
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import {
  clampPct,
  getJson,
  jwtPayload,
  ProviderError,
  sqliteGet,
  toMillis,
  type Provider,
  type ProviderUsage,
  type UsageExtra,
  type UsageWindow,
} from "./types.ts"

function dbPath() {
  const rel = ["Cursor", "User", "globalStorage", "state.vscdb"]
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), ...rel)
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", ...rel)
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), ...rel)
}

/** Reads one value from Cursor's VS Code state DB. */
async function readStateValue(key: string): Promise<string | undefined> {
  const path = dbPath()
  if (!existsSync(path)) throw new ProviderError("Cursor is not installed")
  const v = (await sqliteGet(path, "SELECT value FROM ItemTable WHERE key = ?", key))?.value
  if (v == null) return undefined
  const s = typeof v === "string" ? v : new TextDecoder().decode(v as Uint8Array)
  return s.startsWith('"') ? JSON.parse(s) : s
}

function jwtSubject(jwt: string): string | undefined {
  const sub = String(jwtPayload(jwt)?.sub ?? "")
  return sub.includes("|") ? sub.split("|").pop() : sub || undefined
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`

export const cursor: Provider = {
  id: "cursor",
  name: "Cursor",
  async fetch(signal) {
    const token = await readStateValue("cursorAuth/accessToken")
    if (!token) throw new ProviderError("not signed in to Cursor")
    const user = jwtSubject(token)
    if (!user) throw new ProviderError("unrecognized Cursor token")
    const body = await getJson(
      "https://cursor.com/api/usage-summary",
      {
        signal,
        headers: {
          Cookie: `WorkosCursorSessionToken=${user}%3A%3A${token}`,
          Accept: "application/json",
          Origin: "https://cursor.com",
          Referer: "https://cursor.com/dashboard",
        },
      },
      "Cursor",
    )

    const windows: UsageWindow[] = []
    const extras: UsageExtra[] = []
    const resetsAt = toMillis(body?.billingCycleEnd)
    const plan = body?.individualUsage?.plan
    if (plan?.enabled !== false && plan) {
      // autoPercentUsed is how much of the Cursor-model limit is already spent
      // (Grok, Composer). apiPercentUsed is the other-model pool. The plan's
      // cent totals and breakdown.bonus are a different ledger and must not
      // be drawn as those two bars.
      const hasModelPools = typeof plan.autoPercentUsed === "number" || typeof plan.apiPercentUsed === "number"
      if (hasModelPools) {
        if (typeof plan.autoPercentUsed === "number")
          windows.push({ label: "Limits", usedPct: clampPct(plan.autoPercentUsed), resetsAt })
        if (typeof plan.apiPercentUsed === "number")
          windows.push({ label: "Other models", usedPct: clampPct(plan.apiPercentUsed), resetsAt })
      } else if (typeof plan.totalPercentUsed === "number") {
        windows.push({ label: "Billing Cycle", usedPct: clampPct(plan.totalPercentUsed), resetsAt })
      }
    }
    const onDemand = body?.individualUsage?.onDemand
    if (onDemand?.enabled && typeof onDemand.used === "number") {
      const value = onDemand.limit ? `${dollars(onDemand.used)} / ${dollars(onDemand.limit)}` : dollars(onDemand.used)
      extras.push({ label: "On-Demand", value })
    }
    if (!windows.length && !extras.length) throw new ProviderError("Cursor: no usage data")
    return {
      id: "cursor",
      name: "Cursor",
      plan: body?.membershipType,
      windows,
      extras,
      fetchedAt: Date.now(),
    } satisfies ProviderUsage
  },
  account: () => readStateValue("cursorAuth/cachedEmail"),
  detect: async () => existsSync(dbPath()),
}
