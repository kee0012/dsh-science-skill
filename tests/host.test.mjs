// The host half has to be exercisable without a booted harness: everything it
// touches arrives through `ctx.get`, so a hand-made context plus a fake request
// pair is a faithful enough stand-in, and it is what lets this package be tested
// on a machine that has no Science Agent data root at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, normalizeConfig } from '../src/host/index.js'
import { parseNamingReply, readCredentialRef } from '../src/host/lib/skill-naming.mjs'
import { guessCategory } from '../src/host/lib/skills-runtime.mjs'
import { rootPaths } from '../src/host/root.mjs'

/** A response sink that records what a route answered. */
function makeResponse() {
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      response.headers[name] = value
    },
    write(chunk) {
      response.body += chunk
    },
    end() {
      response.ended = true
    },
  }
  return response
}

/**
 * A request stand-in: `readJsonBody` is listener-driven, so the payload is
 * emitted on demand rather than present up front.
 */
function makeRequest(method, url, payload) {
  const listeners = new Map()
  return {
    method,
    url,
    on(event, listener) {
      listeners.set(event, listener)
      return this
    },
    emit(event, argument) {
      listeners.get(event)?.(argument)
    },
    /** Push a JSON body through the listeners the route registered. */
    sendBody(value) {
      if (value !== undefined) this.emit('data', Buffer.from(JSON.stringify(value), 'utf8'))
      this.emit('end')
    },
  }
}

/**
 * Boot the plugin against one data root.
 * @param root - the catalog root to point the plugin at.
 * @param options - `{ config, logger }` overrides.
 * @returns the registered routes plus the services the plugin published.
 */
async function boot(root, options = {}) {
  const routes = []
  const effects = []
  const disposals = []
  const provided = new Map()
  const provideCalls = []
  const logs = []
  const ctx = {
    logger: {
      info: (line) => logs.push(`info ${line}`),
      warn: (line) => logs.push(`warn ${line}`),
      error: (line) => logs.push(`error ${line}`),
    },
    get: (key) => (key === 'webServer'
      ? { register: (route) => { routes.push(route); return () => disposals.push(route.path) } }
      : options.services?.[key]),
    provide: (key, value) => { provideCalls.push(key); provided.set(key, value) },
    effect: (execute, label) => { effects.push({ label, dispose: execute() }) },
  }
  apply(ctx, { dataRoot: root, naming: false, ...options.config })
  return { routes, provided, provideCalls, logs, ctx, effects, disposals }
}

/** Call one route by path. @returns `{ status, body, response }` */
function call(routes, method, path, payload) {
  const route = routes.find((entry) => path.startsWith(entry.path))
  assert.ok(route, `no route registered for ${path}`)
  const response = makeResponse()
  const request = makeRequest(method, path)
  route.handler(request, response)
  if (method === 'POST') request.sendBody(payload)
  return { status: response.statusCode, body: response.body, response }
}

/** @returns the parsed JSON body of a route answer. */
function json(result) {
  return JSON.parse(result.body)
}

/** A throwaway data root with a couple of skills and one catalog record. */
function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-science-skill-'))
  mkdirSync(join(root, 'skills', 'alpha-skill'), { recursive: true })
  writeFileSync(
    join(root, 'skills', 'alpha-skill', 'SKILL.md'),
    '---\nname: alpha-skill\ndescription: Alpha does a thing.\n---\n\n# Alpha\n',
  )
  mkdirSync(join(root, 'skills', 'beta-skill'), { recursive: true })
  writeFileSync(
    join(root, 'skills', 'beta-skill', 'SKILL.md'),
    '---\nname: beta-skill\ndescription: Beta does another thing.\n---\n\n# Beta\n',
  )
  return root
}

test('normalizeConfig keeps the documented defaults', () => {
  assert.deepEqual(normalizeConfig(), { enabled: true, dataRoot: '', skillDirs: [], naming: true })
  assert.deepEqual(normalizeConfig({ enabled: false, naming: false }), {
    enabled: false, dataRoot: '', skillDirs: [], naming: false,
  })
  assert.deepEqual(normalizeConfig({ skillDirs: ['a', '', 7] }).skillDirs, ['a'])
})

test('apply does nothing without a web server', () => {
  const logs = []
  apply({ logger: { info: (line) => logs.push(line) }, get: () => undefined }, { dataRoot: makeRoot() })
  assert.ok(logs.some((line) => line.includes('no web server service')))
})

test('apply stays inert when disabled', () => {
  const routes = []
  apply(
    { logger: { info: () => {} }, get: () => ({ register: (route) => routes.push(route) }), effect: (execute) => execute() },
    { enabled: false },
  )
  assert.equal(routes.length, 0)
})

test('a fresh root gets categories, catalog records and a rebuilt index', async () => {
  const root = makeRoot()
  const { provided, provideCalls } = await boot(root)
  const paths = rootPaths(root)
  assert.ok(existsSync(paths.categoriesPath), 'categories.json was not written')
  assert.ok(existsSync(paths.indexPath), 'catalog/index.json was not written')
  const record = JSON.parse(readFileSync(join(paths.dataDir, 'alpha-skill.json'), 'utf8'))
  assert.equal(record.id, 'alpha-skill')
  assert.equal(record.summary, 'Alpha does a thing.')

  const index = JSON.parse(readFileSync(paths.indexPath, 'utf8'))
  assert.deepEqual(index.skills.map((skill) => skill.id).sort(), ['alpha-skill', 'beta-skill'])

  // The `skillGate` seat is never claimed: a second provider makes the *other*
  // plugin's own unguarded `provide` throw, and on a Science Agent build that
  // plugin is the science workbench (catalog, /science/api, the whole rail).
  assert.equal(provided.has('skillGate'), false, 'the plugin published a skillGate seat')
  assert.deepEqual(provideCalls, [], 'ctx.provide was called')
})

test('an activation gate already in the tree keeps its seat', async () => {
  const root = makeRoot()
  // A machine that runs the science workbench already claims the seat, and that
  // provider throws unguarded when a second plugin got there first — which would
  // take the whole workbench (catalog, /science/api, the rail) down with it.
  const incumbent = { isActive: () => true }
  const { provided, provideCalls, ctx, routes } = await boot(root, { services: { skillGate: incumbent } })
  assert.equal(provided.has('skillGate'), false, 'the incumbent gate was overwritten')
  assert.deepEqual(provideCalls, [], 'ctx.provide was called')
  assert.equal(ctx.get('skillGate'), incumbent, 'the incumbent gate was replaced')
  assert.ok(routes.length > 0, 'routes still came up')
  assert.ok(existsSync(join(root, 'catalog', 'index.json')), 'the catalog was still built')
})

