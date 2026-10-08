/**
 * One-shot converter: turn the two panels copied out of `ui-science` into
 * self-contained files of this plug-in.
 *
 * Three mechanical edits, no reformatting (so the result stays line-for-line
 * comparable with the originals):
 *
 *   1. `import css from './X.module.css'` → the generated class-name map, and
 *      every `css.<name>` → `styles.<name>`. The host has no CSS loader, so
 *      `scripts/build-styles.mjs` bakes the class names into a TS module.
 *   2. `/science/api/<x>` → `${API_BASE}/<x>`; the route prefix is the package
 *      name and lives in one constant.
 *   3. `science:catalog-changed` → `dsh-science-skill:catalog-changed`, so the
 *      plug-in's refresh signal cannot be confused with (or accidentally fired
 *      by) the in-tree panel that may still be mounted.
 *
 * Run from the package root: `node scripts/codemod-milestone2.mjs`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const EVENT = 'dsh-science-skill:catalog-changed'

/**
 * Rewrite one file in place.
 * @param file - Absolute path.
 * @param sheet - Generated class-name map export to import (`SkillStrip` or
 * `SkillSettingsSection`).
 * @returns the number of substitutions made, per edit kind.
 */
function convert(file, sheet) {
  let text = readFileSync(file, 'utf8')
  const before = text

  // 1. class names
  const importLine = /^import css from '\.\/[\w]+\.module\.css'$/m
  if (!importLine.test(text)) throw new Error(`no css import in ${file}`)
  text = text.replace(importLine, `import { ${sheet} as styles } from './styles/class-names.ts'`)
  const cssUses = (text.match(/\bcss\./g) ?? []).length
  text = text.replace(/\bcss\./g, 'styles.')

  // 2. route prefix
  const plainApis = (text.match(/'\/science\/api\//g) ?? []).length
  text = text.replace(/'\/science\/api\//g, '`${API_BASE}/')
  const tmplApis = (text.match(/`\/science\/api\//g) ?? []).length
  text = text.replace(/`\/science\/api\//g, '`${API_BASE}/')

  // `'${API_BASE}/x'` still needs its closing quote swapped for a backtick.
  // Every call site puts the route on one line, so a per-line fix is enough.
  text = text.split('\n').map((line) => {
    if (!line.includes('`${API_BASE}/')) return line
    const start = line.indexOf('`${API_BASE}/')
    const after = line.slice(start)
    const close = after.indexOf("'")
    if (close === -1) return line
    return line.slice(0, start) + after.slice(0, close) + '`' + after.slice(close + 1)
  }).join('\n')

  // 3. refresh signal
  const events = (text.match(new RegExp(`'science:catalog-changed'`, 'g')) ?? []).length
  text = text.replace(/'science:catalog-changed'/g, `'${EVENT}'`)

  // 4. import API_BASE next to the other local imports
  if (text.includes('API_BASE') && !text.includes('import { API_BASE }')) {
    const anchor = /^import \{ matchesSkillQuery \} from '\.\/skill-search\.ts'$/m
    if (!anchor.test(text)) throw new Error(`no import anchor in ${file}`)
    text = text.replace(anchor, "import { API_BASE } from './skill-gate.ts'\n$&")
  }

  if (text === before) throw new Error(`nothing changed in ${file}`)
  writeFileSync(file, text)
  return { file, cssUses, apis: plainApis + tmplApis, events }
}

for (const [name, sheet] of [['SkillStrip', 'SkillStrip'], ['SkillSettingsSection', 'SkillSettingsSection']]) {
  const result = convert(join(root, 'src', 'client', `${name}.tsx`), sheet)
  console.log(`codemod ${name}.tsx: class refs=${result.cssUses}, routes=${result.apis}, events=${result.events}`)
}
