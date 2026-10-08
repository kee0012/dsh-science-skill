// src/host/lib/skill-provider.mjs
// Publish the user's chosen skill directory to the harness's own skill registry.
//
// Why this exists: the panel's skill set comes from the directory the user picks
// in the settings panel, but the harness discovers skills from its own roots
// (`<project>/.agents/skills`, the data root's `skills`, the agents home, and any
// configured `customSkillDirs`) — the directory the user picked is not one of
// them. Without a provider of our own the panel lists skills the model can never
// load: the `/命令` a card inserts resolves to nothing, and every Chinese name,
// category and example we generate describes a skill nobody can invoke. Asking
// the user to hand-edit their profile is not an answer for a plugin that ships.
//
// The registry is `@deepseek-ai/dsh-skill`; `@deepseek-ai/dsh-skill-filesystem`
// is the reference provider this one mirrors. Both were read from the shipped
// runtime, and the shapes below are copied from there rather than guessed:
// `registerProvider(create)` calls `create(control)` synchronously and expects a
// `{ name, list(options), get(candidate, options) }` back; `list` answers
// candidates carrying `name` / `description` / `invocation` / `source` / `rank` /
// `provider` (which must equal the provider's own name), and `get` answers the
// full definition with `content` and a `resourceBase`.

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { SKILL_FILENAME, readSkillMarkdown, diagnoseSkillDir } from './skill-acceptance.mjs'
import { defaultImportDir } from './import-settings.mjs'

/**
 * Provider name. Must be unique inside the registry's per-context layer — a
 * duplicate throws out of `registerProvider` — and must not be `runtime`, which
 * the registry reserves.
 */
export const PROVIDER_NAME = 'science-skill-directory'

/**
 * Precedence for a directory the user selected on purpose.
 *
 * The registry sorts candidates by ascending `rank`, so a smaller number wins.
 * The reference provider's own scale is project 100/200, custom 300, user
 * 400/500, bundled 600. This directory is exactly a "custom" root — the user
 * pointed at it — so it takes the same 300:
 *
 *  - **above** the ambient user roots, because otherwise a skill that exists in
 *    both places would render from one copy in the panel and load from the other
 *    in the model, and the panel is the surface the user chose it from;
 *  - **below** the project roots, because a workspace-scoped skill is the more
 *    specific answer for work happening in that workspace.
 *
 * A tie at 300 is broken by registration order, which the registry gives to
 * whichever provider registered first — that is the filesystem provider, so a
 * `customSkillDirs` entry still wins a tie. That is deliberate: an explicit
 * profile configuration outranks a directory chosen inside one plugin.
 */
export const USER_SELECTED_RANK = 300

/** The `source` label the reference provider uses for a user-configured root. */
const SOURCE = 'custom'

/**
 * A skill is invocable both ways unless its own frontmatter says otherwise.
 *
 * The registry reads `invocation.modelInvocable` directly, so the policy object
 * is required on every candidate and every definition — `undefined` passes the
 * registry's own validation and then throws at the first consumer.
 */
const INVOCATION = Object.freeze({ modelInvocable: true, userInvocable: true })

/**
 * Strip the frontmatter fence, leaving the body the model reads.
 *
 * Mirrors the reference provider, which stores `parsed.body.trim()`: the
 * frontmatter is metadata the registry already carries as separate fields, and
 * feeding it back to the model would duplicate every description.
 * @param text - the whole `SKILL.md`.
 * @returns the body, trimmed.
 */
function bodyOf(text) {
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/)
  return (match === null ? text : text.slice(match[0].length)).trim()
}

/**
 * Discover the skill folders directly under one directory.
 *
 * Validation is `diagnoseSkillDir` — the very function the panel's catalog
 * adopts with, so the model's view and the panel's view can never disagree about
 * which folders count as skills. That matters more than tolerance: a folder the
 * panel shows but the registry skips is precisely the bug this module exists to
 * fix, in the other direction.
 * @param dir - absolute skill directory.
 * @returns candidates, one per loadable skill.
 */
function discover(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    // A directory the user has not created yet (or cannot read) is empty, not an
    // error: the registry would only log the throw and drop the provider.
    return []
  }
  const candidates = []
  for (const entry of entries) {
    // Dot-prefixed children are import residue (`.x.import`, `.x.old-<ts>`), the
    // same rule the panel's adoption applies.
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const skillDir = join(dir, entry.name)
    const verdict = diagnoseSkillDir(skillDir)
    if (verdict.ok !== true) continue
    const file = join(skillDir, SKILL_FILENAME)
    candidates.push({
      name: verdict.name,
      description: verdict.description,
      invocation: { ...INVOCATION },
      source: SOURCE,
      provider: PROVIDER_NAME,
      rank: USER_SELECTED_RANK,
      locator: { dir: skillDir, file },
      resourceBase: { kind: 'directory', path: skillDir },
      path: file,
    })
  }
  return candidates
}