test('a colliding registration is never provoked', async () => {
  const root = makeRoot()
  const routes = []
  let provideCalls = 0
  // `ctx.get` cannot see a provider whose own mount batch has not settled, so
  // probing with `ctx.get` and falling back to `provide` collides exactly the
  // way cordis reports as `service "skillGate" has been registered at <fiber>`
  // — and that throw lands in the *other* plugin's apply, not this one.
  const ctx = {
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    get: (key) => (key === 'webServer' ? { register: (route) => { routes.push(route); return () => {} } } : undefined),
    provide: () => { provideCalls += 1; throw new Error('service "skillGate" has been registered at <science-workbench>') },
    effect: (execute) => execute(),
  }
  apply(ctx, { dataRoot: root, naming: false })

  assert.equal(provideCalls, 0, 'the plugin attempted to publish a seat')
  assert.ok(routes.length > 0, 'the host half failed to come up')
})

test('the route prefix is registered inside a labelled effect', async () => {
  const root = makeRoot()
  const { routes, effects, disposals } = await boot(root)
  assert.ok(routes.length > 0, 'the prefix was not registered')
  // An unload — or a `patchReload` swapping this plugin out — can only take the
  // prefix down if the registration happened inside an effect the fiber owns.
  const registration = effects.find((entry) => entry.label === 'dsh-science-skill: routes')
  assert.ok(registration, 'the route prefix was registered outside ctx.effect')
  assert.equal(typeof registration.dispose, 'function', 'the effect answered no disposer')
  registration.dispose()
  assert.deepEqual(disposals, ['/api/dsh-science-skill'], 'the disposer is not wired to the prefix')
})

test('the skill routes list, filter and describe the catalog', async () => {
  const root = makeRoot()
  const { routes } = await boot(root)

  const listed = json(call(routes, 'GET', '/api/dsh-science-skill/skills'))
  assert.equal(listed.ok, true)
  assert.equal(listed.skills.length, 2)
  const alpha = listed.skills.find((skill) => skill.id === 'alpha-skill')
  assert.equal(alpha.invoke, '/alpha-skill')
  assert.equal(alpha.displayName, 'alpha-skill')
  // No keyword rule matches "Alpha does a thing.", so the placeholder category is
  // 其他. The fallback used to be 文献, which filed every unplaced skill under
  // literature and read as a classification the rules never made.
  assert.equal(alpha.categoryLabel, '其他')

  const catalog = call(routes, 'GET', '/api/dsh-science-skill/catalog')
  assert.equal(catalog.status, 200)
  assert.deepEqual(json(catalog).$schema, './schema.json')

  const categories = json(call(routes, 'GET', '/api/dsh-science-skill/categories'))
  assert.ok(categories.categories.length >= 10)
  assert.ok(categories.categories.every((entry) => typeof entry.key === 'string'))

  const suggested = json(call(routes, 'GET', '/api/dsh-science-skill/categories/suggest?label=%E7%BB%98%E5%9B%BE'))
  assert.equal(suggested.ok, true)
  assert.equal(typeof suggested.icon, 'string')

  assert.equal(call(routes, 'GET', '/api/dsh-science-skill/nope').status, 404)
})

test('a skill folder with no record is adopted at boot', async () => {
  const root = makeRoot()
  // A folder the host would load but the catalog has never seen.
  mkdirSync(join(root, 'skills', 'gamma-skill'), { recursive: true })
  writeFileSync(
    join(root, 'skills', 'gamma-skill', 'SKILL.md'),
    '---\nname: gamma-skill\ndescription: Gamma appeared later.\n---\n',
  )
  const { routes } = await boot(root)
  const listed = json(call(routes, 'GET', '/api/dsh-science-skill/skills'))
  assert.ok(listed.skills.some((skill) => skill.id === 'gamma-skill'))
})

test('the activation gate pins across restarts and forgets sessions', async () => {
  const root = makeRoot()
  const first = await boot(root)

  assert.deepEqual(json(call(first.routes, 'GET', '/api/dsh-science-skill/skill-gate/state?sessionId=s1')).pinned, [])

  const pinned = json(call(first.routes, 'POST', '/api/dsh-science-skill/skill-gate/pin', { name: 'alpha-skill', enabled: true }))
  assert.deepEqual(pinned, { ok: true, name: 'alpha-skill', enabled: true, pinned: ['alpha-skill'] })
  const gateFile = JSON.parse(readFileSync(join(root, 'skill-gate.json'), 'utf8'))
  assert.deepEqual(gateFile, { pinned: { 'alpha-skill': true } })

  // Session activation is deliberately not persisted.
  call(first.routes, 'POST', '/api/dsh-science-skill/skill-gate/session', { sessionId: 's1', names: ['beta-skill'] })
  const afterSession = json(call(first.routes, 'GET', '/api/dsh-science-skill/skill-gate/state?sessionId=s1'))
  assert.deepEqual(afterSession.pinned, ['alpha-skill'])
  assert.deepEqual(afterSession.active, ['beta-skill'])
  const service = first.provided.get('skillGate')
  assert.equal(service, undefined, 'the gate is private; the seat is not published')
  /** Ask the plugin's own diagnostic route the same question a provider answers. */
  const check = (routes, sessionId, name) =>
    json(call(routes, 'GET', `/api/dsh-science-skill/skill-gate/check?sessionId=${sessionId}&name=${name}`))
  assert.equal(check(first.routes, 's1', 'alpha-skill').active, true)
  assert.equal(check(first.routes, 's1', 'beta-skill').active, true)
  assert.equal(check(first.routes, 's2', 'beta-skill').active, false)
  assert.equal(check(first.routes, 's2', 'alpha-skill').active, true)
  assert.equal(call(first.routes, 'GET', '/api/dsh-science-skill/skill-gate/check?sessionId=s1').status, 400)

  // A restart keeps the pin and drops the session.
  const second = await boot(root)
  const afterRestart = json(call(second.routes, 'GET', '/api/dsh-science-skill/skill-gate/state?sessionId=s1'))
  assert.deepEqual(afterRestart.pinned, ['alpha-skill'])
  assert.deepEqual(afterRestart.active, [])
  assert.equal(check(second.routes, 's1', 'beta-skill').active, false)

  // Unpinning removes it again.
  const unpinned = json(call(second.routes, 'POST', '/api/dsh-science-skill/skill-gate/pin', { name: 'alpha-skill', enabled: false }))
  assert.deepEqual(unpinned.pinned, [])
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'skill-gate.json'), 'utf8')), { pinned: {} })

  // Emptying a session forgets it entirely.
  json(call(second.routes, 'POST', '/api/dsh-science-skill/skill-gate/session', { sessionId: 's1', names: [] }))
  assert.deepEqual(json(call(second.routes, 'GET', '/api/dsh-science-skill/skill-gate/state?sessionId=s1')).active, [])
})

