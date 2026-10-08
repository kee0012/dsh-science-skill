/**
 * Link the development dependencies this package needs into `<pkg>/node_modules`
 * as junctions onto an existing install (pnpm's flat `node_modules/.pnpm/
 * node_modules` directory).
 *
 * Why this exists instead of a plain `pnpm install`: the `@deepseek-ai/*`
 * packages this browser half compiles against are not on the public registry, so
 * `pnpm install --offline` cannot resolve them here. Junctioning gives `tsc` and
 * `tsdown` a real, standard `node_modules`, with no path aliases and no reliance
 * on the checkout's own layout in `tsconfig.json`.
 *
 * This is a **dev-time** remedy, not part of the published package: on a machine
 * that can reach the registry, a normal `pnpm install` fills `node_modules` and
 * this script has nothing left to do.
 *
 * Usage:
 *   node scripts/link-dev-deps.mjs [--source <dir-with-node_modules>] [--check]
 * The source defaults to the first existing candidate among the sibling
 * `science-agent-desktop` checkout and every ancestor of this package.
 */
import { existsSync, mkdirSync, symlinkSync } from 'node:fs'
import { dirname, join, parse, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgDir = resolve(here, '..')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const sourceFlag = args.indexOf('--source')
const explicitSource = sourceFlag === -1 ? undefined : args[sourceFlag + 1]

/** The packages the browser half and the type checker need to resolve. */
const WANTED = [
  'react',
  'react-dom',
  '@types/react',
  '@types/react-dom',
  '@types/node',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-api-gateway',
  '@deepseek-ai/dsh-api-session-controller',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-input-trigger',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-renderer',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-sidebar',
  '@deepseek-ai/dsh-client-ui-slots',
  'tsdown',
  'typescript',
]

/**
 * Candidate directories whose `node_modules` may already hold the packages.
 * @returns absolute candidate directories, nearest first.
 */
function candidates() {
  const list = []
  if (explicitSource !== undefined) list.push(resolve(explicitSource))
  const repo = join(pkgDir, '..', 'science-agent-desktop')
  // `packages` first (a real package's own node_modules), then the workspace
  // root and the web app — pnpm hoists different things to different levels.
  list.push(join(repo, 'packages', 'client', 'ui-science', 'node_modules'))
  list.push(join(repo, 'node_modules'))
  list.push(join(repo, 'apps', 'web', 'node_modules'))
  for (let dir = pkgDir, root = parse(pkgDir).root; dir !== root; dir = dirname(dir)) {
    list.push(join(dir, 'node_modules'))
  }
  return list
}

/**
 * Directories worth resolving against: a plain `node_modules` or pnpm's flat
 * hoist directory underneath one, admitted when it holds at least one wanted
 * package (pnpm hoists different packages to different levels).
 * @returns every usable directory, nearest first.
 */
function sources() {
  const found = []
  for (const base of candidates()) {
    for (const dir of [base, join(base, '.pnpm', 'node_modules')]) {
      if (found.includes(dir)) continue
      if (WANTED.some(name => existsSync(join(dir, name, 'package.json')))) found.push(dir)
    }
  }
  return found
}

const allSources = sources()
if (allSources.length === 0) {
  console.error('link-dev-deps: no source node_modules holding `react` was found.')
  console.error('  pass one explicitly: node scripts/link-dev-deps.mjs --source <dir>')
  process.exit(1)
}
const source = allSources[0]

/**
 * Resolve one package name against every source.
 * @param name - bare or scoped package name.
 * @returns the directory holding its package.json, or undefined.
 */
function resolvePackage(name) {
  return allSources.find(dir => existsSync(join(dir, name, 'package.json')))
}

const missing = WANTED.filter(name => resolvePackage(name) === undefined)

if (checkOnly) {
  console.log(`link-dev-deps: sources ${allSources.join(', ')}`)
  for (const name of WANTED) {
    const target = join(pkgDir, 'node_modules', name)
    console.log(`  ${existsSync(target) ? 'ok  ' : 'MISS'} ${name}`)
  }
  process.exit(missing.length === 0 ? 0 : 1)
}

const into = join(pkgDir, 'node_modules')
mkdirSync(into, { recursive: true })

let linked = 0
for (const name of WANTED) {
  const from = resolvePackage(name)
  if (from === undefined) {
    console.warn(`  skip ${name} (not present in any source)`)
    continue
  }
  const target = join(into, name)
  if (!existsSync(target)) {
    mkdirSync(dirname(target), { recursive: true })
    symlinkSync(join(from, name), target, 'junction')
  }
  linked += 1
}

console.log(`link-dev-deps: ${linked}/${WANTED.length} package(s) linked from ${allSources.join(' + ')}`)
if (missing.length > 0) {
  console.warn(`link-dev-deps: not in any source: ${missing.join(', ')}`)
  console.warn('link-dev-deps: typechecking will fail for those; install them and re-run.')
}
