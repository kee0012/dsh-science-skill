/**
 * The client bundle contract.
 *
 * A package declaring `dsh.client` that ships no bundle fails composition at
 * boot — a page-level "failed to load plugins" error. This test loads the real
 * `lib/client.js` through a module-loader stub and then *runs* the factory, so
 * it proves the bundle is a genuine cordis plugin, not just a syntactically
 * valid file.
 *
 * `require` is answered from the real dev dependencies when they are installed,
 * and with an empty namespace otherwise: the bundle only reads the external
 * modules at factory time, and nothing here calls into React.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(here, '..')
const bundlePath = join(pkgRoot, 'lib', 'client.js')
const localRequire = createRequire(import.meta.url)

/** The external rows the bundle leaves to the page's module table. */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-primitives',
]

/**
 * Answer one `require` from the bundle.
 * @param id - module id the bundle asked for.
 * @returns the real module when installed, else an empty namespace.
 */
function requireFrom(id) {
  if (!EXTERNALS.includes(id)) return {}
  try {
    return localRequire(id)
  } catch {
    return {}
  }
}

/**
 * Evaluate the bundle and return the registration it submits.
 * @returns the facade argument the bundle passed to the module loader.
 */
function registerBundle() {
  let registration
  globalThis.window = { __ModuleLoader__: { load: (value) => { registration = value } } }
  try {
    new Function(readFileSync(bundlePath, 'utf8'))()
  } finally {
    delete globalThis.window
  }
  return registration
}

test('the built client bundle registers itself under the package name', () => {
  assert.equal(existsSync(bundlePath), true, 'run `node scripts/build-host.mjs` then tsdown first')
  const registration = registerBundle()
  assert.ok(registration, 'the bundle must call window.__ModuleLoader__.load')
  assert.equal(registration.id, 'dsh-science-skill')
  assert.equal(typeof registration.factory, 'function')
})

test('the client entry is a cordis plugin with no default export', () => {
  const registration = registerBundle()
  const plugin = registration.factory(requireFrom)
  assert.ok(plugin, 'the factory must return the bundle exports')
  assert.equal(plugin.name, 'dsh-science-skill')
  assert.equal('default' in plugin, false)
  assert.equal(typeof plugin.apply, 'function')
  assert.ok(Array.isArray(plugin.inject), 'inject must be a string array')
  for (const seat of plugin.inject) assert.equal(typeof seat, 'string')
  // Every service this half reads must be *declared*: cordis seats only the
  // declared ones, and a seat that is merely read is a race — reading
  // `ctx.get('conversation')` without it answered `undefined` and the composer
  // insert died with `Cannot read properties of undefined (reading 'input')`.
  for (const seat of ['slots', 'sessions', 'conversation', 'locale', 'inputTriggers', 'layout']) {
    assert.ok(plugin.inject.includes(seat), `the ${seat} seat must be declared`)
  }
})

test('the client half registers the slash source instead of injecting into the registry', () => {
  const source = readFileSync(bundlePath, 'utf8')
  // The in-tree build had `inputTriggers.inject([...], cb)`; on a stock runtime
  // the service face is `registerSource` alone, and calling the missing method
  // threw out of `apply`, killing every seat below it. The behavioural test
  // below is the real guard; this only pins the vocabulary.
  assert.ok(source.includes('registerSource'), 'the slash source must be registered')
})

test('the bundle inlines the panel stylesheets instead of emitting assets', () => {
  const source = readFileSync(bundlePath, 'utf8')
  assert.ok(source.includes('data-plugin-css'), 'the style injector must be bundled')
  assert.ok(source.includes('--dsw-sci-'), 'the compiled stylesheets must be inlined')
})

/**
 * A `document` with just enough of `head` for the style injector.
 * @returns the stub document and the head's live child list.
 */
function fakeDocument() {
  const head = {
    children: [],
    querySelector: (selector) => {
      const wanted = /^style\[data-plugin-css="(.+)"\]$/.exec(selector)
      if (wanted === null) return null
      return head.children.find((tag) => tag.dataset.pluginCss === wanted[1]) ?? null
    },
    appendChild: (tag) => {
      head.children.push(tag)
      return tag
    },
  }
  const document = {
    head,
    createElement: () => ({
      dataset: {},
      textContent: '',
      remove() {
        const index = head.children.indexOf(this)
        if (index >= 0) head.children.splice(index, 1)
      },
    }),
  }
  return { document, head }
}