test('the gate routes reject a malformed payload', async () => {
  const root = makeRoot()
  const { routes } = await boot(root)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skill-gate/pin', {}).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skill-gate/session', {}).status, 400)
})

test('editing a skill rewrites the record but not its markdown', async () => {
  const root = makeRoot()
  const { routes } = await boot(root)
  const paths = rootPaths(root)

  const updated = json(call(routes, 'POST', '/api/dsh-science-skill/skills/update', {
    id: 'alpha-skill', displayName: '阿尔法', displaySummary: '一句话说明。', category: 'writing',
  }))
  assert.equal(updated.ok, true)
  assert.equal(updated.displayName, '阿尔法')
  assert.equal(updated.category, 'writing')
  assert.equal(updated.catalogCount, 2)

  const record = JSON.parse(readFileSync(join(paths.dataDir, 'alpha-skill.json'), 'utf8'))
  assert.equal(record.name, '阿尔法')
  assert.equal(record.summary, '一句话说明。')
  // Editing rewrites the record only: the skill's own markdown is the author's,
  // and a display name is a catalog fact.
  assert.match(readFileSync(join(root, 'skills', 'alpha-skill', 'SKILL.md'), 'utf8'), /description: Alpha does a thing\./)

  // Clearing an override goes back to the wording the record held before the
  // edit, not to the override the user just erased.
  const cleared = json(call(routes, 'POST', '/api/dsh-science-skill/skills/update', { id: 'alpha-skill', displayName: '' }))
  assert.equal(cleared.ok, true)
  assert.equal(cleared.displayName, 'alpha-skill')
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skills/update', { id: 'alpha-skill', category: '不存在' }).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skills/update', {}).status, 400)
})

test('deleting a skill removes its folder and keeps internal packages', async () => {
  const root = makeRoot()
  const { routes } = await boot(root)
  const paths = rootPaths(root)

  const deleted = json(call(routes, 'POST', '/api/dsh-science-skill/skills/delete', { id: 'alpha-skill' }))
  assert.equal(deleted.ok, true)
  assert.equal(existsSync(join(root, 'skills', 'alpha-skill')), false)
  assert.equal(existsSync(join(paths.dataDir, 'alpha-skill.json')), false)
  assert.deepEqual(json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills.map((skill) => skill.id), ['beta-skill'])

  // An `internal` record is the shared package every skill may depend on.
  writeFileSync(join(paths.dataDir, 'internal-skill.json'), JSON.stringify({
    id: 'internal-skill', name: 'internal-skill', category: 'internal', summary: '', invoke: '/internal-skill',
  }))
  mkdirSync(join(root, 'skills', 'internal-skill'), { recursive: true })
  writeFileSync(join(root, 'skills', 'internal-skill', 'SKILL.md'), '---\nname: internal-skill\ndescription: shared.\n---\n')
  const refused = call(routes, 'POST', '/api/dsh-science-skill/skills/delete', { id: 'internal-skill' })
  assert.equal(refused.status, 400)
  assert.equal(json(refused).error, 'internal 共享包不能删除')
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skills/delete', {}).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skills/delete', { id: 'ghost' }).status, 400)
})

test('importing a folder makes it visible without a model to name it', async () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-science-skill-src-'))
  mkdirSync(join(source, 'delta-skill'), { recursive: true })
  writeFileSync(join(source, 'delta-skill', 'SKILL.md'), '---\nname: delta-skill\ndescription: Delta was imported.\n---\n')

  const root = makeRoot()
  const { routes } = await boot(root)
  const imported = json(call(routes, 'POST', '/api/dsh-science-skill/skills/import', { path: join(source, 'delta-skill') }))
  assert.equal(imported.ok, true)
  assert.equal(imported.id, 'delta-skill')
  assert.equal(imported.invoke, '/delta-skill')
  assert.match(imported.note, /已把技能「delta-skill」添加到分类/)

  const listed = json(call(routes, 'GET', '/api/dsh-science-skill/skills'))
  assert.ok(listed.skills.some((skill) => skill.id === 'delta-skill'))

  // Validating a candidate folder answers what the import would produce.
  const verdict = json(call(routes, 'GET', `/api/dsh-science-skill/skills/validate?path=${encodeURIComponent(join(source, 'delta-skill'))}`))
  assert.equal(verdict.ok, true)
  assert.equal(verdict.id, 'delta-skill')

  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skills/import', {}).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/skills/import', { path: join(source, 'nowhere') }).status, 400)
})

test('categories can be created, renamed, reordered, deleted and restored', async () => {
  const root = makeRoot()
  const { routes } = await boot(root)
  const paths = rootPaths(root)

  const created = json(call(routes, 'POST', '/api/dsh-science-skill/categories/create', { label: '我的分类', icon: 'folder' }))
  assert.equal(created.ok, true)
  const key = JSON.parse(readFileSync(paths.categoriesPath, 'utf8')).find((entry) => entry.label === '我的分类').key

  const renamed = json(call(routes, 'POST', '/api/dsh-science-skill/categories/rename', { key, label: '改过名' }))
  assert.equal(renamed.ok, true)

  // Reordering is authoritative by array order, so the new key can go first.
  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/categories/reorder', { keys: [key] })).ok, true)
  assert.equal(JSON.parse(readFileSync(paths.categoriesPath, 'utf8'))[0].key, key)

  // Deleting a category moves its records to the fallback instead of orphaning them.
  call(routes, 'POST', '/api/dsh-science-skill/skills/update', { id: 'alpha-skill', category: key })
  const deleted = json(call(routes, 'POST', '/api/dsh-science-skill/categories/delete', { key }))
  assert.equal(deleted.ok, true)
  assert.equal(deleted.moved, 1)
  assert.equal(JSON.parse(readFileSync(join(paths.dataDir, 'alpha-skill.json'), 'utf8')).category, 'literature')

  const restored = json(call(routes, 'POST', '/api/dsh-science-skill/categories/restore', {}))
  assert.equal(restored.ok, true)
  assert.equal(typeof restored.restored, 'number')

  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/categories/create', {}).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/categories/rename', {}).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/categories/delete', {}).status, 400)
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/categories/reorder', { keys: ['nope'] }).status, 400)
})

