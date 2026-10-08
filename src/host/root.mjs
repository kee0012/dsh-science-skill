/**
 * Data-root resolution for the science skill center.
 *
 * The catalog, the category list and the per-skill records all live under one
 * data root. On a Science Agent desktop that root is the host's `$DSH_HOME`
 * (the shell exports it), and a plain `dsh` launch resolves the same value, so
 * the rail and the host's skill provider always look at the same folders.
 *
 * Precedence, highest first:
 *  1. the plugin's own `dataRoot` config,
 *  2. `$DSH_HOME`,
 *  3. `~/.dsh` — the harness default when the variable is unset.
 *
 * @module dsh-science-skill/host/root
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { importSettingsPath } from './lib/import-settings.mjs'
import { userSkillRoots } from './lib/skill-roots.mjs'

/**
 * Resolve the data root this plugin stores its catalog under.
 * @param configured - `dataRoot` from the plugin config, if the user set one.
 * @returns absolute data-root directory.
 */
export function resolveDataRoot(configured) {
  if (typeof configured === 'string' && configured.trim() !== '') {
    const value = configured.trim()
    return isAbsolute(value) ? value : join(process.cwd(), value)
  }
  const env = process.env.DSH_HOME?.trim()
  if (env !== undefined && env !== '') return env
  return join(homedir(), '.dsh')
}

/**
 * @typedef {object} RootPaths
 * @property {string} root - data root.
 * @property {string} catalogDir - `<root>/catalog`.
 * @property {string} dataDir - `<root>/catalog/data`, one record per skill.
 * @property {string} indexPath - `<root>/catalog/index.json`, the built catalog.
 * @property {string} categoriesPath - `<root>/catalog/categories.json`.
 * @property {string} gatePath - `<root>/skill-gate.json`, the pinned switches.
 * @property {string} importSettingsPath - `<root>/skill-import.json`, the default import directory.
 * @property {string[]} skillRoots - directories the host discovers skills in.
 */

/**
 * Every path the skill center derives from the data root.
 * @param root - data root.
 * @param extraSkillDirs - extra skill directories from the plugin config.
 * @returns the resolved paths.
 */
export function rootPaths(root, extraSkillDirs = []) {
  const catalogDir = join(root, 'catalog')
  return {
    root,
    catalogDir,
    dataDir: join(catalogDir, 'data'),
    indexPath: join(catalogDir, 'index.json'),
    categoriesPath: join(catalogDir, 'categories.json'),
    gatePath: join(root, 'skill-gate.json'),
    importSettingsPath: importSettingsPath(root),
    skillRoots: userSkillRoots(root, extraSkillDirs),
  }
}

/**
 * The catalog schema used when the data root has none of its own.
 *
 * A published plugin cannot point at a science-agent kernel tree for the schema
 * fallback the way the bundled workbench does, so it ships the same schema and
 * passes its path down as the fallback source.
 * @param bundledSchema - absolute path of the schema shipped with this plugin.
 * @returns the fallback schema path, or `undefined` when it is missing.
 */
export function bundledSchemaPath(bundledSchema) {
  return existsSync(bundledSchema) ? bundledSchema : undefined
}
