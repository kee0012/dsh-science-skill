/**
 * DeepSeek Harness plugin: 科研技能中心 (science skill center).
 *
 * The host half owns everything the settings page and the sidebar rail read:
 * the catalog records (one JSON file per skill), the category list, the
 * directory importer, and the activation gate that decides which skills the
 * model may discover in a session. The browser half
 * (`dsh-science-skill/client`) renders the same data through the host's own
 * slots.
 *
 * Design notes worth keeping:
 *  - This package is a cordis *function* plugin: it default-exports nothing and
 *    named-exports `name` / `inject` / `apply`.
 *  - It must not import another harness plugin's runtime values. The only
 *    optional services it reads are `webServer`, the agent default model and the
 *    profile context, all through `ctx.get`, so it also loads on a harness that
 *    has none of them.
 *  - The host's skill provider is the source of truth for *what* skills exist;
 *    this plugin only makes them visible and addressable, so a skill folder it
 *    never touched still shows up.
 *
 * @module dsh-science-skill
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { categoryDisplayMap, rebuildCatalogIndex } from './lib/catalog-runtime.mjs'
import {
  CATEGORY_ICON_PATHS,
  createCategory,
  DEFAULT_CATEGORY_ICON,
  deleteCategory,
  ensureCategories,
  extractIconAndLabel,
  reorderCategories,
  restoreDefaultCategories,
  suggestIconForLabel,
  updateCategory,
} from './lib/categories-runtime.mjs'
import { readImportSettings, writeImportSettings } from './lib/import-settings.mjs'
import { FALLBACK_CATEGORY as NAMING_FALLBACK_CATEGORY, nameSkill } from './lib/skill-naming.mjs'
import {
  adoptUnregisteredSkills,
  deleteSkill,
  guessCategory,
  importSkillDir,
  listLegacyBackups,
  pendingImportNotes,
  recordDirName,
  removeLegacyBackups,
  updateSkillRecord,
} from './lib/skills-runtime.mjs'
import { SKILL_FILENAME, SKILL_NAME, diagnoseSkillDir } from './lib/skill-acceptance.mjs'
import { registerSkillProvider } from './lib/skill-provider.mjs'
import { userSkillRoots } from './lib/skill-roots.mjs'
import { bundledSchemaPath, resolveDataRoot, rootPaths } from './root.mjs'

const here = dirname(fileURLToPath(import.meta.url))

/** The data-root category a record falls back to when its category is removed. */
const REMOVED_CATEGORY_FALLBACK = 'literature'

/**
 * Longest SKILL.md body the detail route returns.
 *
 * The panel only renders a preview, and a skill's markdown is prose — but
 * "prose" here can be a bundled reference document of several hundred kilobytes,
 * and a JSON response that size would stall the panel for a file nobody asked to
 * read in full. Over the cap the body is cut and the response says so.
 */
const MAX_MARKDOWN_CHARS = 20000

/**
 * The plugin id. Cordis keeps this on the fiber for diagnostics, so it is the
 * package name rather than a nickname; nothing injects by this string.
 */
export const name = 'dsh-science-skill'

/** The web server is the only hard requirement; the rest of the host is optional. */
export const inject = ['webServer']

// Kept in step with `package.json`'s `version` by hand: the host half ships as
// plain ESM, so the number cannot be read from the manifest at import time.
export const VERSION = '2.0.0'

/**
 * Plugin configuration.
 * @typedef {object} Config
 * @property {boolean} [enabled] - switch the whole plugin off without removing it.
 * @property {string} [dataRoot] - catalog root; defaults to `$DSH_HOME`, then `~/.dsh`.
 * @property {string[]} [skillDirs] - extra skill directories to look for skills in.
 * @property {boolean} [naming] - let a model name newly imported skills in Chinese.
 */

/** @param {Config} config - raw plugin configuration. @returns {Required<Config>} */
export function normalizeConfig(config = {}) {
  return {
    enabled: config.enabled !== false,
    dataRoot: typeof config.dataRoot === 'string' ? config.dataRoot : '',
    skillDirs: Array.isArray(config.skillDirs) ? config.skillDirs.filter((entry) => typeof entry === 'string' && entry !== '') : [],
    naming: config.naming !== false,
  }
}

/**
 * @typedef {object} RouteRequest
 * @property {string} method
 * @property {string | undefined} url - request path including its query string.
 * @property {import('node:http').IncomingMessage} raw
 */

/**
 * @typedef {object} RouteResponse
 * @property {number} statusCode
 * @property {(chunk: string) => void} write
 * @property {() => void} end
 * @property {(name: string, value: string) => void} [setHeader]
 */

/**
 * @typedef {object} WebServerLike
 * @property {(route: { kind?: 'exact' | 'prefix', path: string, handler: (req: RouteRequest, res: RouteResponse) => void }) => () => void} register
 */

/**
 * Write a response, never letting a client that walked away crash the host.
 * @param {RouteResponse} res - response sink.
 * @param {number} status - HTTP status.
 * @param {string} body - response body.
 * @param {string} type - content type.
 */
function send(res, status, body, type) {
  try {
    res.statusCode = status
    res.setHeader?.('content-type', type)
    res.write(body)
    res.end()
  } catch {
    // A response torn down mid-write (reload, aborted fetch) is not an error
    // worth failing the process over.
  }
}

/**
 * @param {RouteResponse} res - response sink.
 * @param {number} status - HTTP status.
 * @param {unknown} payload - JSON-serializable value.
 */
function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), 'application/json; charset=utf-8')
}