test('apply installs the sheets and registers the slash source, then tears both down', async () => {
  const { document, head } = fakeDocument()
  const previous = globalThis.document
  globalThis.document = document
  try {
    const plugin = registerBundle().factory(requireFrom)
    const effects = []
    const sources = []
    plugin.apply({
      // cordis runs the body immediately and keeps what it returns as teardown.
      effect: (execute, label) => effects.push({ label, dispose: execute() }),
      get: () => undefined,
      slots: { inject: () => {}, register: () => () => {} },
      inputTriggers: {
        registerSource: (source) => {
          sources.push(source)
          return () => {}
        },
      },
    })

    // Regression guard: the sheets must be in the document *at setup*. Handing
    // cordis `() => install` made the installer the teardown, so an active
    // plugin rendered its panels with no stylesheet at all.
    assert.deepEqual(
      head.children.map((tag) => tag.dataset.pluginCss),
      [
        'dsh-science-skill/skills-settings.css',
        'dsh-science-skill/skills-strip.css',
        // The skill-detail dialog's sheet: the plugin has no other style
        // injection channel, so a sheet that is not registered here simply does
        // not exist in the page.
        'dsh-science-skill/skills-detail.css',
      ],
    )
    assert.equal(head.children[0].dataset.plugin, 'dsh-science-skill')
    assert.equal(effects[0].label, 'dsh-science-skill: panel styles')
    assert.equal(effects[1].label, 'dsh-science-skill: slash source')

    assert.equal(sources.length, 1)
    assert.equal(sources[0].trigger, '/')
    assert.equal(sources[0].name, 'science-skill')
    assert.equal(sources[0].codec.clipboardText('academic-figures'), '/academic-figures')
    assert.equal(await sources[0].codec.serialize('academic-figures'), '/academic-figures')
    assert.deepEqual(await sources[0].candidates(), [])

    effects[0].dispose()
    assert.deepEqual(head.children, [], 'the teardown must pull the sheets back out')
  } finally {
    globalThis.document = previous
  }
})

test('the sidebar row and the main panel it opens share one id', () => {
  const { document } = fakeDocument()
  const previous = globalThis.document
  globalThis.document = document
  try {
    const plugin = registerBundle().factory(requireFrom)
    const registrations = []
    const selected = []

    plugin.apply({
      effect: (execute) => execute(),
      get: () => undefined,
      slots: {
        // `inject` runs the callback once the seat is declared; a stock runtime
        // never calls it for a seat nobody declares, which is the failure this
        // test exists to catch, so the stub fires it immediately.
        inject: (_name, callback) => { callback() },
        register: (spec) => { registrations.push(spec); return () => {} },
      },
      layout: { selectPanel: (id) => selected.push(id) },
      inputTriggers: { registerSource: () => () => {} },
    })

    const names = registrations.map((spec) => spec.name)
    assert.ok(names.includes('settings.section'), 'the settings section must still register')
    // The tree used to be registered into `sidebar.skills`. That seat belongs to
    // the Science Agent fork's build; stock DSH declares only brand marks, the
    // toggle badge, `sidebar.panellist`, `sidebar.workspaces`, `sidebar.settings`
    // and `sidebar.footer.action`. Registering into the missing seat left an
    // injection waiting on a slot nobody declares, so the tree never rendered.
    assert.equal(names.includes('sidebar.skills'), false, 'that seat does not exist in stock DSH')
    assert.ok(names.includes('sidebar.panellist'), 'the sidebar row must register')
    assert.ok(names.includes('main'), 'the panel the row opens must register')

    const row = registrations.find((spec) => spec.name === 'sidebar.panellist')
    const panel = registrations.find((spec) => spec.name === 'main')
    // The row selects a `main` entry by its key, so a drifted pair opens nothing.
    assert.equal(row.id, 'science-skills')
    assert.equal(panel.key, row.id)
    assert.equal(typeof row.label, 'string')

    // A row that fills the composer has to hand it back: the tree lives in the
    // centre column, so without this the reference lands in a composer the user
    // cannot see. Sessions are stubbed out, so the insert itself warns and the
    // panel switch is the observable part.
    const { addSkill } = panel.inject()
    addSkill({ id: 'writing-guard', invoke: '/writing-guard' })
    assert.deepEqual(selected, ['conversation'])
  } finally {
    globalThis.document = previous
  }
})