test('a root with nothing in it still answers, and a missing body is not a crash', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'dsh-science-skill-empty-'))
  const { routes } = await boot(empty)
  const listed = json(call(routes, 'GET', '/api/dsh-science-skill/skills'))
  assert.deepEqual(listed, { ok: true, skills: [] })
  assert.equal(call(routes, 'GET', '/api/dsh-science-skill/catalog').status, 404)

  // An empty or unparseable body must never escape as a thrown exception: this
  // runs inside the web server's emitter.
  const route = routes[0]
  const response = makeResponse()
  const request = makeRequest('POST', '/api/dsh-science-skill/skill-gate/pin')
  route.handler(request, response)
  request.emit('data', Buffer.from('{ not json', 'utf8'))
  request.emit('end')
  assert.equal(response.statusCode, 400)
  assert.equal(JSON.parse(response.body).error, 'invalid JSON body')

  rmSync(empty, { recursive: true, force: true })
})

test('the default import directory redirects an import and is still scanned', async () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-science-skill-pick-'))
  const writeSkill = (name, description) => {
    mkdirSync(join(source, name), { recursive: true })
    writeFileSync(join(source, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n`)
  }
  const defaultDir = join(mkdtempSync(join(tmpdir(), 'dsh-science-skill-into-')), '我的技能')

  const root = makeRoot()
  const { routes } = await boot(root)

  // Unset by default, and a relative path is refused rather than resolved
  // against whatever the server's cwd happens to be.
  assert.equal(json(call(routes, 'GET', '/api/dsh-science-skill/import-settings')).defaultSkillDir, '')
  assert.equal(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: 'relative/nope' }).status, 400)
  assert.equal(
    json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: defaultDir })).defaultSkillDir,
    defaultDir,
  )

  writeSkill('zeta-skill', 'Zeta went where it was told.')
  const imported = json(call(routes, 'POST', '/api/dsh-science-skill/skills/import', { path: join(source, 'zeta-skill') }))
  assert.equal(imported.ok, true)
  assert.ok(existsSync(join(defaultDir, 'zeta-skill', 'SKILL.md')), 'the skill did not land in the default directory')
  assert.ok(!existsSync(join(root, 'skills', 'zeta-skill')), 'the skill leaked into <dataRoot>/skills')
  // Redirecting the install must not hide the skill: the chosen directory is a
  // scan root, so the very next listing already contains it.
  assert.ok(json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills.some((skill) => skill.id === 'zeta-skill'))

  // Clearing the setting puts imports back on <dataRoot>/skills.
  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: '' })).defaultSkillDir, '')
  writeSkill('eta-skill', 'Eta went home.')
  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/skills/import', { path: join(source, 'eta-skill') })).ok, true)
  assert.ok(existsSync(join(root, 'skills', 'eta-skill', 'SKILL.md')))
  assert.ok(!existsSync(join(defaultDir, 'eta-skill')), 'a cleared setting still redirected the import')

  rmSync(source, { recursive: true, force: true })
  rmSync(defaultDir, { recursive: true, force: true })
})

test('a folder filled in advance is adopted when it becomes the default directory', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-mine-'))
  for (const name of ['my-alpha', 'my-beta']) {
    mkdirSync(join(mine, name), { recursive: true })
    writeFileSync(join(mine, name, 'SKILL.md'), `---\nname: ${name}\ndescription: Pre-existing ${name}.\n---\n`)
  }

  const root = makeRoot()
  const { routes } = await boot(root)
  const ids = () => json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills.map((skill) => skill.id)

  // Nothing points at the folder yet, so nothing knows about its skills.
  assert.equal(ids().includes('my-alpha'), false)

  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok, true)

  // The folder is a scan root now, and adoption runs on the list route, so the
  // very next read already has them. Nothing is copied out of the folder: the
  // host only writes catalog records beside the data root.
  const after = ids()
  assert.ok(after.includes('my-alpha'), 'a pre-existing skill was not adopted')
  assert.ok(after.includes('my-beta'), 'a pre-existing skill was not adopted')
  assert.ok(existsSync(join(mine, 'my-alpha', 'SKILL.md')), 'adoption must leave the user files alone')

  rmSync(mine, { recursive: true, force: true })
})

test('a rescan adopts a skill dropped into the directory by hand', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-drop-'))
  const root = makeRoot()
  const { routes } = await boot(root)
  const ids = () => json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills.map((skill) => skill.id)

  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok, true)
  assert.equal(ids().includes('late-skill'), false)

  // Added after the directory was chosen, with no import to announce it — this
  // is the case the 刷新 button exists for.
  mkdirSync(join(mine, 'late-skill'), { recursive: true })
  writeFileSync(join(mine, 'late-skill', 'SKILL.md'), '---\nname: late-skill\ndescription: Added by hand later.\n---\n')

  const rescan = json(call(routes, 'POST', '/api/dsh-science-skill/skills/refresh', {}))
  assert.equal(rescan.ok, true)
  assert.deepEqual(rescan.adopted, ['late-skill'])
  assert.ok(ids().includes('late-skill'), 'the rescan did not surface the dropped skill')
  // `boot` disables naming, so the rescan must report that rather than claim to
  // have started model calls it never made.
  assert.equal(rescan.namingDisabled, true)
  assert.equal(rescan.naming, 0)

  rmSync(mine, { recursive: true, force: true })
})

test('a skill whose frontmatter nests a mapping is still adopted', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-nested-'))
  mkdirSync(join(mine, 'nested-skill'), { recursive: true })
  // The shipped science skills all nest `metadata:` under the top level. The
  // reader matched its key pattern against a line that still carried the block's
  // indentation, and the pattern is anchored at `^`, so every nested mapping was
  // rejected and those skills silently never reached the catalog.
  writeFileSync(join(mine, 'nested-skill', 'SKILL.md'), [
    '---',
    'name: nested-skill',
    'description: Has a nested metadata block.',
    'license: MIT',
    'metadata:',
    '  version: "1.0"',
    '  skill-author: Someone',
    '  tags:',
    '    - one',
    '    - two',
    '---',
    '',
    '# Nested',
    '',
  ].join('\n'))

  const root = makeRoot()
  const { routes } = await boot(root)
  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok, true)

  const listed = json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills
  assert.ok(listed.some((skill) => skill.id === 'nested-skill'), 'nested frontmatter must not reject the skill')

  rmSync(mine, { recursive: true, force: true })
})

test('YAML the subset reader cannot model does not hide the skill', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-exotic-'))
  const writeSkill = (name, frontmatter) => {
    mkdirSync(join(mine, name), { recursive: true })
    writeFileSync(join(mine, name, 'SKILL.md'), `---\n${frontmatter}\n---\n\n# ${name}\n`)
  }
  // A plain scalar wrapped across lines — the host's `yaml` accepts it.
  writeSkill('wrapped-desc', [
    'name: wrapped-desc',
    'description: 前半句在这里',
    '  后半句缩进继续。',
    'license: MIT',
  ].join('\n'))
  // A sequence of mappings, which the strict reader has no model for at all.
  writeSkill('mapping-list', [
    'name: mapping-list',
    'description: Nested list of mappings.',
    'metadata:',
    '  version: "2.0"',
    '  requires:',
    '    - name: NCBI_EMAIL',
    '      description: contact address',
  ].join('\n'))

  const root = makeRoot()
  const { routes } = await boot(root)
  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok, true)

  const ids = json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills.map((skill) => skill.id)
  assert.ok(ids.includes('wrapped-desc'), 'a wrapped plain scalar must not reject the skill')
  assert.ok(ids.includes('mapping-list'), 'a sequence of mappings must not reject the skill')

  rmSync(mine, { recursive: true, force: true })
})

