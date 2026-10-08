/**
 * Compile the browser half's stylesheets into runtime-injected CSS strings.
 *
 * The client module loader has no CSS pipeline: `tsdown` leaves no `.css` file
 * in the bundle and a browser bundle cannot `import './X.module.css'` the way a
 * Vite app does. The plugin family's established answer is an exported CSS text
 * plus a `<style>` tag mounted by the plugin (see dsh-academic-figure's
 * `src/client/ui/inject.ts`), and this repository takes the same route.
 *
 * The panel styles arrive here as CSS Modules (`SkillSettingsSection.module.css`,
 * `CategoryTree.module.css`, `ScienceCategoryIcon` glyph artwork aside). CSS
 * Modules do two things for their authors: they scope selectors so two files may
 * reuse a name, and they expose a class-name map to the component. This script
 * reproduces exactly that, without a bundler:
 *
 *  - a class name used by more than one stylesheet is prefixed with its file's
 *    own prefix (`ss-settings-root`, `ss-tree-root`), which is the collision
 *    CSS Modules would otherwise resolve with a hash. Names that occur in one
 *    file only are left alone, so the generated styles stay diffable against the
 *    originals;
 *  - the class-name map is emitted as a TypeScript module per stylesheet, so the
 *    component reads `styles.root` exactly where it read `css.root`.
 *
 * Usage:
 *   node scripts/build-styles.mjs           # compile into src/client/styles/
 *   node scripts/build-styles.mjs --check   # verify the outputs are current
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(here, '..')
const sourceDir = join(pkgRoot, 'src', 'client')
const outDir = join(sourceDir, 'styles')
const check = process.argv.includes('--check')

/**
 * The stylesheets to convert, in a fixed order. `prefix` is what a shared class
 * name is qualified with; `cssKey` is the dedupe key of the injected <style>
 * tag (the plugin's own namespace, not another plugin's).
 */
const SHEETS = [
  {
    id: 'SkillSettingsSection',
    source: join(sourceDir, 'SkillSettingsSection.module.css'),
    prefix: 'ss-settings',
    cssKey: 'dsh-science-skill/skills-settings.css',
  },
  {
    id: 'SkillStrip',
    source: join(sourceDir, 'SkillStrip.module.css'),
    prefix: 'ss-tree',
    cssKey: 'dsh-science-skill/skills-strip.css',
  },
  {
    id: 'SkillDetail',
    source: join(sourceDir, 'SkillDetail.module.css'),
    prefix: 'ss-detail',
    cssKey: 'dsh-science-skill/skills-detail.css',
  },
]

/**
 * The palette the panels' CSS Modules already referenced, lifted out of the
 * science layer's body-level `academic-theme.css`.
 *
 * Only the plug-in's own `--dsw-sci-*` values travel: the academic overlay also
 * repaints the whole harness (alias tokens on `body`, chat bubbles, the sent
 * message's skill chip) as the Science Agent brand, and a skill-management
 * plug-in has no business restyling somebody else's window. What the panels
 * genuinely need is the sci palette they were authored against, declared on the
 * plug-in's own root elements so the values resolve where they are used and
 * cannot leak out. Both variants are keyed off the host's own dark-theme hook
 * (`body[data-ds-dark-theme]`).
 */
const SCI_TOKENS = `/* Science palette the panels were authored against, scoped to this
   plugin's own roots. Declared here rather than on :root: a custom property is
   resolved on the element that uses it, so the host's body-level aliases are
   already inherited by the time these are read, and nothing escapes into the
   rest of the window. */
:where(.ss-settings-root, .ss-tree-root) {
  --dsw-sci-paper: rgb(247, 244, 238);
  --dsw-sci-paper-2: rgb(255, 253, 248);
  --dsw-sci-paper-3: rgb(239, 234, 224);
  --dsw-sci-ink: rgb(34, 41, 46);
  --dsw-sci-ink-2: rgb(91, 100, 107);
  --dsw-sci-teal: rgb(14, 107, 92);
  --dsw-sci-teal-ink: rgb(10, 81, 70);
  --dsw-sci-teal-soft: rgb(227, 239, 233);
  --dsw-sci-terra: rgb(179, 84, 30);
}

body[data-ds-dark-theme] :where(.ss-settings-root, .ss-tree-root) {
  --dsw-sci-paper: rgb(24, 26, 29);
  --dsw-sci-paper-2: rgb(30, 33, 36);
  --dsw-sci-paper-3: rgb(40, 44, 48);
  --dsw-sci-ink: rgb(226, 228, 224);
  --dsw-sci-ink-2: rgb(160, 166, 170);
  --dsw-sci-teal: rgb(64, 178, 156);
  --dsw-sci-teal-ink: rgb(120, 210, 190);
  --dsw-sci-teal-soft: rgb(28, 52, 47);
}
`