/** @param {unknown} error - thrown value. @returns {string} its message. */
function message(error) {
  return error instanceof Error ? error.message : String(error)
}

/** @param {RouteResponse} res - response sink. */
function noDataRoot(res) {
  sendJson(res, 400, { ok: false, error: 'no current data root (DSH_HOME unset)' })
}

/**
 * Read and parse a JSON request body, then hand it to `onPayload`.
 *
 * The route handler runs inside the web server's own emitter, so an exception
 * escaping it is a process-level failure: parsing and the payload callback are
 * both contained here.
 * @param {import('node:http').IncomingMessage} req - raw request.
 * @param {RouteResponse} res - response sink.
 * @param {(payload: any) => void} onPayload - called once with the parsed payload.
 */
function readJsonBody(req, res, onPayload) {
  const chunks = []
  let size = 0
  let settled = false
  const answer = (status, payload) => {
    if (settled) return
    settled = true
    sendJson(res, status, payload)
  }
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > 4 * 1024 * 1024) {
      answer(413, { ok: false, error: 'body too large' })
      req.destroy?.()
      return
    }
    chunks.push(chunk)
  })
  req.on('error', (error) => answer(400, { ok: false, error: message(error) }))
  req.on('end', () => {
    if (settled) return
    settled = true
    let payload
    try {
      const text = Buffer.concat(chunks).toString('utf8')
      payload = text.trim() === '' ? {} : JSON.parse(text)
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid JSON body' })
      return
    }
    try {
      onPayload(payload)
    } catch (error) {
      sendJson(res, 500, { ok: false, error: message(error) })
    }
  })
}

/**
 * The activation gate, plus the file and in-memory state behind it.
 *
 * Which skills a session may discover is a kernel decision, so the policy
 * stays a seat-shaped object instead of being patched into the skill tool: a
 * kernel that reads a `skillGate` seat — or a science workbench that publishes
 * one over the same file — decides, and a harness that never asks keeps its
 * stock behaviour (every model-invocable skill is visible). This plugin does
 * not publish the seat itself; see `apply` for why, and {@link SkillGateServer}
 * for what a provider would answer. Membership is the pinned set — persisted
 * on the data root so it survives a reload — plus whatever the page activated
 * for this session, which is intentionally dropped when the host restarts.
 * @param {string} gatePath - `<root>/skill-gate.json`.
 * @param {(message: string) => void} log - log sink.
 * @typedef {object} SkillGateServer
 * @property {{ isActive: (session: { id?: string } | undefined, skillName: string) => boolean }} service - the face a provider publishes.
 * @property {() => Set<string>} read - the pinned set, re-read from disk.
 * @property {(names: Set<string>) => boolean} persist - write the pinned set.
 * @property {(sessionId: string) => Set<string>} activeFor - one session's activation mirror.
 * @property {(sessionId: string, names: string[]) => void} setActive - replace one session's mirror.
 */
function createSkillGate(gatePath, log) {
  /** @type {Set<string>} */
  let pinned = new Set()
  /** @type {Map<string, Set<string>>} */
  const sessions = new Map()

  /** @returns {Set<string>} pinned names, re-read from disk and cached. */
  function read() {
    if (!existsSync(gatePath)) {
      pinned = new Set()
      return pinned
    }
    try {
      const entries = JSON.parse(readFileSync(gatePath, 'utf8'))?.pinned ?? {}
      pinned = new Set(Object.keys(entries).filter((key) => entries[key] === true))
    } catch (error) {
      // A corrupt gate file must not remove the model's whole skill catalog.
      log(`skill-gate.json unreadable, treating every skill as unpinned: ${message(error)}`)
      pinned = new Set()
    }
    return pinned
  }

  /** @param {Set<string>} names - the pinned set to persist. @returns {boolean} */
  function persist(names) {
    pinned = names
    try {
      const on = {}
      for (const key of [...names].sort()) on[key] = true
      mkdirSync(dirname(gatePath), { recursive: true })
      writeFileSync(gatePath, JSON.stringify({ pinned: on }, null, 2) + '\n')
      return true
    } catch (error) {
      log(`failed to persist skill-gate.json: ${message(error)}`)
      return false
    }
  }

  read()

  return {
    /** The service object handed to the kernel. */
    service: {
      /**
       * @param {{ id?: string } | undefined} session - session handle.
       * @param {string} skillName - skill name being considered.
       * @returns {boolean} whether the model may discover that skill now.
       */
      isActive(session, skillName) {
        if (pinned.has(skillName)) return true
        return sessions.get(String(session?.id ?? ''))?.has(skillName) ?? false
      },
    },
    read,
    persist,
    /** @param {string} sessionId - session id. @returns {Set<string>} */
    activeFor(sessionId) {
      return sessions.get(sessionId) ?? new Set()
    },
    /** @param {string} sessionId - session id. @param {string[]} names - activated names. */
    setActive(sessionId, names) {
      if (names.length === 0) sessions.delete(sessionId)
      else sessions.set(sessionId, new Set(names))
    },
  }
}

/**
 * Mount the science skill center.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {Config} [rawConfig] - plugin configuration.
 */
