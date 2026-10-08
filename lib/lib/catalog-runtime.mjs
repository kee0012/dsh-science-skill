// science/workbench-web/catalog-runtime.mjs
// Runtime catalog utilities for the science data root: rebuild index.json from
// the runtime data dir (a portable port of science/catalog/build.mjs that
// operates on the data root instead of the kernel tree).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureCategories, INTERNAL_CATEGORY } from './categories-runtime.mjs'
import { userSkillRoots } from './skill-roots.mjs'
import { recordDirName } from './skills-runtime.mjs'

/**
 * The index category map: every effective category key → display label.
 * Icons are not part of the map — the rail renders them from the category
 * entry itself, so no emoji or glyph leaks into the catalog text.
 */
export function categoryDisplayMap(root) {
  const map = { [INTERNAL_CATEGORY]: '内部' }
  for (const c of ensureCategories(root)) map[c.key] = c.label
  return map
}

/**
 * Rebuild <root>/catalog/index.json from <root>/catalog/data/*.json.
 * Mirrors science/catalog/build.mjs semantics (schema subset + unique ids +
 * skills-dir cross-check) but scoped to the runtime data root.
 *
 * The schema is only consulted to prove the data root is a real catalog root, so
 * a missing one is not fatal: the record shape is enforced where records are
 * created. `existsSync` on the runtime schema only decides whether the index
 * declares `$schema` pointing at it or at the bundled fallback.
 * @param root - data root.
 * @param bundledSchema - this plugin's own `catalog.schema.json`, used when the
 *   data root has no schema of its own, or when the schema cannot be read.
 * @returns { ok, count, index? , error? }
 */
export function rebuildCatalogIndex(root, bundledSchema) {
  const catalogDir = join(root, 'catalog')
  const dataDir = join(catalogDir, 'data')
  const indexOut = join(catalogDir, 'index.json')
  if (!existsSync(dataDir)) return { ok: false, error: 'no catalog data dir' }

  let hasSchema = existsSync(join(catalogDir, 'schema.json'))
  if (!hasSchema && typeof bundledSchema === 'string' && existsSync(bundledSchema)) {
    // Seed the root from the bundled schema so later rebuilds — including ones
    // run by anything else that looks at this root — stand on their own.
    try {
      writeFileSync(join(catalogDir, 'schema.json'), readFileSync(bundledSchema, 'utf8'))
      hasSchema = true
    } catch {
      hasSchema = false
    }
  }

  const records = []
  const ids = new Set()
  const errors = []
  for (const f of readdirSync(dataDir).filter((x) => x.endsWith('.json')).sort()) {
    let record
    try { record = JSON.parse(readFileSync(join(dataDir, f), 'utf8')) } catch { errors.push(`${f}: unparsable`); continue }
    if (ids.has(record?.id)) errors.push(`${f}: duplicate id '${record?.id}'`)
    ids.add(record?.id)
    records.push(record)
  }

  // A record whose folder is not in one of the roots the host loads skills from
  // would advertise a skill the user cannot invoke, so it is left out of the
  // index. Leaving it out rather than refusing the rebuild matters: the scan
  // roots change whenever the user picks or clears the default directory, and a
  // refusal there would keep serving a stale index — or none at all — for
  // records that simply stopped being scanned. The record file stays on disk, so
  // widening the roots again brings the skill straight back.

  const skillRoots = userSkillRoots(root)
  const categories = categoryDisplayMap(root)
  // A record naming a category that is not in the table would be filed under a
  // heading the panel cannot draw — a category the user deleted, a record
  // written before the category existed, or a model reply that slipped through.
  // Re-filing it under 其他 (misc) keeps it visible instead of losing it.
  const validKeys = new Set(['internal', ...Object.keys(categories)])
  const kept = []
  const orphaned = []
  const refiled = []
  for (const r of records) {
    if (r?.category === 'internal') { kept.push(r); continue }
    // The folder is normally the id, but a skill adopted from a hand-copied
    // folder keeps its own name in `dir_name`, so the cross-check asks the
    // record instead of assuming — otherwise every such skill reads as orphaned
    // and disappears from the index the moment it is adopted.
    if (!skillRoots.some((base) => existsSync(join(base, recordDirName(r, r?.id))))) { orphaned.push(r?.id); continue }
    if (validKeys.has(r?.category)) { kept.push(r); continue }
    refiled.push({ id: r?.id, from: r?.category })
    kept.push({ ...r, category: 'misc' })
  }

  if (errors.length > 0) return { ok: false, error: errors.join('; ') }

  const index = {
    $schema: './schema.json',
    generatedAt: new Date().toISOString(),
    categories,
    skills: kept,
  }
  writeFileSync(indexOut, JSON.stringify(index, null, 2) + '\n')
  return { ok: true, count: kept.length, index, orphaned, refiled }
}