/** Remove `/* … *\/` comments; keeps `/*! … *\/` (a licence banner survives). */
function stripComments(css) {
  return css.replace(/\/\*(?!\!)[\s\S]*?\*\//g, '')
}

/**
 * @param css - stylesheet source.
 * @returns every class name the sheet mentions, in source order.
 */
function classNamesOf(css) {
  const names = []
  for (const match of stripComments(css).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    if (!names.includes(match[1])) names.push(match[1])
  }
  return names
}

/**
 * @param css - stylesheet source.
 * @param prefix - qualifier for class names this sheet shares with another.
 * @param shared - class names more than one sheet uses.
 * @returns the stylesheet with every shared class name qualified.
 */
function rewriteClasses(css, prefix, shared) {
  const body = stripComments(css)
  let out = ''
  let last = 0
  for (const match of body.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    // Only the name token is touched, so `.root:hover` and `.root .child` keep
    // their combinators, and a name that merely contains another name
    // (`.cardTop` vs `.card`) is matched as the whole word it is.
    if (!shared.has(match[1])) continue
    out += body.slice(last, match.index) + '.' + prefix + '-' + match[1]
    last = match.index + match[0].length
  }
  return (out + body.slice(last)).trim()
}

/**
 * @param sheet - sheet record.
 * @param css - compiled stylesheet text.
 * @returns the generated TypeScript module for one sheet.
 */
function moduleFor(sheet, css) {
  const lines = [
    '// Generated by scripts/build-styles.mjs — do not edit by hand.',
    `// Source: ${relative(pkgRoot, sheet.source).replace(/\\/g, '/')}`,
    '',
    `/** Dedupe key of the <style> tag this sheet is injected under. */`,
    `export const CSS_KEY = ${JSON.stringify(sheet.cssKey)}`,
    '',
    `/** The stylesheet, injected once by installPanelStyles(). */`,
    `export const CSS = ${JSON.stringify(css)}`,
    '',
  ]
  return lines.join('\n')
}

/**
 * @param name - stylesheet id.
 * @param names - class names it uses.
 * @returns the generated TypeScript map module.
 */
function namesModuleFor(name, names) {
  const lines = [
    '// Generated by scripts/build-styles.mjs — do not edit by hand.',
    '',
    `/** Authored class name → emitted class name (shared names are prefixed). */`,
    `export const ${name}: Readonly<Record<string, string>> = {`,
  ]
  for (const [authored, emitted] of names) {
    lines.push(`  ${JSON.stringify(authored)}: ${JSON.stringify(emitted)},`)
  }
  lines.push('}', '')
  return lines.join('\n')
}

async function main() {
  const sources = []
  for (const sheet of SHEETS) {
    const css = await readFile(sheet.source, 'utf8')
    sources.push({ sheet, names: classNamesOf(css), css })
  }

  const used = new Map()
  for (const { names } of sources) {
    for (const name of names) used.set(name, (used.get(name) ?? 0) + 1)
  }
  const shared = new Set([...used].filter(([, count]) => count > 1).map(([name]) => name))

  await mkdir(outDir, { recursive: true })
  const outputs = []
  const maps = []
  for (const { sheet, names, css } of sources) {
    const compiled = SCI_TOKENS + '\n' + rewriteClasses(css, sheet.prefix, shared) + '\n'
    const map = names.map((name) => [name, shared.has(name) ? `${sheet.prefix}-${name}` : name])
    outputs.push([join(outDir, `${sheet.id}.ts`), moduleFor(sheet, compiled)])
    maps.push([sheet.id, map])
  }
  outputs.push([join(outDir, 'class-names.ts'), maps.map(([name, map]) => namesModuleFor(name, map)).join('\n')])

  for (const [path, contents] of outputs) {
    if (check) {
      let current
      try {
        current = await readFile(path, 'utf8')
      } catch {
        throw new Error(`build:styles --check: missing ${relative(pkgRoot, path)}`)
      }
      if (current !== contents) {
        throw new Error(`build:styles --check: stale ${relative(pkgRoot, path)} — run: node scripts/build-styles.mjs`)
      }
      continue
    }
    await writeFile(path, contents, 'utf8')
  }

  const sharedList = [...shared].sort().join(', ')
  console.log(
    check
      ? `build:styles --check ok (${sources.length} stylesheet(s), ${shared.size} shared class name(s))`
      : `build:styles wrote ${outputs.length} file(s) to src/client/styles/ (${sources.length} stylesheet(s); shared names prefixed: ${sharedList || 'none'})`,
  )
}

await main()