test('an example is inserted behind its skill, never on its own', () => {
  const { document } = fakeDocument()
  const previous = globalThis.document
  globalThis.document = document
  try {
    const plugin = registerBundle().factory(requireFrom)
    const registrations = []

    // This records the whole sequence, not just the two writes. Each write
    // captures its own caret before it lands, so seeing `capture` again *after*
    // the reference is what proves the prose is placed behind the chip rather
    // than beside it. The bug this pins: the example used to insert alone, and
    // the user got a sentence with no skill attached — the model had no way to
    // know which skill was meant.
    const calls = []
    const actions = {
      captureInsertion: () => { calls.push({ op: 'capture' }); return { id: calls.length } },
      insertText: (text, span) => { calls.push({ op: 'text', text, span }); return true },
    }
    const input = {
      actions,
      insertReference: (reference, span) => {
        calls.push({ op: 'reference', ref: reference.ref, span })
        return Promise.resolve()
      },
    }
    const sessions = {
      list: { getSnapshot: () => ({ ids: ['session-1'] }) },
      retainInfo: () => ({ getSnapshot: () => ({ retainedBy: { mainView: 1 } }) }),
      binding: () => ({ ctx: {} }),
    }

    plugin.apply({
      effect: (execute) => execute(),
      get: (key) => (key === 'sessions' ? sessions : undefined),
      conversation: { input: { for: () => input } },
      slots: {
        inject: (_name, callback) => { callback() },
        register: (spec) => { registrations.push(spec); return () => {} },
      },
      layout: { selectPanel: () => {} },
      inputTriggers: { registerSource: () => () => {} },
    })

    const panel = registrations.find((spec) => spec.name === 'main')
    const { insertExample } = panel.inject()
    insertExample(
      { id: 'academic-humanizer-zh', invoke: '/academic-humanizer-zh' },
      '这篇论文摘要AI味太重，帮我按核心期刊风格改一下。',
    )

    assert.deepEqual(
      calls.map((call) => call.op),
      ['capture', 'reference', 'capture', 'text'],
      'the caret must be captured again after the reference, or the prose lands before the skill',
    )
    assert.equal(calls[1].ref, 'academic-humanizer-zh')
    // The leading space is what stops the sentence from reading as part of the
    // chip once the two sit next to each other.
    assert.equal(calls[3].text, ' 这篇论文摘要AI味太重，帮我按核心期刊风格改一下。')
  } finally {
    globalThis.document = previous
  }
})

test('an example inserts nothing when its skill cannot be referenced', () => {
  // Both or neither. If the reference cannot land, inserting the sentence alone
  // is exactly the defect this path was fixed for: prose in the composer that
  // the model cannot attribute to any skill.
  const { document } = fakeDocument()
  const previous = globalThis.document
  globalThis.document = document
  try {
    const plugin = registerBundle().factory(requireFrom)
    const registrations = []
    const calls = []
    const input = {
      actions: {
        captureInsertion: () => { calls.push('capture'); return { id: 1 } },
        insertText: (text) => { calls.push(`text:${text}`); return true },
      },
      insertReference: () => { calls.push('reference'); return Promise.resolve() },
    }
    // A session exists, but the main view is not retaining it — so there is no
    // composer to reference into, and the example must be dropped whole.
    const sessions = {
      list: { getSnapshot: () => ({ ids: ['session-1'] }) },
      retainInfo: () => ({ getSnapshot: () => ({ retainedBy: {} }) }),
      binding: () => ({ ctx: {} }),
    }

    plugin.apply({
      effect: (execute) => execute(),
      get: (key) => (key === 'sessions' ? sessions : undefined),
      conversation: { input: { for: () => input } },
      slots: {
        inject: (_name, callback) => { callback() },
        register: (spec) => { registrations.push(spec); return () => {} },
      },
      layout: { selectPanel: () => {} },
      inputTriggers: { registerSource: () => () => {} },
    })

    const panel = registrations.find((spec) => spec.name === 'main')
    panel.inject().insertExample({ id: 'academic-humanizer-zh', invoke: '/academic-humanizer-zh' }, '一句话')
    assert.deepEqual(calls, [], 'an orphan sentence must not be left in the composer')
  } finally {
    globalThis.document = previous
  }
})