/**
 * Build the provider `ctx.skills.registerProvider` expects.
 *
 * The directory is read **on every call** rather than captured at construction:
 * the user changes it from the settings panel while the plugin is live, and
 * re-registering to follow that would mean guessing at a duplicate-name throw
 * (the registry rejects a second provider under one name). Reading fresh makes
 * the setting itself the single source of truth, and the only thing a change
 * still needs is a cache invalidation, which {@link registerSkillProvider}
 * hands back as `invalidate()`.
 *
 * For the same reason the provider is registered even when **no** directory is
 * configured yet — it just publishes nothing. Skipping registration until a
 * directory exists would mean registering later, at settings-change time, which
 * is exactly the re-registration the paragraph above avoids; and the first time
 * a user picks a folder is the worst moment to discover a name collision.
 * @param root - data root, where `skill-import.json` lives.
 * @returns the provider object.
 */
export function createDirectorySkillProvider(root) {
  return {
    name: PROVIDER_NAME,
    /** @returns candidates for the currently configured directory. */
    async list() {
      const dir = defaultImportDir(root)
      return dir === '' ? [] : discover(dir)
    },
    /**
     * Read one skill's body.
     * @param candidate - a candidate this provider answered with.
     * @returns the definition, or `undefined` when the file has gone.
     */
    async get(candidate) {
      const locator = candidate?.locator
      if (locator === undefined || typeof locator.dir !== 'string') return undefined
      const read = readSkillMarkdown(locator.dir)
      if (read.error !== undefined) return undefined
      return {
        name: candidate.name,
        description: candidate.description,
        invocation: { ...INVOCATION },
        source: SOURCE,
        provider: PROVIDER_NAME,
        resourceBase: { kind: 'directory', path: locator.dir },
        path: read.path,
        content: bodyOf(read.text),
      }
    },
  }
}

/**
 * Register the provider on a harness that has a skill registry, and answer
 * nothing on one that does not.
 *
 * The seat is read with `ctx.get` instead of being declared in `inject`, and the
 * reason is the same one recorded for the `skillGate` seat: cordis seats only
 * what a plugin declares, so declaring `skills` would make this plugin wait for a
 * service an older or non-skill harness never provides — and the whole plugin
 * would fail to activate for the sake of one optional capability.
 *
 * Teardown is owned here even though `registerProvider` returns a disposer. The
 * registry hands its own context to the effect it creates, so that effect dies
 * with the registry rather than with this plugin; hanging the disposer on this
 * plugin's effect is what stops a dead provider from being left behind on
 * unload. The guard makes a late double-call a no-op.
 * @param ctx - host plugin context.
 * @param root - data root.
 * @param log - logger for the skip diagnostic.
 * @returns `{ invalidate }` when registered, `undefined` when the harness has no
 *   skill registry.
 */
export function registerSkillProvider(ctx, root, log) {
  let registry
  try {
    registry = ctx.get('skills')
  } catch {
    registry = undefined
  }
  if (registry === undefined || typeof registry?.registerProvider !== 'function') {
    log('no skill registry in this harness — panel-only mode, skills are not model-invocable')
    return undefined
  }

  let control
  let released = false
  let disposer
  try {
    disposer = registry.registerProvider((received) => {
      control = received
      return createDirectorySkillProvider(root)
    })
  } catch (error) {
    log(`skill provider registration failed: ${error?.message ?? error}`)
    return undefined
  }

  const release = () => {
    if (released) return
    released = true
    try {
      disposer()
    } catch (error) {
      // A registry that already tore the provider down is not an error here.
      log(`skill provider disposal failed: ${error?.message ?? error}`)
    }
  }
  if (typeof ctx.effect === 'function') ctx.effect(() => release, 'dsh-science-skill: skill provider')

  return {
    /**
     * Drop the registry's cached catalog.
     *
     * Called after the default directory changes: `list()` already reads the new
     * value, but the registry answers from a cache until something invalidates
     * it, so without this the model keeps the previous directory's skills until
     * an unrelated change happens to clear it.
     */
    invalidate() {
      try {
        control?.invalidate()
      } catch (error) {
        log(`skill catalog invalidation failed: ${error?.message ?? error}`)
      }
    },
  }
}