test('a configured default directory is the only root that is scanned', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-only-'))
  mkdirSync(join(mine, 'only-mine'), { recursive: true })
  writeFileSync(join(mine, 'only-mine', 'SKILL.md'), '---\nname: only-mine\ndescription: The chosen folder.\n---\n')

  // `makeRoot()` seeds <root>/skills with its own skills.
  const root = makeRoot()
  const { routes } = await boot(root)
  const ids = () => json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills.map((skill) => skill.id)
  assert.ok(ids().includes('alpha-skill'), 'the harness root is scanned while no directory is chosen')

  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok, true)

  const after = ids()
  assert.ok(after.includes('only-mine'), 'the chosen folder must be scanned')
  assert.equal(after.includes('alpha-skill'), false, 'the harness root must stop being scanned once a folder is chosen')

  rmSync(mine, { recursive: true, force: true })
})

test('a credential store with a slash in a record key still yields the ref', () => {
  // The real store carries `client-connection/browser-session` under `records`.
  // A `/` in a key is beyond the subset YAML reader, and parsing the whole file
  // threw — so `resolveApiKey` swallowed the error and every naming call
  // reported a missing credential while the key sat in `refs` the whole time.
  const store = [
    'version: 1',
    'refs:',
    '  DEEPSEEK_API_KEY: sk-test-123',
    '  OTHER_KEY: "quoted-value"',
    'records:',
    '  client-connection/browser-session:',
    '    kind: "session"',
    '    payload:',
    '      nested: 1',
  ].join('\n')

  assert.equal(readCredentialRef(store, 'DEEPSEEK_API_KEY'), 'sk-test-123')
  assert.equal(readCredentialRef(store, 'OTHER_KEY'), 'quoted-value')
  assert.equal(readCredentialRef(store, 'MISSING_KEY'), undefined)
  // A store with no `refs` block at all is a miss, not a crash.
  assert.equal(readCredentialRef('version: 1\nrecords:\n  a/b:\n    k: v\n', 'DEEPSEEK_API_KEY'), undefined)
  // Nothing after the block is ever read as a ref.
  assert.equal(readCredentialRef(store, 'kind'), undefined)
})

test('a skill the keyword rules cannot place lands in 其他, not 文献', () => {
  // The fallback used to be `literature`, which filed every unplaced skill under
  // 文献 and read as a claim the rules never made. 其他 is the honest landing
  // place until the model names the skill.
  assert.equal(guessCategory({ id: 'zzz-unplaceable', description: 'Nothing in this sentence trips any rule.' }), 'misc')
  // A rule that does match still wins.
  assert.equal(guessCategory({ id: 'nature-polishing', description: 'Polish a manuscript.' }), 'writing')
})

test('a record whose category vanished is re-filed under 其他', async () => {
  const root = makeRoot()
  // Boot first: the plugin creates the catalog directories on the way up.
  const { routes } = await boot(root)
  const paths = rootPaths(root)

  // A category key the table does not know — a deleted custom category, or a
  // record written before it existed.
  writeFileSync(join(paths.dataDir, 'alpha-skill.json'), JSON.stringify({
    id: 'alpha-skill',
    name: 'alpha-skill',
    category: 'a-category-that-no-longer-exists',
    summary: 'x',
    invoke: '/alpha-skill',
  }))

  // The rescan always rebuilds, which is where the re-filing happens.
  assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/skills/refresh', {})).ok, true)

  const alpha = json(call(routes, 'GET', '/api/dsh-science-skill/skills')).skills
    .find((skill) => skill.id === 'alpha-skill')
  assert.ok(alpha, 'the skill must stay visible rather than disappear')
  assert.equal(alpha.category, 'misc', 'an unknown category must be re-filed under 其他')
})

test('naming reply examples are normalized and degrade instead of failing', () => {
  const categories = [{ key: 'writing', label: '写作' }, { key: 'misc', label: '其他' }]
  const reply = (extra) => JSON.stringify({ name: '中文名', summary: '中文简介', category: 'writing', ...extra })

  // Usable examples survive, with inner whitespace collapsed onto one line.
  const ok = parseNamingReply(reply({ examples: ['帮我  审查这个方案', '挑战我的设计，找出盲点'] }), categories)
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.examples, ['帮我 审查这个方案', '挑战我的设计，找出盲点'])

  // Every unusable shape degrades to [] — and crucially the naming itself still
  // succeeds, because examples are decoration rather than a required field.
  for (const value of [undefined, null, 'nope', 42, {}, [], ['', '   '], [1, true, null]]) {
    const parsed = parseNamingReply(reply(value === undefined ? {} : { examples: value }), categories)
    assert.equal(parsed.ok, true, `naming must survive examples=${JSON.stringify(value)}`)
    assert.deepEqual(parsed.examples, [], `examples=${JSON.stringify(value)} must degrade to []`)
  }

  // Over-long entries are clipped, duplicates collapse, and the list is capped.
  const many = parseNamingReply(reply({ examples: ['一'.repeat(80), '一'.repeat(80), 'b', 'c', 'd'] }), categories)
  assert.equal(many.examples.length, 3)
  assert.equal(many.examples[0].length, 40)
  assert.equal(new Set(many.examples).size, 3)
})