export function apply(ctx, rawConfig = {}) {
  const config = normalizeConfig(rawConfig)
  if (!config.enabled) return

  const root = resolveDataRoot(config.dataRoot)
  if (root === '') {
    ctx.logger?.warn?.('science-skill: no data root resolved — the skill center is inert')
    return
  }
  const paths = rootPaths(root, config.skillDirs)
  // The schema sits next to this entry point, so the same relative path holds
  // both in the source tree and in the published `lib/` copy.
  const bundledSchema = bundledSchemaPath(join(here, 'schema', 'catalog.schema.json'))
  /** @param {string} text - log line. */
  const log = (text) => ctx.logger?.info?.(`science-skill: ${text}`)

  // The catalog builder refuses to write an index whose records have no skill
  // folder behind them, so every folder the host would load needs its record
  // before anything reads the catalog. Adoption only ever *adds* records.
  try {
    ensureCategories(root)
    const adopted = adoptUnregisteredSkills(root)
    const built = rebuildCatalogIndex(root, bundledSchema)
    if (!built.ok) log(`catalog rebuild skipped: ${built.error}`)
    for (const entry of adopted.skipped) log(`skill "${entry.id}" not adopted: ${entry.error}`)
    if (adopted.adopted.length > 0) log(`adopted ${adopted.adopted.length} skill folder(s) with no catalog record`)
  } catch (error) {
    log(`startup catalog refresh failed: ${message(error)}`)
  }

  // Publish the user's chosen directory to the harness's own skill registry, so
  // the skills this panel lists are the skills the model can actually load. The
  // seat is optional: a harness without it keeps the panel and reports the skip.
  const skillProvider = registerSkillProvider(ctx, root, log)

  const gate = createSkillGate(paths.gatePath, log)
  // The `skillGate` seat is deliberately left alone.
  //
  // Cordis keeps a service name unique per isolate (`service "${name}" has
  // been registered at <fiber>` — @deepseek-ai/cordis/lib/index.js:813), and
  // the guard has to be mutual: a plugin that publishes a seat another plugin
  // also publishes makes *that* plugin throw out of its own `apply`. A Science
  // Agent build's workbench owns this seat, publishes it unguarded, and losing
  // the race takes the whole workbench down with it — catalog, `/science/api`,
  // the rail. A `try/catch` here cannot prevent that, because the throw happens
  // inside *their* `apply`.
  //
  // Publishing it would buy nothing anyway: nothing in the shipped harness
  // reads `skillGate` (`grep -r skillGate` over the runtime finds only that one
  // provider), and where a kernel does read the seat, its provider answers from
  // the same `<root>/skill-gate.json` these routes write. The gate below is
  // therefore private to the routes: the pin toggles still land in the file a
  // real provider reads, and a machine with no provider at all keeps the stock
  // behaviour (every model-invocable skill advertised).
  installRoutes(ctx, { root, paths, bundledSchema, config, log, gate, skillProvider })
}

/**
 * Register every HTTP route the browser half talks to.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {{ root: string, paths: ReturnType<typeof rootPaths>, bundledSchema: string | undefined, config: Required<Config>, log: (text: string) => void, gate: ReturnType<typeof createSkillGate>, skillProvider: ReturnType<typeof registerSkillProvider> }} options - wiring.
 */
