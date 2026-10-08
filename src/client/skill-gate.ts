/**
 * Browser-side skill activation state for the health rail.
 *
 * The rail always lists every skill; this module tracks which ones the user
 * activated *in this page*, so the Host can narrow what it advertises to the
 * model. The set lives here rather than on the Host on purpose: a page reload
 * starts from nothing, which is the agreed behavior (刷新即清空). The Host keeps
 * a mirror it reads per session; we push the whole set on every change, so a
 * reloaded page converges that mirror back to empty on its first interaction.
 *
 * A skill activated here is a *catalog* fact — the model may discover and call
 * it. It never restricts the user's own `/name` gesture, which the Host gates
 * separately through `userInvocable`.
 *
 * Every call goes through {@link API_BASE}, the one place the plug-in's Host
 * routes are named. The prefix is the package name, so it is derived from the
 * plugin's own row rather than from any deployment-specific mount point; a
 * host that mounts the web server under a sub-path would need {@link API_BASE}
 * to grow a prefix, and this constant is the only line to change.
 */

/** Base path of this plugin's Host routes (see the host half's `installRoutes`). */
export const API_BASE = '/api/dsh-science-skill'

/** Session id → activated skill names (model-facing commands, no leading `/`). */
const activation = new Map<string, Set<string>>()

/** Read the activation set for one session; absent means "nothing activated". */
export function activatedSkills(sessionId: string): ReadonlySet<string> {
  return activation.get(sessionId) ?? new Set<string>()
}

/**
 * Publish one session's whole activation set to the Host.
 *
 * Push-what-we-have, not add/remove: the Host stores exactly this list, so a
 * reloaded page (which starts empty) corrects a stale mirror by its next push.
 * @param sessionId - Session whose set is published.
 */
async function publishSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/skill-gate/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ sessionId, names: [...activatedSkills(sessionId)] }),
    })
  } catch {
    // Activation narrows the catalog; a failed push leaves the model with the
    // Host's previous answer rather than blocking the gesture the user made.
  }
}

/**
 * Activate one skill for a session and publish the new set.
 * @param sessionId - Session the rail inserted into.
 * @param name - Model-facing skill command (the catalog `invoke` without `/`).
 */
export function activateSkill(sessionId: string, name: string): void {
  const current = activation.get(sessionId)
  if (current === undefined) activation.set(sessionId, new Set([name]))
  else current.add(name)
  void publishSession(sessionId)
}

/**
 * Deactivate one skill for a session and publish the new set.
 * @param sessionId - Session whose activation is narrowed.
 * @param name - Model-facing skill command.
 */
export function deactivateSkill(sessionId: string, name: string): void {
  const current = activation.get(sessionId)
  if (current === undefined || !current.delete(name)) return
  void publishSession(sessionId)
}

/** Whether one skill is activated for a session in this page. */
export function isSkillActivated(sessionId: string, name: string): boolean {
  return activation.get(sessionId)?.has(name) ?? false
}

/** Read the global toggle set (设置 → Skill) from the Host. */
export async function readPinnedSkills(): Promise<ReadonlySet<string>> {
  try {
    const res = await fetch(`${API_BASE}/skill-gate/state`, { cache: 'no-store' })
    const data = await res.json() as { ok?: boolean; pinned?: unknown }
    return new Set(Array.isArray(data?.pinned) ? data.pinned.filter((n): n is string => typeof n === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

/**
 * Write one global toggle; the Host persists it in the data root.
 * @param name - Model-facing skill command.
 * @param enabled - Whether the skill stays activated in every session.
 * @returns whether the Host confirmed the new value.
 */
export async function setPinnedSkill(name: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/skill-gate/pin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ name, enabled }),
    })
    const data = await res.json() as { ok?: boolean; enabled?: boolean }
    return data?.ok === true && data.enabled === enabled
  } catch {
    return false
  }
}