test('the detail route answers with the record, its examples, and the SKILL.md body', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-detail-'))
  mkdirSync(join(mine, 'detail-skill'), { recursive: true })
  const body = '---\nname: detail-skill\ndescription: Has a body.\n---\n\n# Title\n\nBody text.\n'
  writeFileSync(join(mine, 'detail-skill', 'SKILL.md'), body)

  try {
    const root = makeRoot()
    const { routes } = await boot(root)
    assert.equal(json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok, true)
    // Adoption is driven by the list route, so the record only exists after one
    // read; the detail route deliberately does not adopt behind the user's back.
    json(call(routes, 'GET', '/api/dsh-science-skill/skills'))

    const detail = json(call(routes, 'GET', '/api/dsh-science-skill/skills/detail?id=detail-skill'))
    assert.equal(detail.ok, true)
    assert.equal(detail.id, 'detail-skill')
    assert.equal(detail.invoke, '/detail-skill')
    assert.equal(detail.categoryLabel, '其他')
    assert.equal(detail.markdown, body)
    assert.equal(detail.truncated, false)
    // Adoption writes the field empty, so the panel always has an array to map.
    assert.deepEqual(detail.examples, [])

    // A record outlives its folder when a user moves skills around: the detail
    // still answers, with an empty body rather than an error.
    rmSync(join(mine, 'detail-skill'), { recursive: true, force: true })
    const orphan = json(call(routes, 'GET', '/api/dsh-science-skill/skills/detail?id=detail-skill'))
    assert.equal(orphan.ok, true)
    assert.equal(orphan.markdown, '')
    assert.equal(orphan.truncated, false)
  } finally {
    rmSync(mine, { recursive: true, force: true })
  }
})

test('the detail route refuses anything that is not a bare skill id', async () => {
  const root = makeRoot()
  const { routes } = await boot(root)

  // The id is joined to a path, so a traversal attempt must never reach the
  // filesystem: it is rejected on the name form, before any read is tried.
  for (const bad of ['../alpha-skill', '../../etc/passwd', 'a/b', 'alpha-skill.json', '.', '..', '', '   ', 'Alpha-Skill', 'alpha_skill', 'alpha skill']) {
    const answer = call(routes, 'GET', `/api/dsh-science-skill/skills/detail?id=${encodeURIComponent(bad)}`)
    assert.equal(answer.status, 400, `id=${JSON.stringify(bad)} must be refused`)
    assert.equal(json(answer).ok, false)
  }

  // A well-formed id that simply is not in the catalog is a 404, not a throw.
  const missing = call(routes, 'GET', '/api/dsh-science-skill/skills/detail?id=no-such-skill')
  assert.equal(missing.status, 404)
  assert.equal(json(missing).ok, false)
})

test('the detail route caps a huge SKILL.md and says it did', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-huge-'))
  mkdirSync(join(mine, 'huge-skill'), { recursive: true })
  // A bundled reference document, far past what a preview panel would render.
  writeFileSync(
    join(mine, 'huge-skill', 'SKILL.md'),
    `---\nname: huge-skill\ndescription: Very long body.\n---\n\n${'x'.repeat(30000)}`,
  )

  try {
    const root = makeRoot()
    const { routes } = await boot(root)
    json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine }))
    json(call(routes, 'GET', '/api/dsh-science-skill/skills'))

    const detail = json(call(routes, 'GET', '/api/dsh-science-skill/skills/detail?id=huge-skill'))
    assert.equal(detail.ok, true)
    assert.equal(detail.truncated, true, 'an over-long body must be reported as truncated')
    assert.equal(detail.markdown.length, 20000)
  } finally {
    rmSync(mine, { recursive: true, force: true })
  }
})

/**
 * A stand-in for `ctx.skills` that records what the plugin registers.
 * @returns the service plus the calls it saw.
 */
function fakeSkillRegistry() {
  const registrations = []
  const invalidations = []
  return {
    registrations,
    invalidations,
    service: {
      registerProvider(create) {
        const control = {
          signal: new AbortController().signal,
          invalidate: () => { invalidations.push(true) },
        }
        // The registry calls the factory synchronously and keeps what it returns.
        registrations.push(create(control))
        return () => {}
      },
    },
  }
}

test('the chosen directory is published to the harness skill registry', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-prov-'))
  mkdirSync(join(mine, 'published-skill'), { recursive: true })
  writeFileSync(
    join(mine, 'published-skill', 'SKILL.md'),
    '---\nname: published-skill\ndescription: Reaches the model through the registry.\n---\n\n# Body\n',
  )

  try {
    const registry = fakeSkillRegistry()
    const root = makeRoot()
    const { routes } = await boot(root, { services: { skills: registry.service } })

    assert.equal(registry.registrations.length, 1, 'the plugin must register exactly one provider')
    const provider = registry.registrations[0]
    assert.equal(typeof provider.list, 'function', 'the registry calls list()')
    assert.equal(typeof provider.get, 'function', 'the registry calls get()')

    // The panel needs to tell a working install from one whose skills the model
    // cannot load, and this field is the only thing that distinguishes them.
    assert.equal(
      json(call(routes, 'GET', '/api/dsh-science-skill/import-settings')).providerRegistered,
      true,
      'a harness that accepted the provider must report it',
    )

    // No directory chosen yet: the provider is registered but publishes nothing,
    // rather than falling back to roots it does not own.
    assert.deepEqual(await provider.list(), [])

    assert.equal(
      json(call(routes, 'POST', '/api/dsh-science-skill/import-settings', { defaultSkillDir: mine })).ok,
      true,
    )
    // `list()` reads the setting fresh, so the cache is the only thing a change
    // still has to clear.
    assert.ok(registry.invalidations.length > 0, 'a settings change must invalidate the registry cache')

    const candidates = await provider.list()
    assert.equal(candidates.length, 1)
    const candidate = candidates[0]
    // Every field the registry validates, plus the identity rule that trips
    // silently otherwise: a candidate's provider must be its own provider name.
    assert.equal(candidate.name, 'published-skill')
    assert.equal(candidate.provider, provider.name)
    assert.equal(candidate.source, 'custom')
    assert.equal(typeof candidate.description, 'string')
    assert.ok(candidate.description.length > 0)
    assert.equal(typeof candidate.rank, 'number')
    assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.equal(candidate.resourceBase.path, join(mine, 'published-skill'))

    const definition = await provider.get(candidate, {})
    assert.equal(definition.name, 'published-skill')
    assert.equal(definition.provider, provider.name)
    assert.equal(definition.resourceBase.path, join(mine, 'published-skill'))
    // The model gets the body; the frontmatter is already carried as fields.
    assert.equal(definition.content, '# Body')
  } finally {
    rmSync(mine, { recursive: true, force: true })
  }
})

