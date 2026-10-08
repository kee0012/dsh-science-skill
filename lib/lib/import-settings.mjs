// src/host/lib/import-settings.mjs
// Import settings for the science data root: where "+ 添加目录" installs an
// imported skill.
//
// By default an import lands in `<root>/skills`, which is also the first root
// the host's skill provider scans. A user who keeps skills somewhere else (a
// synced folder, a shared team directory) can point imports at one absolute
// directory instead of re-picking it for every skill, so the choice is
// persisted on the data root next to `skill-gate.json`.
//
// The file is deliberately tiny and its reader is total: a missing, empty or
// unparsable file means "unset", never an error, because every skill scan goes
// through it (`userSkillRoots` reads it on each call) and a corrupt settings
// file must not be able to hide the whole catalog.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize } from 'node:path'

/** The settings file's name under the data root. */
export const IMPORT_SETTINGS_FILENAME = 'skill-import.json'

/**
 * @param root - data root.
 * @returns the absolute path of `<root>/skill-import.json`.
 */
export function importSettingsPath(root) {
  return join(root, IMPORT_SETTINGS_FILENAME)
}

/**
 * Normalize a stored or submitted default directory.
 *
 * The value is either an absolute path or the empty string; anything else —
 * a relative path, a non-string, a path that only differs by separators — is
 * reduced to `''` so a bad value cannot send an import somewhere unexpected.
 * @param value - candidate from disk or from a request body.
 * @returns the usable absolute directory, or `''` when unset/invalid.
 */
export function normalizeDefaultSkillDir(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed === '' || !isAbsolute(trimmed)) return ''
  const normalized = normalize(trimmed)
  // `normalize` keeps a trailing separator on a drive root (`D:\`), which is
  // the one path where joining is still correct; every other trailing
  // separator would make the stored value differ from what a picker returns.
  return normalized.length > 3 ? normalized.replace(/[\\/]+$/, '') : normalized
}

/**
 * Read the persisted import settings.
 * @param root - data root.
 * @returns `{ defaultSkillDir }` — `''` when unset or unreadable.
 */
export function readImportSettings(root) {
  const path = importSettingsPath(root)
  if (!existsSync(path)) return { defaultSkillDir: '' }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
    return { defaultSkillDir: normalizeDefaultSkillDir(parsed?.defaultSkillDir) }
  } catch {
    // A corrupt file reads as "unset": the default import directory stays
    // `<root>/skills`, which is what a fresh install would use anyway.
    return { defaultSkillDir: '' }
  }
}

/**
 * Persist the import settings.
 * @param root - data root.
 * @param settings - `{ defaultSkillDir }`; an empty value clears the setting.
 * @returns the value actually written.
 */
export function writeImportSettings(root, settings = {}) {
  const defaultSkillDir = normalizeDefaultSkillDir(settings.defaultSkillDir)
  const path = importSettingsPath(root)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ defaultSkillDir }, null, 2) + '\n')
  return { defaultSkillDir }
}

/**
 * The directory an import should install into, or `''` when the user has not
 * chosen one — the caller then falls back to `<root>/skills`.
 * @param root - data root.
 * @returns the configured absolute directory, or `''`.
 */
export function defaultImportDir(root) {
  return readImportSettings(root).defaultSkillDir
}