function installRoutes(ctx, options) {
  const { root, paths, bundledSchema, config, log, gate, skillProvider } = options
  /** @type {WebServerLike | undefined} */
  const webServer = /** @type {any} */ (ctx.get('webServer'))
  if (webServer === undefined || typeof webServer.register !== 'function') {
    log('no web server service — skill routes are not mounted')
    return
  }

  /** @param {unknown} value - candidate. @returns {boolean} */
  const isBlank = (value) => typeof value !== 'string' || value.trim() === ''

  /**
   * Resolve an icon request against the icon table.
   * @param {unknown} requested - icon name from the payload.
   * @param {string} label - category label the icon belongs to.
   * @returns {string} a known icon name.
   */
  function resolveIcon(requested, label) {
    if (typeof requested === 'string' && Object.hasOwn(CATEGORY_ICON_PATHS, requested)) return requested
    return suggestIconForLabel(label) ?? DEFAULT_CATEGORY_ICON
  }

  /** @returns {{ all: any[], builtin: any[], custom: any[] }} */
  function listCategories() {
    const all = ensureCategories(root)
    return { all, builtin: all.filter((entry) => !entry.custom), custom: all.filter((entry) => entry.custom) }
  }

  /**
   * @param {string} id - skill id.
   * @returns {any | undefined} its catalog record.
   */
  function readRecord(id) {
    try {
      return JSON.parse(readFileSync(join(paths.dataDir, `${id}.json`), 'utf8'))
    } catch {
      return undefined
    }
  }

  /** @param {string} id - skill id. @returns {string} its display name. */
  function readRecordName(id) {
    return readRecord(id)?.name ?? id
  }

  /**
   * Read a skill's SKILL.md out of whichever scan root holds it.
   *
   * The id arrives from a query string, so it is validated as a bare skill
   * identifier before it is joined to anything, and the resulting file is then
   * checked to sit inside the root it was found under. The name check alone
   * would be enough for the ids this plugin writes, but the containment test is
   * what makes the guarantee hold for a root that is itself a symlink or a
   * junction, where a path that looks contained can resolve somewhere else.
   *
   * The folder is not necessarily the id: a skill adopted from a folder the user
   * copied in by hand keeps its record under the frontmatter name and its folder
   * under its own (`dir_name`), so the record is asked where the SKILL.md is.
   * `recordDirName` re-checks that value as one path segment, which is what keeps
   * a record file from widening this lookup.
   * @param id - validated skill id.
   * @returns `{ markdown, truncated }`; an empty body when no root holds it.
   */
  function locateSkillFile(id) {
    // Read the roots fresh rather than taking `paths.skillRoots`: that snapshot
    // is taken at apply time, so it would keep pointing at the harness roots
    // after the user picks a default directory, and every skill in the folder
    // they just chose would answer with an empty body.
    const folder = recordDirName(readRecord(id), id)
    for (const skillRoot of userSkillRoots(root, config.skillDirs)) {
      const base = resolve(skillRoot)
      const file = resolve(join(base, folder, SKILL_FILENAME))
      if (file !== base && !file.startsWith(base.endsWith(sep) ? base : base + sep)) continue
      let text
      try {
        text = readFileSync(file, 'utf8')
      } catch {
        // The record can outlive its folder when a user moves skills around;
        // the next root may still hold it.
        continue
      }
      if (text.length > MAX_MARKDOWN_CHARS) {
        return { markdown: text.slice(0, MAX_MARKDOWN_CHARS), truncated: true }
      }
      return { markdown: text, truncated: false }
    }
    return { markdown: '', truncated: false }
  }

  /**
   * The model that should name imported skills, if the host has one.
   * @returns {{ provider?: string, model?: string } | undefined}
   */
  function namingRuntimeTarget() {
    try {
      const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
      return selection === undefined ? undefined : { provider: selection.provider, model: selection.model }
    } catch {
      return undefined
    }
  }

  /** @returns {string[]} profile config files a naming call may write to. */
  function namingPatchPaths() {
    try {
      const path = ctx.get('profileContext')?.patchPath
      return typeof path === 'string' && path !== '' ? [path] : []
    } catch {
      return []
    }
  }

  /**
   * Write a naming result into a record, keeping the pre-naming wording.
   *
   * `display_source` is what the record showed before the model touched it, so
   * its presence also marks the record as named — which is what the backfill
   * queue reads to decide whether a record still needs a call.
   * @param {string} id - skill id.
   * @param {any} result - naming result.
   * @param {string} guessedCategory - category guessed before naming.
   */
  function applyNaming(id, result, guessedCategory) {
    const dataPath = join(paths.dataDir, `${id}.json`)
    try {
      const record = JSON.parse(readFileSync(dataPath, 'utf8'))
      const source = { ...(record.display_source ?? {}) }
      if (source.name === undefined) source.name = record.name
      if (source.summary === undefined) source.summary = record.summary
      if (typeof result?.name === 'string' && result.name.trim() !== '') record.name = result.name.trim()
      if (typeof result?.summary === 'string' && result.summary.trim() !== '') record.summary = result.summary.trim()
      if (typeof result?.category === 'string' && result.category.trim() !== '') record.category = result.category.trim()
      else if (isBlank(record.category)) record.category = guessedCategory ?? NAMING_FALLBACK_CATEGORY
      // Examples are the one field a call may legitimately come back without, so
      // an empty result must not wipe examples the record already carries; the
      // field is only normalized when it is missing or malformed.
      if (Array.isArray(result?.examples) && result.examples.length > 0) record.examples = result.examples
      else if (!Array.isArray(record.examples)) record.examples = []
      record.display_source = source
      writeFileSync(dataPath, JSON.stringify(record, null, 2) + '\n')
    } catch (error) {
      log(`failed to write the naming result for "${id}": ${message(error)}`)
    }
  }

  /**
   * Name one imported skill in Chinese, then refresh the catalog.
   *
   * Naming needs a chat model and the profile's config file. On a machine that
   * has neither, the skill keeps the English name it was imported with — the
   * import itself has already succeeded and stays successful.
   * @param {string} id - skill id.
   * @param {string} description - SKILL.md description.
   * @param {string} guessedCategory - category guessed from the description.
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  async function runNamingFor(id, description, guessedCategory) {
    if (!config.naming) return { ok: false, error: '自动命名已关闭' }
    const categoryOptions = listCategories().all.filter((entry) => entry.key !== 'internal')
    const result = await nameSkill(root, { skillId: id, description, categories: categoryOptions }, {
      target: namingRuntimeTarget(),
      patchPaths: namingPatchPaths(),
    })
    if (result?.ok !== true) return { ok: false, error: result?.error ?? '命名服务不可用' }
    applyNaming(id, result, guessedCategory)
    rebuildCatalogIndex(root, bundledSchema)
    return { ok: true }
  }

  /**
   * Chinese naming calls already in flight, by skill id, so a second refresh
   * cannot start a duplicate call for a record that is still waiting on one.
   */
  const namingInFlight = new Set()

  /**
   * How many naming calls may be in flight at once.
   *
   * One call per record would fire a model request for every un-named skill the
   * moment the user presses 刷新 — on a 166-skill library that is a burst that
   * gets rate-limited and billed all at once. A small lane count drains the same
   * backlog without it.
   */
  const NAMING_CONCURRENCY = 3

  /**
   * Start the model backfill for every record that is missing part of its
   * Chinese presentation: the name, the summary, the category, or the examples.
   *
   * Two markers say a record still needs a call, and either one alone is enough:
   *
   *  - `display_source` is written by the first successful naming call and keeps
   *    the wording from before it, so its absence is exactly "this record still
   *    shows the English name and summary it was found under";
   *  - `examples` is empty on every record adoption or import wrote, and on
   *    every record named before the prompt asked for examples at all. Those
   *    records have a Chinese name already, so keying on `display_source` alone
   *    would leave them permanently without examples — which is why a press of
   *    刷新 tops up a library that was named before this field existed.
   *
   * One call produces all four, so a record missing only its examples costs the
   * same one request as a record missing everything.
   *
   * The work drains in the background: the caller answers the panel at once, and
   * every id is marked in flight before the first request so a second press
   * cannot queue the same skill twice.
   * @returns the number of records queued.
   */
  function startNamingBackfill() {
    if (!config.naming) return 0
    let files
    try {
      files = readdirSync(paths.dataDir)
    } catch {
      return 0
    }
    const queued = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const id = file.slice(0, -'.json'.length)
      if (namingInFlight.has(id)) continue
      let record
      try {
        record = JSON.parse(readFileSync(join(paths.dataDir, file), 'utf8'))
      } catch {
        continue
      }
      const named = record?.display_source !== undefined
      const hasExamples = Array.isArray(record?.examples) && record.examples.length > 0
      if (named && hasExamples) continue
      queued.push({
        id,
        description: typeof record?.summary === 'string' ? record.summary : '',
        category: record?.category ?? NAMING_FALLBACK_CATEGORY,
      })
    }
    if (queued.length === 0) return 0
    for (const item of queued) namingInFlight.add(item.id)

    let cursor = 0
    const lane = async () => {
      while (cursor < queued.length) {
        const item = queued[cursor]
        cursor += 1
        try {
          const named = await runNamingFor(item.id, item.description, item.category)
          if (!named.ok) log(`naming for "${item.id}" skipped: ${named.error}`)
        } catch (error) {
          log(`naming for "${item.id}" failed: ${message(error)}`)
        } finally {
          namingInFlight.delete(item.id)
        }
      }
    }
    for (let laneIndex = 0; laneIndex < Math.min(NAMING_CONCURRENCY, queued.length); laneIndex += 1) {
      void lane()
    }
    return queued.length
  }

  /**
   * Rebuild the catalog and answer with the rebuild outcome.
   * @param {RouteResponse} res - response sink.
   * @param {boolean} ok - whether the caller's change succeeded.
   * @param {Record<string, unknown>} extra - additional payload fields.
   */
  function respondRebuilt(res, ok, extra = {}) {
    const built = rebuildCatalogIndex(root, bundledSchema)
    sendJson(res, ok ? 200 : 400, { ok, ...extra, ...(built.ok ? { catalogCount: built.count } : {}) })
  }

  // The route table is a value so the effect below stays one registration call.
  const prefixRoute = {
    kind: 'prefix',
    path: '/api/dsh-science-skill',
    handler: (req, res) => {
      let url
      try {
        url = new URL(String(req.url ?? '/'), 'http://localhost')
      } catch {
        send(res, 400, 'bad request', 'text/plain; charset=utf-8')
        return
      }
      const rel = url.pathname.replace(/^\/api\/dsh-science-skill\/?/, '')
      const method = String(req.method ?? 'GET').toUpperCase()

      // --- activation gate -------------------------------------------------
      if (rel === 'skill-gate/state') {
        const sessionId = url.searchParams.get('sessionId') ?? ''
        sendJson(res, 200, { ok: true, pinned: [...gate.read()], active: [...gate.activeFor(sessionId)] })
        return
      }
      if (rel === 'skill-gate/pin' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const skillName = payload?.name
          if (isBlank(skillName)) {
            sendJson(res, 400, { ok: false, error: 'name is required' })
            return
          }
          const pinned = gate.read()
          if (payload?.enabled === true) pinned.add(skillName)
          else pinned.delete(skillName)
          gate.persist(pinned)
          sendJson(res, 200, { ok: true, name: skillName, enabled: pinned.has(skillName), pinned: [...pinned] })
        })
        return
      }
      if (rel === 'skill-gate/session' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const sessionId = payload?.sessionId
          if (isBlank(sessionId)) {
            sendJson(res, 400, { ok: false, error: 'sessionId is required' })
            return
          }
          const names = Array.isArray(payload?.names) ? payload.names.filter((entry) => typeof entry === 'string' && entry !== '') : []
          gate.setActive(sessionId, names)
          sendJson(res, 200, { ok: true, sessionId, active: names })
        })
        return
      }

      if (rel === 'skill-gate/check') {
        // One answer for "may the model see this skill in this session",
        // whether it comes from the pin or from the session's own activation.
        const sessionId = url.searchParams.get('sessionId') ?? ''
        const name = url.searchParams.get('name') ?? ''
        if (isBlank(name)) {
          sendJson(res, 400, { ok: false, error: 'name is required' })
          return
        }
        sendJson(res, 200, { ok: true, name, sessionId, active: gate.service.isActive({ id: sessionId }, name) })
        return
      }

      // --- categories ------------------------------------------------------
      if (rel === 'categories') {
        sendJson(res, 200, { ok: true, categories: listCategories().all.map((entry) => ({ ...entry, builtin: !entry.custom })) })
        return
      }
      if (rel === 'categories/suggest') {
        const label = url.searchParams.get('label') ?? ''
        sendJson(res, 200, { ok: true, icon: suggestIconForLabel(label) ?? DEFAULT_CATEGORY_ICON, label: extractIconAndLabel(label).label })
        return
      }
      if (rel === 'categories/create' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const label = payload?.label
          if (isBlank(label)) {
            sendJson(res, 400, { ok: false, error: 'label is required' })
            return
          }
          const created = createCategory(root, label, resolveIcon(payload?.icon, label))
          if (created?.ok !== true) {
            sendJson(res, 400, { ok: false, error: created?.error ?? 'create failed' })
            return
          }
          sendJson(res, 200, { ok: true, category: created.category })
        })
        return
      }
      if (rel === 'categories/rename' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const key = payload?.key
          if (isBlank(key)) {
            sendJson(res, 400, { ok: false, error: 'key is required' })
            return
          }
          const patch = { label: payload?.label }
          if (typeof payload?.icon === 'string') patch.icon = resolveIcon(payload.icon, payload?.label ?? key)
          const updated = updateCategory(root, key, patch)
          if (updated?.ok !== true) {
            sendJson(res, 400, { ok: false, error: updated?.error ?? 'rename failed' })
            return
          }
          sendJson(res, 200, { ok: true, category: updated.category })
        })
        return
      }
      if (rel === 'categories/delete' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const key = payload?.key
          if (isBlank(key)) {
            sendJson(res, 400, { ok: false, error: 'key is required' })
            return
          }
          const removed = deleteCategory(root, key)
          if (removed?.ok !== true) {
            sendJson(res, 400, { ok: false, error: removed?.error ?? 'delete failed' })
            return
          }
          // Records in the removed category must land somewhere visible.
          let moved = 0
          try {
            for (const file of readdirSync(paths.dataDir)) {
              if (!file.endsWith('.json')) continue
              const filePath = join(paths.dataDir, file)
              const record = JSON.parse(readFileSync(filePath, 'utf8'))
              if (record?.category !== key) continue
              record.category = REMOVED_CATEGORY_FALLBACK
              writeFileSync(filePath, JSON.stringify(record, null, 2) + '\n')
              moved += 1
            }
          } catch (error) {
            log(`failed to move records out of the removed category "${key}": ${message(error)}`)
          }
          respondRebuilt(res, true, { moved })
        })
        return
      }
      if (rel === 'categories/reorder' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const reordered = reorderCategories(root, payload?.keys)
          if (reordered?.ok !== true) {
            sendJson(res, 400, { ok: false, error: reordered?.error ?? 'reorder failed' })
            return
          }
          sendJson(res, 200, { ok: true })
        })
        return
      }
      if (rel === 'categories/restore' && method === 'POST') {
        readJsonBody(req, res, () => {
          const restored = restoreDefaultCategories(root)
          respondRebuilt(res, true, {
            restored: Array.isArray(restored?.restored) ? restored.restored.length : 0,
            kept: Array.isArray(restored?.added) ? restored.added.length : 0,
          })
        })
        return
      }

      // --- catalog ---------------------------------------------------------
      if (rel === 'catalog') {
        if (!existsSync(paths.indexPath)) {
          sendJson(res, 404, { ok: false, error: 'catalog not found' })
          return
        }
        try {
          send(res, 200, readFileSync(paths.indexPath, 'utf8'), 'application/json; charset=utf-8')
        } catch (error) {
          sendJson(res, 500, { ok: false, error: message(error) })
        }
        return
      }

      // --- import settings -------------------------------------------------
      // Where "+ 添加目录" installs: one absolute directory the user picks, or
      // `<root>/skills` when unset. Persisted so the choice survives a reload,
      // and read on every import so a change takes effect without a restart.
      //
      // `providerRegistered` reports whether the harness accepted this plugin as
      // a skill provider. Without it the failure is invisible: the panel lists
      // skills, the user picks one, and nothing the model is given can load it.
      // The panel turns `false` into a visible warning; the field is additive so
      // an older client that ignores it keeps working.
      //
      // `legacyBackups` names the `.<id>.old-<timestamp>` folders versions up to
      // 2.0.x left behind when they replaced a skill. They are read here for the
      // same reason `providerRegistered` is: this is the one request the settings
      // page already makes, and the list is what lets it offer to delete them.
      if (rel === 'import-settings') {
        const providerRegistered = skillProvider !== undefined
        if (method !== 'POST') {
          sendJson(res, 200, {
            ok: true,
            defaultSkillDir: readImportSettings(root).defaultSkillDir,
            providerRegistered,
            legacyBackups: listLegacyBackups(userSkillRoots(root, config.skillDirs)).map((entry) => entry.name),
          })
          return
        }
        readJsonBody(req, res, (payload) => {
          const requested = payload?.defaultSkillDir
          // Only an absolute directory, or an explicit clear, is storable: a
          // relative path would resolve against whatever cwd the host happens
          // to have, which is not a directory the user can predict.
          if (typeof requested !== 'string') {
            sendJson(res, 400, { ok: false, error: 'defaultSkillDir 必须是字符串（绝对路径或空串）' })
            return
          }
          const value = requested.trim()
          if (value !== '' && !isAbsolute(value)) {
            sendJson(res, 400, { ok: false, error: 'defaultSkillDir 必须是绝对路径' })
            return
          }
          const saved = writeImportSettings(root, { defaultSkillDir: value })
          // The directory joins the scan roots, so the catalog's "every record
          // still has a folder" cross-check answers differently now; rebuilding
          // here keeps the rail in step with the setting the user just made.
          rebuildCatalogIndex(root, bundledSchema)
          // The provider reads the directory fresh on every `list()`, so the new
          // value is already live — but the registry answers from a cache until
          // something invalidates it. Without this the model keeps the previous
          // directory's skills, which is the whole failure this feature removes.
          skillProvider?.invalidate()
          sendJson(res, 200, { ok: true, defaultSkillDir: saved.defaultSkillDir, providerRegistered })
        })
        return
      }

      // --- rescan ----------------------------------------------------------
      // A user who drops skill folders into a scan root by hand needs a way to
      // say "look again" without reloading the page. This adopts whatever is
      // new, rebuilds the index, and starts the model backfill for every record
      // still missing its Chinese name, summary, category, or examples.
      if (rel === 'skills/refresh' && method === 'POST') {
        const adopted = adoptUnregisteredSkills(root)
        for (const entry of adopted.skipped) log(`skill "${entry.id}" not adopted: ${entry.error}`)
        const built = rebuildCatalogIndex(root, bundledSchema)
        const naming = startNamingBackfill()
        // Naming needs the live default-model seat, and when that seat is not
        // reachable the only symptom is an English name that never turns
        // Chinese. Reporting what the lookup saw makes that diagnosable from the
        // panel rather than from a log nobody reads.
        const target = namingRuntimeTarget()
        sendJson(res, 200, {
          ok: true,
          adopted: adopted.adopted.map((entry) => entry.id),
          skipped: adopted.skipped,
          naming,
          namingDisabled: !config.naming,
          namingTarget: target === undefined ? '' : `${target.provider}/${target.model}`,
          ...built.ok ? { catalogCount: built.count } : {},
        })
        return
      }

      // --- retired overwrite backups ---------------------------------------
      // Versions up to 2.0.5 copied a skill folder to `.<id>.old-<timestamp>`
      // before replacing it, so a skill directory can still hold copies of
      // skills the user replaced — one per re-import. Importing a skill again
      // retires its own backups, but a user who replaced a skill once and never
      // touched it again would keep the folder forever, and deleting files in
      // their directory is not something a scan may do behind their back: this
      // is an explicit action, offered only when the page can count something.
      if (rel === 'skills/cleanup-backups' && method === 'POST') {
        const cleaned = removeLegacyBackups(userSkillRoots(root, config.skillDirs))
        for (const entry of cleaned.failed) log(`retired backup kept: ${entry.path}: ${entry.error}`)
        const names = cleaned.removed.map((path) => basename(path))
        sendJson(res, 200, {
          ok: true,
          removed: names,
          failed: cleaned.failed,
          note: names.length === 0
            ? '没有需要清理的旧版本备份。'
            : `已删除 ${names.length} 个旧版本备份。`,
        })
        return
      }

      // --- skills ----------------------------------------------------------
      if (rel === 'skills') {
        const adopted = adoptUnregisteredSkills(root)
        if (adopted.adopted.length > 0) rebuildCatalogIndex(root, bundledSchema)
        if (!existsSync(paths.indexPath)) {
          sendJson(res, 200, { ok: true, skills: [] })
          return
        }
        let index
        try {
          index = JSON.parse(readFileSync(paths.indexPath, 'utf8'))
        } catch (error) {
          sendJson(res, 500, { ok: false, error: message(error) })
          return
        }
        const labels = categoryDisplayMap(root)
        const skills = (Array.isArray(index?.skills) ? index.skills : [])
          .filter((skill) => skill?.category !== 'internal')
          .map((skill) => {
            const command = skill?.frontmatter_name
              ?? (typeof skill?.invoke === 'string' ? skill.invoke.replace(/^\//, '') : undefined)
              ?? skill.id
            return {
              id: skill.id,
              name: skill.name ?? skill.id,
              displayName: skill.name ?? skill.id,
              displaySummary: skill.summary ?? skill.description ?? '',
              category: skill.category,
              categoryLabel: labels[skill.category] ?? skill.category,
              summary: skill.summary ?? skill.description ?? '',
              status: skill.status ?? 'beta',
              invoke: `/${command}`,
            }
          })
        sendJson(res, 200, { ok: true, skills })
        return
      }
      // --- skill detail ----------------------------------------------------
      // The board opens one skill at a time: the same presentation fields the
      // list carries, plus the SKILL.md body and the "试试这样用" examples. The
      // body lives here rather than in the list so a library of a hundred skills
      // does not ship a hundred files' worth of markdown in one response.
      if (rel === 'skills/detail') {
        const id = url.searchParams.get('id')
        // The id is turned into a path below, so it is refused unless it is a
        // bare skill identifier — no separators, no dots, nothing to traverse
        // with. `locateSkillFile` re-checks the resolved path containment.
        if (isBlank(id) || !SKILL_NAME.test(id)) {
          sendJson(res, 400, { ok: false, error: 'id 必须是技能标识（小写字母、数字与单连字符）' })
          return
        }
        const record = readRecord(id)
        if (record === undefined) {
          sendJson(res, 404, { ok: false, error: `找不到技能「${id}」` })
          return
        }
        const labels = categoryDisplayMap(root)
        const command = record.frontmatter_name
          ?? (typeof record.invoke === 'string' ? record.invoke.replace(/^\//, '') : undefined)
          ?? id
        const located = locateSkillFile(id)
        sendJson(res, 200, {
          ok: true,
          id,
          name: record.name ?? id,
          displayName: record.name ?? id,
          displaySummary: record.summary ?? record.description ?? '',
          category: record.category,
          categoryLabel: labels[record.category] ?? record.category,
          status: record.status ?? 'beta',
          invoke: `/${command}`,
          examples: Array.isArray(record.examples) ? record.examples : [],
          markdown: located.markdown,
          truncated: located.truncated,
        })
        return
      }
      if (rel === 'skills/validate') {
        const candidate = url.searchParams.get('path')
        if (isBlank(candidate)) {
          sendJson(res, 400, { ok: false, error: 'path is required' })
          return
        }
        const verdict = diagnoseSkillDir(normalize(resolve(candidate)))
        if (verdict?.ok !== true) {
          sendJson(res, verdict?.fixable === true ? 200 : 400, {
            ok: false,
            canRepair: verdict?.fixable === true,
            code: verdict?.code,
            error: verdict?.error ?? 'not a readable skill folder',
          })
          return
        }
        sendJson(res, 200, {
          ok: true,
          canRepair: verdict.fixable === true,
          code: verdict.code,
          id: verdict.name,
          name: verdict.name,
          invoke: verdict.invoke ?? `/${verdict.name}`,
          description: verdict.description,
          guessedCategory: guessCategory({ id: verdict.name, description: verdict.description }),
        })
        return
      }
      if (rel === 'skills/import' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const candidate = payload?.path
          if (isBlank(candidate)) {
            sendJson(res, 400, { ok: false, error: 'path is required' })
            return
          }
          const imported = importSkillDir(root, normalize(resolve(candidate)), {
            overwrite: payload?.overwrite === true,
            category: typeof payload?.category === 'string' && payload.category !== '' ? payload.category : undefined,
            // The configured default import directory; an unset value is `''`,
            // which installs into `<root>/skills` exactly as before.
            intoDir: readImportSettings(root).defaultSkillDir,
          })
          if (imported?.ok !== true) {
            sendJson(res, 400, { ok: false, error: imported?.error ?? 'import failed', code: imported?.code })
            return
          }
          rebuildCatalogIndex(root, bundledSchema)
          const repairs = pendingImportNotes.splice(0)
          const id = imported.id
          const description = imported.description ?? ''
          const guessed = imported.guessedCategory ?? guessCategory({ id, description })
          // A replaced skill is reported as such: the panel says "已覆盖更新"
          // instead of "已添加", which is the only way the user can tell that the
          // older copy is gone rather than sitting next to the new one.
          const overwritten = imported.overwritten === true
          /** @param {string} label - the category's display label. */
          const answerImported = (label) => {
            const name = readRecordName(id)
            sendJson(res, 200, {
              ok: true,
              id,
              category: readRecord(id)?.category ?? imported.category,
              categoryLabel: label,
              invoke: imported.invoke,
              repaired: imported.repaired === true,
              repairs,
              overwritten,
              name,
              note: overwritten
                ? `已覆盖更新技能「${name}」，分类「${label}」（旧版本已删除）。`
                : `已把技能「${name}」添加到分类「${label}」。`,
            })
          }
          /** @param {string} category - category key. @returns {string} its label. */
          const labelFor = (category) => listCategories().all.find((entry) => entry.key === category)?.label ?? category
          if (!config.naming) {
            // Nothing to wait for, so answer inside the request instead of on a
            // later microtask: a caller that reads the body synchronously — a
            // test, or a script — must not see an empty response.
            answerImported(labelFor(readRecord(id)?.category ?? imported.category))
            return
          }
          runNamingFor(id, description, guessed).then(
            (named) => {
              if (!named.ok) log(`naming for "${id}" skipped: ${named.error}`)
              answerImported(labelFor(readRecord(id)?.category ?? imported.category))
            },
            (error) => {
              log(`naming for "${id}" failed: ${message(error)}`)
              answerImported(labelFor(readRecord(id)?.category ?? imported.category))
            },
          )
        })
        return
      }
      if (rel === 'skills/update' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const id = payload?.id
          if (isBlank(id)) {
            sendJson(res, 400, { ok: false, error: 'id is required' })
            return
          }
          if (typeof payload?.category === 'string' && payload.category !== ''
            && !listCategories().all.some((entry) => entry.key === payload.category)) {
            sendJson(res, 400, { ok: false, error: `未知分类 "${payload.category}"` })
            return
          }
          const updated = updateSkillRecord(root, id, {
            displayName: payload?.displayName,
            displaySummary: payload?.displaySummary,
            category: payload?.category,
          })
          if (updated?.ok !== true) {
            sendJson(res, 400, { ok: false, error: updated?.error ?? 'update failed' })
            return
          }
          const built = rebuildCatalogIndex(root, bundledSchema)
          sendJson(res, 200, {
            ok: true,
            id,
            name: updated.name,
            displayName: updated.name,
            displaySummary: updated.summary,
            category: updated.category,
            catalogCount: built.ok ? built.count : undefined,
            note: `已更新技能「${updated.name ?? id}」。`,
          })
        })
        return
      }
      if (rel === 'skills/delete' && method === 'POST') {
        readJsonBody(req, res, (payload) => {
          const id = payload?.id
          if (isBlank(id)) {
            sendJson(res, 400, { ok: false, error: 'id is required' })
            return
          }
          if (readRecord(id)?.category === 'internal') {
            sendJson(res, 400, { ok: false, error: 'internal 共享包不能删除' })
            return
          }
          const skillName = readRecordName(id)
          const removed = deleteSkill(root, id)
          if (removed?.ok !== true) {
            sendJson(res, 400, { ok: false, error: removed?.error ?? 'delete failed' })
            return
          }
          const built = rebuildCatalogIndex(root, bundledSchema)
          sendJson(res, 200, {
            ok: true,
            id,
            catalogCount: built.ok ? built.count : undefined,
            note: `已删除技能「${skillName}」及其文件夹。`,
          })
        })
        return
      }

      send(res, 404, 'not found', 'text/plain; charset=utf-8')
    },
  }

  // Registering the prefix is a lifecycle action, so it runs inside an effect:
  // unloading the plugin — or a `patchReload` that swaps it out — calls the
  // effect's disposer and takes the prefix down with it. `register` answers
  // with its own disposer, but a harness answering with anything else would
  // make `ctx.effect` itself throw (`TypeError: Invalid effect`: cordis only
  // collects functions, thenables and iterables), so a non-function answer is
  // swallowed here.
  ctx.effect(() => {
    const dispose = webServer.register(prefixRoute)
    return typeof dispose === 'function' ? dispose : () => {}
  }, 'dsh-science-skill: routes')
}