test('a harness with no skill registry still serves the panel', async () => {
  const root = makeRoot()
  // No `skills` service at all — the shape an older or non-skill harness has.
  const { routes, logs } = await boot(root)

  assert.equal(json(call(routes, 'GET', '/api/dsh-science-skill/skills')).ok, true)
  assert.ok(
    logs.some((line) => /no skill registry/.test(line)),
    'the skip must be reported rather than passed over in silence',
  )
  // The log line is for maintainers; this field is what makes the degradation
  // visible to the person actually looking at the panel.
  assert.equal(
    json(call(routes, 'GET', '/api/dsh-science-skill/import-settings')).providerRegistered,
    false,
    'a harness with no registry must report the capability as unavailable',
  )
})

test('a rescan adopts a hand-copied folder whose name is not a skill id', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-messy-'))
  const api = '/api/dsh-science-skill'
  try {
    const root = makeRoot()
    const { routes } = await boot(root)
    const paths = rootPaths(root)
    json(call(routes, 'POST', `${api}/import-settings`, { defaultSkillDir: mine }))

    // The shape a user actually pastes in: a download folder named after a
    // version. The skill itself is loadable — the provider keys it by its
    // frontmatter name — but the catalog used to reject the folder on its name,
    // so the panel never showed it.
    mkdirSync(join(mine, 'OriginPro 2.0.0'), { recursive: true })
    writeFileSync(join(mine, 'OriginPro 2.0.0', 'SKILL.md'), '---\nname: originpro\ndescription: Draws publication figures.\n---\n')

    const rescan = json(call(routes, 'POST', `${api}/skills/refresh`, {}))
    assert.equal(rescan.ok, true)
    assert.deepEqual(rescan.adopted, ['originpro'])
    assert.deepEqual(rescan.skipped, [])

    // The record is keyed by the frontmatter name and remembers where the folder
    // is, so every lookup works without renaming anything on disk.
    const record = JSON.parse(readFileSync(join(paths.dataDir, 'originpro.json'), 'utf8'))
    assert.equal(record.id, 'originpro')
    assert.equal(record.dir_name, 'OriginPro 2.0.0')
    assert.equal(record.invoke, '/originpro')
    assert.ok(existsSync(join(mine, 'OriginPro 2.0.0', 'SKILL.md')), 'adoption must leave the user files alone')

    // A record whose folder is not its id must not read as an orphan, or the
    // index would drop the skill the moment it was adopted.
    const listed = json(call(routes, 'GET', `${api}/skills`)).skills
    assert.deepEqual(listed.map((skill) => skill.id), ['originpro'])

    // ...and the detail route reads the markdown out of the folder it really is
    // in rather than out of a folder named after the id.
    const detail = json(call(routes, 'GET', `${api}/skills/detail?id=originpro`))
    assert.equal(detail.ok, true)
    assert.match(detail.markdown, /name: originpro/)

    // A later rescan must not adopt it a second time: the folder is covered even
    // though its name is not the id.
    assert.deepEqual(json(call(routes, 'POST', `${api}/skills/refresh`, {})).adopted, [])

    // Deleting removes the folder the user actually has, not a folder named
    // after the id that never existed.
    const deleted = json(call(routes, 'POST', `${api}/skills/delete`, { id: 'originpro' }))
    assert.equal(deleted.ok, true)
    assert.equal(existsSync(join(mine, 'OriginPro 2.0.0')), false)
    assert.equal(existsSync(join(paths.dataDir, 'originpro.json')), false)
  } finally {
    rmSync(mine, { recursive: true, force: true })
  }
})

test('a pasted folder that cannot name itself is reported instead of recorded', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-unusable-'))
  const api = '/api/dsh-science-skill'
  try {
    const root = makeRoot()
    const { routes } = await boot(root)
    json(call(routes, 'POST', `${api}/import-settings`, { defaultSkillDir: mine }))

    // No frontmatter at all: the host would not load this either, so the rescan
    // says so rather than recording a skill that cannot be invoked.
    mkdirSync(join(mine, 'Vibe Coding Rules'), { recursive: true })
    writeFileSync(join(mine, 'Vibe Coding Rules', 'SKILL.md'), '# Web Automated Testing\n')

    // Two folders claiming one frontmatter name — the two copies of a download a
    // user keeps side by side. The first keeps the id; the second is reported,
    // because letting it write the record would strand the first folder's skill.
    for (const folder of ['design-master-2.1.2', 'design-master-2.2.0']) {
      mkdirSync(join(mine, folder), { recursive: true })
      writeFileSync(join(mine, folder, 'SKILL.md'), '---\nname: design-master\ndescription: Builds slides.\n---\n')
    }

    const rescan = json(call(routes, 'POST', `${api}/skills/refresh`, {}))
    assert.deepEqual(rescan.adopted, ['design-master'])
    assert.equal(rescan.skipped.length, 2)
    assert.ok(rescan.skipped.some((entry) => /已被占用/.test(entry.error)), 'the second folder must be reported as shadowed')
    assert.ok(rescan.skipped.some((entry) => /frontmatter/.test(entry.error)), 'the nameless folder must be reported')
  } finally {
    rmSync(mine, { recursive: true, force: true })
  }
})

