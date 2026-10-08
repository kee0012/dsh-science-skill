/**
 * dsh-science-skill build.
 *
 * Two independent halves:
 *
 * - The **browser half** is bundled here for the dsh module loader
 *   (`window.__ModuleLoader__.load`), exactly as the other client plugins do.
 *   It is TSX, talks to the official slots, and gets its CSS Modules compiled
 *   by `scripts/build-styles.mjs` before `tsdown` runs.
 * - The **node half** is plain ESM JavaScript with nothing to compile; it is
 *   published by copying `src/host` to `lib/` (see `scripts/build-host.mjs`),
 *   which keeps its relative imports identical to the source tree.
 *
 * Milestone 2 introduces `src/client`.
 */
import type { UserConfig } from 'tsdown'
import { existsSync } from 'node:fs'

const ID = 'dsh-science-skill'

/**
 * Module-table entries this bundle may leave external: platform seed rows
 * answered by the loader's require. Everything else is bundled.
 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-primitives',
]

const prod = process.env.NODE_ENV ?? 'production'

const clientConfig: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  // Unminified on purpose: the ModuleLoader registration is part of the
  // plugin contract (`window.__ModuleLoader__.load({ id: "dsh-science-skill"`),
  // and /dsh-plugin-studio's verifier matches that literal in the artifact.
  // Official client bundles ship unminified for the same reason.
  minify: false,
  sourcemap: false,
  clean: false,
  deps: {
    neverBundle: [...EXTERNALS],
    alwaysBundle: (id: string) => !EXTERNALS.includes(id),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(prod),
    'import.meta.env.MODE': JSON.stringify(prod),
    'import.meta.env': JSON.stringify({ MODE: prod }),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    codeSplitting: false,
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

// Until the browser half lands, only the (node-side) package build runs; the
// client bundle is added the moment `src/client` exists.
export default existsSync(new URL('./src/client/index.tsx', import.meta.url))
  ? [clientConfig]
  : []