/**
 * Mount the plugin with a chosen `uiWorkspace` service and hand back the
 * settings section's injected picker — the same call the 选择目录 button makes.
 * @param uiWorkspace - the service `ctx.get('uiWorkspace')` should answer.
 * @returns the picker the settings seat injects.
 */
function settingsPicker(uiWorkspace) {
  const { document } = fakeDocument()
  globalThis.document = document
  const plugin = registerBundle().factory(requireFrom)
  const registrations = []
  plugin.apply({
    effect: (execute) => execute(),
    get: (key) => (key === 'uiWorkspace' ? uiWorkspace : undefined),
    slots: { inject: (_name, callback) => { callback() }, register: (spec) => { registrations.push(spec); return () => {} } },
    layout: { selectPanel: () => {} },
    inputTriggers: { registerSource: () => () => {} },
  })
  const section = registrations.find((spec) => spec.name === 'settings.section')
  assert.ok(section, 'the settings seat must register')
  return section.inject().pickDirectory
}

/** Run `body` with `__DSH_DIRECTORY_PICKER__` replaced, restoring it after. */
async function withDesktopBridge(bridge, body) {
  const previous = globalThis.__DSH_DIRECTORY_PICKER__
  const previousDocument = globalThis.document
  if (bridge === undefined) delete globalThis.__DSH_DIRECTORY_PICKER__
  else globalThis.__DSH_DIRECTORY_PICKER__ = bridge
  try {
    return await body()
  } finally {
    globalThis.document = previousDocument
    if (previous === undefined) delete globalThis.__DSH_DIRECTORY_PICKER__
    else globalThis.__DSH_DIRECTORY_PICKER__ = previous
  }
}

test('the picker uses the desktop shell bridge when the app exposes one', async () => {
  // The regression: the fork asked only for `remote.directoryPicker`, which this
  // runtime does not serve, so both 选择目录 and + 添加目录 answered "cancelled"
  // and no dialog ever opened. The preload bridge is the surface a desktop
  // install actually has.
  await withDesktopBridge({ pick: async () => 'D:\\picked\\skills' }, async () => {
    const pickDirectory = settingsPicker(undefined)
    assert.equal(await pickDirectory(), 'D:\\picked\\skills')
  })
})

test('a desktop bridge failure falls through to the workspace service', async () => {
  await withDesktopBridge({ pick: async () => { throw new Error('no display') } }, async () => {
    const pickDirectory = settingsPicker({ pickDirectory: async () => 'D:\\from\\workspace' })
    assert.equal(await pickDirectory(), 'D:\\from\\workspace')
  })
})

test('a cancelled dialog is not retried through the next picker', async () => {
  // Falling through on `null` would open a second chooser over the one the user
  // just dismissed, so the cascade has to stop there.
  let workspaceAsked = false
  await withDesktopBridge({ pick: async () => null }, async () => {
    const pickDirectory = settingsPicker({
      pickDirectory: async () => { workspaceAsked = true; return 'D:\\too\\late' },
    })
    assert.equal(await pickDirectory(), null)
  })
  assert.equal(workspaceAsked, false, 'a cancelled dialog must end the cascade')
})

test('the board is a tabbed card grid, not the old accordion', () => {
  // The panel was an accordion of category rows with pointer-drag reordering.
  // It is now a category tab strip over a card grid. Pinning the vocabulary is
  // what keeps a future edit from quietly restoring the accordion (or dropping
  // the summon affordance) without anyone noticing in review.
  const source = readFileSync(bundlePath, 'utf8')
  for (const marker of ['召唤', 'ScienceSkillBoard', 'tablist', 'tabpanel']) {
    assert.ok(source.includes(marker), `the board must carry ${marker}`)
  }
  for (const gone of ['data-dragging', 'dragKey', 'saveCategoryOrder']) {
    assert.equal(source.includes(gone), false, `${gone} belongs to the removed accordion`)
  }
})