test('re-importing an existing skill replaces it and says so', async () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-science-skill-again-'))
  const api = '/api/dsh-science-skill'
  try {
    const root = makeRoot()
    const { routes } = await boot(root)

    mkdirSync(join(source, 'gamma-skill'), { recursive: true })
    writeFileSync(join(source, 'gamma-skill', 'SKILL.md'), '---\nname: gamma-skill\ndescription: First copy.\n---\n')
    const first = json(call(routes, 'POST', `${api}/skills/import`, { path: join(source, 'gamma-skill') }))
    assert.equal(first.ok, true)
    assert.equal(first.overwritten, false)

    // The user renamed it in the panel; an overwrite has to keep that, because
    // the record is the only place the Chinese name exists.
    json(call(routes, 'POST', `${api}/skills/update`, { id: 'gamma-skill', displayName: '伽马' }))

    // The panel sends `overwrite: true` on every import: re-adding a skill the
    // user forgot they had, and pasting a newer download over the old copy, are
    // the same gesture and must not stop to ask.
    writeFileSync(join(source, 'gamma-skill', 'SKILL.md'), '---\nname: gamma-skill\ndescription: Second copy.\n---\n')
    // A backup an earlier version of this plugin left for this same skill. An
    // overwrite has to retire it too, or the pile only stops growing instead of
    // shrinking.
    mkdirSync(join(root, 'skills', '.gamma-skill.old-1700000000000'), { recursive: true })
    const again = json(call(routes, 'POST', `${api}/skills/import`, { path: join(source, 'gamma-skill'), overwrite: true }))
    assert.equal(again.ok, true)
    assert.equal(again.overwritten, true)
    assert.match(again.note, /已覆盖更新技能「伽马」/)
    assert.match(readFileSync(join(root, 'skills', 'gamma-skill', 'SKILL.md'), 'utf8'), /Second copy\./)
    // The folder it replaced is deleted, not parked beside the new one: the user
    // picked the version they want, and a directory that keeps every version it
    // has ever held is one nobody can read.
    assert.deepEqual(
      readdirSync(join(root, 'skills')).filter((name) => /^\.gamma-skill\.old-\d+$/.test(name)),
      [],
      'the replaced folder must not be kept as a backup',
    )

    // Without the flag the host still refuses, so a caller that wants to confirm
    // first can still ask for that.
    const refused = call(routes, 'POST', `${api}/skills/import`, { path: join(source, 'gamma-skill') })
    assert.equal(refused.status, 400)
    assert.match(json(refused).error, /already exists/)
  } finally {
    rmSync(source, { recursive: true, force: true })
  }
})

test('re-importing a skill that was adopted replaces the folder it lives in', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-replace-'))
  const source = mkdtempSync(join(tmpdir(), 'dsh-science-skill-newer-'))
  const api = '/api/dsh-science-skill'
  try {
    const root = makeRoot()
    const { routes } = await boot(root)
    const paths = rootPaths(root)
    json(call(routes, 'POST', `${api}/import-settings`, { defaultSkillDir: mine }))

    mkdirSync(join(mine, 'Messy Name'), { recursive: true })
    writeFileSync(join(mine, 'Messy Name', 'SKILL.md'), '---\nname: messy-skill\ndescription: Older copy.\n---\n')
    assert.deepEqual(json(call(routes, 'POST', `${api}/skills/refresh`, {})).adopted, ['messy-skill'])

    // A newer copy of the same skill, imported the normal way. It has to replace
    // where the skill lives now: installing beside the old folder would leave two
    // copies of one skill in the user's directory, both claiming the same name.
    mkdirSync(join(source, 'messy-skill'), { recursive: true })
    writeFileSync(join(source, 'messy-skill', 'SKILL.md'), '---\nname: messy-skill\ndescription: Newer copy.\n---\n')
    const imported = json(call(routes, 'POST', `${api}/skills/import`, { path: join(source, 'messy-skill'), overwrite: true }))
    assert.equal(imported.ok, true)
    assert.equal(imported.overwritten, true)
    assert.equal(existsSync(join(mine, 'Messy Name')), false, 'the replaced folder must be gone, not shadowed')
    assert.equal(
      readdirSync(mine).some((name) => /^\.messy-skill\.old-\d+$/.test(name)),
      false,
      'the folder the import replaced must be deleted, not copied aside',
    )
    assert.match(readFileSync(join(mine, 'messy-skill', 'SKILL.md'), 'utf8'), /Newer copy\./)
    // The record points at a folder named after it now, so the adopted-folder
    // indirection is gone rather than stale.
    assert.equal(JSON.parse(readFileSync(join(paths.dataDir, 'messy-skill.json'), 'utf8')).dir_name, undefined)
    assert.deepEqual(json(call(routes, 'POST', `${api}/skills/refresh`, {})).adopted, [])
  } finally {
    rmSync(mine, { recursive: true, force: true })
    rmSync(source, { recursive: true, force: true })
  }
})

test('retired overwrite backups are listed and can be cleaned up', async () => {
  const mine = mkdtempSync(join(tmpdir(), 'dsh-science-skill-retired-'))
  const api = '/api/dsh-science-skill'
  try {
    const root = makeRoot()
    const { routes } = await boot(root)
    json(call(routes, 'POST', `${api}/import-settings`, { defaultSkillDir: mine }))

    // What versions up to 2.0.5 left behind in the user's own directory: one
    // folder per skill they ever replaced, sitting next to a skill they do have.
    for (const name of ['.alpha-skill.old-1700000000000', '.beta-skill.old-1700000000001']) {
      mkdirSync(join(mine, name), { recursive: true })
      writeFileSync(join(mine, name, 'SKILL.md'), '---\nname: replaced\ndescription: Old copy.\n---\n')
    }
    mkdirSync(join(mine, 'kept-skill'), { recursive: true })
    writeFileSync(join(mine, 'kept-skill', 'SKILL.md'), '---\nname: kept-skill\ndescription: Still here.\n---\n')

    // The settings page needs the names to decide whether to offer the button at
    // all, and the list is what makes the offer truthful.
    const settings = json(call(routes, 'GET', `${api}/import-settings`))
    assert.deepEqual(settings.legacyBackups.sort(), ['.alpha-skill.old-1700000000000', '.beta-skill.old-1700000000001'])

    const cleaned = json(call(routes, 'POST', `${api}/skills/cleanup-backups`, {}))
    assert.equal(cleaned.ok, true)
    assert.equal(cleaned.removed.length, 2)
    assert.equal(existsSync(join(mine, '.alpha-skill.old-1700000000000')), false)
    assert.equal(existsSync(join(mine, '.beta-skill.old-1700000000001')), false)
    // Only the retired backups go: a real skill folder is not this route's to
    // delete, however it happens to be named.
    assert.equal(existsSync(join(mine, 'kept-skill')), true)
    assert.deepEqual(json(call(routes, 'GET', `${api}/import-settings`)).legacyBackups, [])
  } finally {
    rmSync(mine, { recursive: true, force: true })
  }
})
