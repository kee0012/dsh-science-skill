// science/skills-migrate.mjs
// Keep an installed data root's skill identities aligned with SKILL.md.
//
// The provider resolves a skill — its `/name` invocation and the entry in the
// model's skill list — from the frontmatter `name`, not from the folder. A root
// seeded before that alignment keeps a folder whose name disagrees with its
// SKILL.md, which is invisible until the `/folder-name` command silently does
// nothing. Renaming in place (rather than seeding the correctly-named copy
// alongside) is what avoids two entries for one skill, and the catalog record's
// user-facing fields travel with it so an edited Chinese name, summary, and
// category survive.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { diagnoseSkillDir } from './skill-acceptance.mjs'

/**
 * Whether two skill folders hold the same skill.
 *
 * Compared by SKILL.md size and then by content: a folder shipped from the seed
 * is reproduced byte-for-byte, so an identical body means the stale folder
 * carries nothing of the user's. Any difference reports as "not a duplicate",
 * which keeps this pass from deleting an edited skill.
 * @param a - one skill folder.
 * @param b - the other skill folder.
 * @returns whether their SKILL.md files are identical.
 */
function isDuplicateOf(a, b) {
  const pathA = join(a, 'SKILL.md')
  const pathB = join(b, 'SKILL.md')
  try {
    if (statSync(pathA).size !== statSync(pathB).size) return false
    return readFileSync(pathA, 'utf8') === readFileSync(pathB, 'utf8')
  } catch {
    return false
  }
}

/** Read one catalog record, or undefined when absent/unparsable. */
function readRecord(dataDir, id) {
  const path = join(dataDir, id + '.json')
  if (!existsSync(path)) return undefined
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return undefined
  }
}

/**
 * Rename installed skill folders that disagree with their SKILL.md `name`.
 *
 * Idempotent: a skill already named correctly is left alone, and a destination
 * that already exists is never overwritten — the correctly-named copy wins and
 * the stale folder is reported rather than deleted, because deleting a folder the
 * user might have edited needs their decision, not this pass's.
 * @param root - data root.
 * @returns { renamed, conflicts } — `renamed` entries are `old->new` id pairs.
 */
export function alignSkillIdsWithFrontmatter(root) {
  const skillsDir = join(root, 'skills')
  const dataDir = join(root, 'catalog', 'data')
  if (!existsSync(skillsDir)) return { renamed: [], conflicts: [] }
  const renamed = []
  const conflicts = []
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const verdict = diagnoseSkillDir(join(skillsDir, entry.name))
    if (!verdict.ok || verdict.name === entry.name) continue

    const target = join(skillsDir, verdict.name)
    if (existsSync(target)) {
      // The seed already installed the correctly-named copy. When the stale folder
      // is an untouched copy of that same skill it is pure duplication — two rail
      // entries for one skill — so it can go. Anything else (the user edited it)
      // is reported instead: deleting user content is the user's call.
      if (isDuplicateOf(target, join(skillsDir, entry.name))) {
        rmSync(join(skillsDir, entry.name), { recursive: true, force: true })
        const staleRecord = join(dataDir, entry.name + '.json')
        if (existsSync(staleRecord)) rmSync(staleRecord, { force: true })
        renamed.push({ from: entry.name, to: verdict.name, removedDuplicate: true })
        continue
      }
      conflicts.push({ from: entry.name, to: verdict.name })
      continue
    }
    try {
      renameSync(join(skillsDir, entry.name), target)
    } catch (error) {
      conflicts.push({ from: entry.name, to: verdict.name, error: String(error?.message ?? error) })
      continue
    }

    // Move the record with the folder, so the user's Chinese name, summary, and
    // category follow the skill instead of being stranded under the old id.
    const record = readRecord(dataDir, entry.name)
    if (record !== undefined) {
      mkdirSync(dataDir, { recursive: true })
      const moved = { ...record, id: verdict.name, invoke: verdict.invoke }
      // The folder now carries the id, so a `dir_name` recorded by adoption
      // would point at a folder that no longer exists.
      delete moved.dir_name
      writeFileSync(join(dataDir, verdict.name + '.json'), JSON.stringify(moved, null, 2) + '\n', 'utf8')
      // The superseded record is removed only after its replacement is on disk.
      rmSync(join(dataDir, entry.name + '.json'), { force: true })
    }
    renamed.push({ from: entry.name, to: verdict.name })
  }
  return { renamed, conflicts }
}