test('every class each component references is emitted by the stylesheet build', () => {
  // A CSS Module name the map does not carry renders as the literal string
  // "undefined" on the element — invisible to review and to any test that only
  // checks the bundle loads. This caught a real one: the activation switch's
  // off branch referenced `styles.gateOff`, which no rule defines, so every
  // un-pinned skill carried `class="gateToggle undefined"` and nobody could see
  // it, because off is the default look.
  //
  // Every component is checked, not just the board: the same mistake is just as
  // easy in the settings panel and the detail dialog.
  const classNames = readFileSync(join(pkgRoot, 'src', 'client', 'styles', 'class-names.ts'), 'utf8')

  /** @returns the emitted class names the map declares for one sheet. */
  const emittedFor = (sheet) => {
    // Split on the next `export const` so a sheet's map is not polluted by the
    // one that follows it.
    const after = classNames.split(`export const ${sheet}`)[1]
    assert.ok(after, `class-names.ts must carry the ${sheet} map`)
    const block = after.split('export const ')[0]
    return new Set([...block.matchAll(/"([A-Za-z_$][\w$]*)":/g)].map((m) => m[1]))
  }

  const components = [
    ['SkillStrip.tsx', 'SkillStrip'],
    ['SkillDetail.tsx', 'SkillDetail'],
    ['SkillSettingsSection.tsx', 'SkillSettingsSection'],
  ]

  for (const [file, sheet] of components) {
    const source = readFileSync(join(pkgRoot, 'src', 'client', file), 'utf8')
    const emitted = emittedFor(sheet)
    assert.ok(emitted.size > 10, `${sheet}: the map should carry the whole sheet, not a stub`)

    const referenced = new Set([...source.matchAll(/\bstyles\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))
    assert.ok(referenced.size > 5, `${file}: should reference its sheet through \`styles\``)

    const missing = [...referenced].filter((key) => !emitted.has(key)).sort()
    assert.deepEqual(missing, [], `${file}: these classes would render as "undefined": ${missing.join(', ')}`)
  }
})

/**
 * Candidate paths of the running DSH host bundle, which is the only place the
 * design tokens are actually defined.
 * @returns the first existing path, or undefined when this machine ships none.
 */
function hostAsarPath() {
  const candidates = [
    process.env.DSH_APP_ASAR,
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'deepseek harness', 'resources', 'app.asar'),
    'D:\\Program Files\\deepseek harness\\resources\\app.asar',
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate))
}

test('every host token the stylesheets read is a name the host actually defines', (t) => {
  // Checked against the real host bundle rather than a checked-in list: such a
  // list drifts with the DSH version, and a stale entry would bless exactly the
  // typos this guards against.
  const asar = hostAsarPath()
  if (!asar) {
    t.skip('no DSH app.asar on this machine')
    return
  }
  // latin1: token names are ASCII, and it skips decoding the whole archive.
  const host = readFileSync(asar, 'latin1')
  const defined = new Set([...host.matchAll(/(--dsw-[\w-]+)\s*:/g)].map((m) => m[1]))
  assert.ok(defined.size > 100, `the host should define its token set, found ${defined.size}`)

  const referenced = new Map()
  for (const sheet of ['SkillStrip', 'SkillDetail', 'SkillSettingsSection']) {
    const css = readFileSync(join(pkgRoot, 'src', 'client', `${sheet}.module.css`), 'utf8')
    for (const match of css.matchAll(/var\(\s*(--dsw-[\w-]+)/g)) referenced.set(match[1], sheet)
  }
  assert.ok(referenced.size > 10, 'the stylesheets should read host tokens')

  // `--dsw-sci-*` is this plugin's own namespace, declared in the sheets' token
  // block; every other `--dsw-*` name has to exist in the host.
  const missing = [...referenced.keys()]
    .filter((name) => !name.startsWith('--dsw-sci-'))
    .filter((name) => !defined.has(name))
    .sort()
  assert.deepEqual(
    missing,
    [],
    `these tokens are not host names, so each falls back to its literal: ${missing.join(', ')}`,
  )

  // The bug this caught: the sheets asked for `--dsw-alias-text-primary`, which
  // the host has never defined, so every card title fell back to a dark literal
  // and vanished on the dark theme's cards. The host labels text through
  // `--dsw-alias-label-*`.
  assert.equal(
    defined.has('--dsw-alias-text-primary'),
    false,
    'the host gained a text-* alias — revisit the token names in the stylesheets',
  )
  assert.ok(defined.has('--dsw-alias-label-primary'), 'the host labels text through label-*')
})
