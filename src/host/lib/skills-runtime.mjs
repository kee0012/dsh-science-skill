// science/workbench-web/skills-runtime.mjs
// Runtime skill import for the science data root: judge a SKILL.md folder by the
// harness's own acceptance rules, repair what is mechanically fixable, copy it
// into <root>/skills/<id>, and write/merge its catalog data record.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join } from 'node:path'
// Shared with the diagnostic report: a skill is accepted, repaired, and named by
// one rule set, so the import gate cannot pass something the host will skip.
import { SKILL_FILENAME, diagnoseSkillDir } from './skill-acceptance.mjs'
import { migrateSkillFrontmatter } from './skill-frontmatter.mjs'
import { userSkillRoots } from './skill-roots.mjs'

/** Trim one YAML scalar: strip matching surrounding quotes, else return as-is. */
function stripYamlScalar(value) {
  const v = value.trim()
  if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
    return v.slice(1, -1).trim()
  }
  return v
}

/** Collect the indented body following a YAML block-scalar header (>, |, >- …). */
function foldBlockScalar(after) {
  const lines = []
  for (const line of after.split('\n')) {
    const text = line.trim()
    if (text === '') continue // block scalars allow blank lines between content lines
    if (!/^[ \t]/.test(line) || text === '---') break
    lines.push(text)
  }
  return lines.join(' ')
}

/**
 * Extract frontmatter { name, description } from a SKILL.md body. Tolerates
 * quoted values and folded/literal block scalars for description.
 * @returns {{ name?: string, description?: string } | undefined}
 */
function parseFrontmatter(md) {
  // Strip a UTF-8 BOM if present (Windows editors add one; it would block the
  // leading `---` matcher).
  if (md.charCodeAt(0) === 0xFEFF) md = md.slice(1)
  const m = md.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!m) return undefined
  const fm = m[1]
  const nameLine = fm.match(/^name:\s*(.*)$/m)?.[1]
  let name
  if (nameLine !== undefined && nameLine.trim() !== '') name = stripYamlScalar(nameLine)
  let description = ''
  const descMatch = fm.match(/^description:\s*(.*)$/m)
  if (descMatch) {
    const first = descMatch[1].trim()
    if (first === '' || ['|', '>', '|-', '>-', '|+', '>+'].includes(first)) {
      description = foldBlockScalar(fm.slice(descMatch.index + descMatch[0].length))
    } else {
      description = stripYamlScalar(descMatch[1])
    }
  }
  return { name, description: description || undefined }
}

/** Normalize any display name into a kebab-case id (lowercase [a-z0-9-]). */
export function slugifyId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Whether an id is usable kebab-case (non-empty, letters/digits/dashes). */
function isKebab(id) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
}

/**
 * The directory an import installs into.
 *
 * `opts.intoDir` is the user's configured default import directory; when it is
 * absent or not absolute the skill lands in `<root>/skills`, which is the
 * historical behaviour and the root the provider scanned before the setting
 * existed. Staging, the overwrite backup and the final folder all derive from
 * this one value, so the staging rename can never be asked to cross a
 * filesystem boundary the destination itself does not cross.
 * @param root - data root.
 * @param opts - { intoDir?: string }
 * @returns an absolute install directory.
 */
function installRootOf(root, opts) {
  const into = typeof opts?.intoDir === 'string' ? opts.intoDir.trim() : ''
  return into !== '' && isAbsolute(into) ? into : join(root, 'skills')
}

/**
 * Validate a skill source directory: must contain SKILL.md with a name usable
 * as a kebab-case id. The frontmatter name is normalized (case-insensitively,
 * quotes and stray separators tolerated) and falls back to the folder name
 * when `name:` is absent.
 * @param dir - candidate skill directory.
 * @returns { ok, id, name? , description?, error? }
 */
export function validateSkillDir(dir) {
  const skillMd = join(dir, 'SKILL.md')
  if (!existsSync(skillMd)) return { ok: false, error: '目录中没有 SKILL.md' }
  let md
  try { md = readFileSync(skillMd, 'utf8') } catch { return { ok: false, error: 'SKILL.md 无法读取' } }
  const fm = parseFrontmatter(md)
  const rawName = (fm?.name ?? '').trim()
  const id = slugifyId(rawName || basename(dir))
  if (!isKebab(id)) {
    const found = rawName ? `(解析到 name: ${JSON.stringify(rawName)})` : '(frontmatter 无 name 行)'
    return { ok: false, error: `SKILL.md 需要一个可作为英文标识的 name(如 nature-writing-skill-ai)${found}` }
  }
  return { ok: true, id, name: rawName || id, description: fm?.description }
}

/**
 * Guess a catalog category from a skill's name/description keywords.
 *
 * This is only a placeholder: it sets the category an adopted skill carries
 * until the model names it, and naming always overwrites it. So the rules are
 * deliberately conservative, and anything they cannot place falls to `misc`
 * (其他) rather than to a plausible-looking bucket — a keyword guess has no
 * business filing a skill under 文献, where it reads as a claim the rules never
 * made.
 * @param skill - { id, description? } of the imported skill.
 * @returns a category key from the shipped default set.
 */
export function guessCategory(skill) {
  const hay = [skill.id, skill.description ?? ''].join(' ').toLowerCase()
  const rules = [
    // Chinese keywords match as substrings; ASCII keywords need a start
    // boundary only (word prefix), so 'polish' matches 'polishes'/'polishing'
    // while 'search' still cannot start inside 'research'.
    ['outcome', ['patent', 'copyright', 'disclosure', '专利', '软著', '著作权', '交底', '发明']],
    ['topic', ['brainstorm', 'hypothes', 'experimental-design', 'critical-thinking', 'idea-evaluator', '选题', '头脑风暴', '假设', '批判性', '实验设计']],
    ['lab', ['experiment', 'log', 'protocol', 'assay', '实验', '日志', '测定']],
    ['review', ['review', 'rebuttal', 'peer', '审稿', '评审', '回复信']],
    ['presentation', ['ppt', 'pptx', 'slides', 'presentation', 'deck', '汇报', '演示', '幻灯片']],
    ['figure', ['figure', 'plot', 'chart', 'visual', 'graph', 'schematic', 'drawio', '绘图', '图表', '可视化', '示意图']],
    ['data-analysis', ['statistic', 'analysis', 'machine-learning', 'scikit', 'survival', 'biopython', 'scikit-bio', 'sequence', '统计', '分析', '机器学习', '生信']],
    ['document', ['docx', 'xlsx', 'pdf', 'spreadsheet', '文档', '表格']],
    ['literature', ['search', 'literature', 'citation', 'download', 'reader', 'paper-card', 'ref-verifier', 'pipeline', 'lookup', 'deep-research', '文献', '检索', '引用', '阅读']],
    ['writing', ['writing', 'polish', 'proposal', 'translate', 'abstract', 'manuscript', 'humaniz', 'draft', 'intro', 'spine', '写作', '润色', '翻译', '提案', '起草', '去 ai']],
  ]
  const asciiRe = (k) => new RegExp(`(^|[^a-z0-9-])${k}`)
  const hit = (k) => /[\u4e00-\u9fff]/.test(k) ? hay.includes(k) : asciiRe(k).test(hay)
  for (const [cat, kws] of rules) {
    if (kws.some(hit)) return cat
  }
  // Nothing matched confidently. 其他 is the honest landing place; the model
  // gives the real category when it names the skill.
  return 'misc'
}

/**
 * Import a skill folder into the data root:
 * 1. validate; 2. copy into `<install root>/<id>` (conflict → error or
 * overwrite); 3. upsert <root>/catalog/data/<id>.json with
 * name/category/summary/invoke.
 *
 * The install root is `opts.intoDir` when it names an absolute directory and
 * `<root>/skills` otherwise, so the caller — not this function — decides what
 * the user's configured default import directory means.
 * @param root - data root.
 * @param srcDir - validated skill source dir (the skill folder itself).
 * @param opts - { overwrite?: boolean; category?: string; intoDir?: string }
 * @returns { ok, id, category, overwritten, error? }
 */
export function importSkillDir(root, srcDir, opts = {}) {
  const prepared = prepareSkillImport(root, srcDir, opts)
  if (!prepared.ok) return prepared
  const { id, validated, staging, existed } = prepared
  const installRoot = installRootOf(root, opts)
  const target = join(installRoot, id)

  // Re-validate the cleaned copy, so a repair that made the skill loadable also
  // decides the directory id: the provider keys skills by the frontmatter
  // `name`, and a directory named anything else makes `/directory-name` a
  // command that does not exist.
  const finalVerdict = diagnoseSkillDir(staging)
  if (!finalVerdict.ok) {
    rmSync(staging, { recursive: true, force: true })
    const fixHint = finalVerdict.fixable === true ? '（本应可自动修复，请反馈此情况）' : ''
    return { ok: false, error: `这个技能装上也加载不了：${finalVerdict.error}${fixHint}`, code: finalVerdict.code }
  }

  const finalId = slugifyId(finalVerdict.name)
  if (!isKebab(finalId)) {
    rmSync(staging, { recursive: true, force: true })
    return { ok: false, error: `SKILL.md 的 name "${finalVerdict.name}" 不能作为技能标识`, code: 'bad-name' }
  }

  // The id can move when the frontmatter name was absolute but the folder was
  // not; re-check the destination and re-apply the overwrite decision.
  const finalTarget = join(installRoot, finalId)
  const finalExists = existsSync(finalTarget)
  const prior = readPriorRecord(root, finalId)
  // A skill adopted from a hand-copied folder sits in that folder while its
  // record is keyed by the frontmatter name. Re-importing it replaces that
  // folder — with the same backup an ordinary overwrite gets — instead of
  // leaving a second copy of the same skill next to the freshly installed one.
  const adoptedName = recordDirName(prior, finalId)
  const adoptedPath = adoptedName === finalId ? undefined : join(installRoot, adoptedName)
  const adoptedExists = adoptedPath !== undefined && existsSync(adoptedPath)
  if ((finalExists && finalId !== id || adoptedExists) && opts.overwrite !== true) {
    rmSync(staging, { recursive: true, force: true })
    return { ok: false, error: `skill "${finalId}" already exists — choose overwrite or skip` }
  }

  const overwritten = existed === true || finalExists || adoptedExists
  const replaced = finalExists ? finalTarget : adoptedExists ? adoptedPath : undefined
  if (replaced !== undefined) cpSync(replaced, join(installRoot, `.${finalId}.old-${Date.now()}`), { recursive: true })
  mkdirSync(installRoot, { recursive: true })
  rmSync(finalTarget, { recursive: true, force: true })
  if (adoptedPath !== undefined && adoptedPath !== finalTarget) rmSync(adoptedPath, { recursive: true, force: true })
  try {
    renameSync(staging, finalTarget)
  } catch {
    // A cross-device rename cannot happen inside one data root, but fall back
    // to a copy so an exotic root layout still imports.
    cpSync(staging, finalTarget, { recursive: true })
    rmSync(staging, { recursive: true, force: true })
  }

  // Upsert catalog data record.
  const category = opts.category ?? prior?.category ?? guessCategory({ id: finalId, description: finalVerdict.description })
  const record = {
    id: finalId,
    name: prior?.name || validated.name || finalId, // keep an edited display name on overwrite
    category,
    summary: finalVerdict.description ? finalVerdict.description.slice(0, 120) : (prior?.summary ?? ''),
    // An overwrite keeps the examples a previous naming call produced; the model
    // would charge another request to say the same thing about the same skill.
    examples: prior?.examples ?? [],
    trigger_keywords: prior?.trigger_keywords ?? [],
    inputs: prior?.inputs ?? [],
    outputs: prior?.outputs ?? [],
    depends_on: prior?.depends_on ?? [],
    requires: prior?.requires ?? [],
    status: prior?.status ?? 'beta',
    // The provider's skill name is the only thing `/` can invoke; recording
    // anything else makes the rail advertise a command that does not exist.
    invoke: finalVerdict.invoke,
  }
  const dataDir = join(root, 'catalog', 'data')
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(join(dataDir, `${finalId}.json`), JSON.stringify(record, null, 2) + '\n')

  return {
    ok: true,
    id: finalId,
    category,
    repaired: prepared.repaired,
    // Whether an existing skill of the same id was replaced. The panel words its
    // result differently for the two cases, and only the host knows which
    // happened (a first import of a brand-new folder overwrites nothing).
    overwritten,
    error: undefined,
    // The skill's full description from its SKILL.md, untruncated: naming reads
    // this, and `summary` below is only the rail entry's short preview.
    description: finalVerdict.description,
    ...record,
  }
}

/** Read a catalog record if present, tolerating a missing or unparsable file. */
function readPriorRecord(root, id) {
  const dataPath = join(root, 'catalog', 'data', `${id}.json`)
  if (!existsSync(dataPath)) return undefined
  try {
    return JSON.parse(readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return undefined
  }
}

/**
 * Judge a skill source and, when it is mechanically fixable, rewrite a staging
 * copy so the harness can load it.
 *
 * Everything happens on a copy under `<install root>/.<id>.import`, so a repair
 * never touches the user's original folder, a failure leaves no partial skill
 * behind, and a skill that cannot be made loadable is reported instead of
 * installed-but-dead. The staging copy shares the install root's own directory,
 * so the move into place stays a rename on one filesystem.
 * @param root - data root.
 * @param srcDir - the skill folder to import.
 * @param opts - { overwrite?: boolean; intoDir?: string }
 * @returns { ok, id, validated, staging, existed, repaired?, error?, code? }
 */
export function prepareSkillImport(root, srcDir, opts = {}) {
  const verdict = diagnoseSkillDir(srcDir)
  if (!verdict.ok && verdict.fixable !== true) {
    return { ok: false, error: `这个技能装上也加载不了：${verdict.error}`, code: verdict.code }
  }
  const validated = validateSkillDir(srcDir)
  const id = verdict.ok ? slugifyId(verdict.name) : (validated.ok ? validated.id : slugifyId(basename(srcDir)))
  if (!isKebab(id)) {
    const found = verdict.ok ? `（name: ${JSON.stringify(verdict.name)}）` : ''
    return { ok: false, error: `SKILL.md 需要一个可作为英文标识的 name（如 nature-writing-skill-ai）${found}`, code: 'bad-name' }
  }

  const installRoot = installRootOf(root, opts)
  const target = join(installRoot, id)
  const exists = existsSync(target)
  if (exists && opts.overwrite !== true) {
    return { ok: false, error: `skill "${id}" already exists — choose overwrite or skip`, code: 'exists' }
  }

  mkdirSync(installRoot, { recursive: true })
  const staging = join(installRoot, `.${id}.import`)
  rmSync(staging, { recursive: true, force: true })
  cpSync(srcDir, staging, { recursive: true })

  let repaired = false
  if (!verdict.ok) {
    try {
      // A rejected `name` is repaired to the folder's identifier, matching the
      // shipped-set build's fallback; every other defect is repaired in place.
      const migration = migrateSkillFrontmatter(join(staging, SKILL_FILENAME), {
        ...verdict.suggestedName === undefined ? {} : { name: verdict.suggestedName },
      })
      repaired = migration.repaired
      if (migration.repaired) {
        // The staging copy is what moves into place, so the file it carried must
        // match what the user was told was fixed.
        pendingImportNotes.push(`${id}: ${migration.steps.join('、')}`)
      }
    } catch (error) {
      pendingImportNotes.push(`${id}: 自动修复失败 ${error?.message ?? error}`)
    }
  }

  return { ok: true, id, validated, staging, existed: exists, repaired }
}

/**
 * Repair notes collected while importing, drained by the caller for its response
 * and its log. Importing is not a boot-time operation, so this is only ever
 * non-empty for the request that triggered it.
 */
export const pendingImportNotes = []

/**
 * Patch a skill record: its user-facing Chinese name/summary and its category.
 * The SKILL.md folder is untouched; only the catalog record changes.
 *
 * The Chinese name and summary are stored on the record's own `name`/`summary`:
 * that is the single field both the rail and the settings list render, so an
 * edit here is what the rail shows. The value the record carried before the
 * Chinese text was promoted stays in `display_source`, so the skill's own
 * wording remains recoverable, and an emptied field falls back to it.
 * @param root - data root.
 * @param id - skill id.
 * @param patch - { displayName?, displaySummary?, category? }
 * @returns { ok, id, name?, summary?, category?, error? }
 */
export function updateSkillRecord(root, id, patch = {}) {
  const dataPath = join(root, 'catalog', 'data', `${id}.json`)
  if (!existsSync(dataPath)) return { ok: false, error: `skill "${id}" not in catalog` }
  let record
  try { record = JSON.parse(readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, '')) } catch { return { ok: false, error: `catalog record "${id}" unparsable` } }
  if (typeof patch.category === 'string' && patch.category.trim()) record.category = patch.category.trim()
  const source = record.display_source ?? {}
  if (typeof patch.displayName === 'string') {
    const displayName = patch.displayName.trim()
    // The pre-edit wording is kept under `display_source`, which is what makes
    // "clear the field" mean "go back to the original" rather than "reuse the
    // override". Only the first edit records it, so later edits cannot overwrite
    // the original with an intermediate value.
    if (source.name === undefined) source.name = record.name
    // Empty clears the override, falling back to what the record held before.
    record.name = displayName !== '' ? displayName : (source.name ?? record.name)
  }
  if (typeof patch.displaySummary === 'string') {
    const displaySummary = patch.displaySummary.trim()
    if (source.summary === undefined) source.summary = record.summary
    record.summary = displaySummary !== '' ? displaySummary : (source.summary ?? record.summary)
  }
  if (Object.keys(source).length > 0) record.display_source = source
  writeFileSync(dataPath, JSON.stringify(record, null, 2) + '\n')
  return {
    ok: true,
    id,
    name: record.name,
    summary: record.summary,
    category: record.category,
  }
}

/**
 * The folder a record's skill actually lives in.
 *
 * A record is keyed by the skill id, but a skill adopted from a hand-copied
 * folder keeps its record under the frontmatter name while the folder keeps
 * whatever the user named it (`dir_name`). Every filesystem lookup made on a
 * record's behalf — the SKILL.md read, the catalog's cross-check, delete — has
 * to ask the record instead of assuming the id is the folder name. The value
 * comes from a record file, so it is re-checked as one bare path segment rather
 * than trusted: anything empty, `.`-like or containing a separator falls back to
 * the id, which is the other name the folder can have.
 * @param record - a parsed catalog record (may be undefined).
 * @param id - the record's id.
 * @returns a single path segment.
 */
export function recordDirName(record, id) {
  const dir = record?.dir_name
  if (typeof dir !== 'string') return id
  const name = dir.trim()
  if (name === '' || name === '.' || name === '..' || /[\\/]/.test(name)) return id
  return name
}

/**
 * Adopt skill folders that have no catalog record yet.
 *
 * The provider loads skills from every user-level root, and an installer — a
 * skill-search plugin, a copy, another agent tool sharing the same roots —
 * writes to whichever one it knows. Such a skill is loadable and invocable but
 * has no catalog record, which is the only source the rail and the settings
 * list read, so it stays invisible there. Writing the record is what makes it
 * appear in its category, exactly as an import would; no folder is ever copied,
 * edited, or removed, and a record that already exists is left untouched.
 *
 * The record id is normally the folder name, because the catalog's cross-check
 * and the markdown lookup both start from it. A folder copied in by hand is
 * routinely named something else — a version ("originpro-2.0.0"), a title
 * ("Vibe Coding 架构师") — and refusing those left perfectly loadable skills out
 * of the panel, so when the folder name cannot be an id the frontmatter name
 * becomes the id and `dir_name` remembers where the folder is.
 * @param root - data root.
 * @returns { adopted, skipped } — `adopted` carries what the naming step needs;
 *   `skipped` names folders the host would not load either.
 */
export function adoptUnregisteredSkills(root) {
  const dataDir = join(root, 'catalog', 'data')
  const adopted = []
  const skipped = []
  const roots = userSkillRoots(root).filter((skillsDir) => existsSync(skillsDir))
  if (roots.length === 0) return { adopted, skipped }

  // Ids already taken, exactly as the record file names spell them, plus every
  // folder some record already covers. That second set is what keeps a later
  // rescan from re-adopting a skill whose folder is not its id; folder names are
  // compared case-insensitively because Windows paths are.
  const registered = new Set()
  const covered = new Set()
  if (existsSync(dataDir)) {
    for (const file of readdirSync(dataDir)) {
      if (!file.endsWith('.json')) continue
      const id = file.slice(0, -'.json'.length)
      registered.add(id)
      covered.add(id.toLowerCase())
      covered.add(recordDirName(readPriorRecord(root, id), id).toLowerCase())
    }
  }

  for (const skillsDir of roots) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      // Dot-prefixed children are import/overwrite residue (`.x.import`,
      // `.x.old-<timestamp>`), never skills the provider loads.
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      // The first root claiming an id wins, matching the provider's rank; a
      // later root's same-named skill is shadowed, not adopted twice.
      if (covered.has(entry.name.toLowerCase())) continue
      const verdict = diagnoseSkillDir(join(skillsDir, entry.name))
      if (!verdict.ok) {
        skipped.push({ id: entry.name, root: skillsDir, error: verdict.error })
        continue
      }
      // A kebab folder name stays the id whenever it can be one, so nothing
      // about an already-adopted skill changes; only a folder name the id
      // pattern rejects falls back to the frontmatter name the provider keys
      // the skill by.
      const id = isKebab(entry.name) ? entry.name : verdict.name
      if (!isKebab(id)) {
        skipped.push({ id: entry.name, root: skillsDir, error: '目录名与 SKILL.md 的 name 都不能作为技能标识（只允许小写字母、数字与单连字符）' })
        continue
      }
      // Never take an id another folder already owns: replacing that record
      // would strand the skill it belongs to with no record of its own.
      if (registered.has(id)) {
        skipped.push({ id: entry.name, root: skillsDir, error: `技能标识 "${id}" 已被占用（另一个目录已用它收录），未收录此目录` })
        continue
      }
      const record = {
        id,
        // Where the folder really is, for the id-agnostic lookups in
        // recordDirName; omitted whenever the folder already is the id.
        ...id === entry.name ? {} : { dir_name: entry.name },
        // The provider keys the skill by its frontmatter name, which can differ
        // from the folder; declaring it keeps `/invoke` a command that exists.
        ...verdict.name === id ? {} : { frontmatter_name: verdict.name },
        name: verdict.name,
        category: guessCategory({ id, description: verdict.description }),
        summary: verdict.description.slice(0, 120),
        // Written empty rather than omitted so every record has the same shape;
        // the model backfill fills it in, and its emptiness is what marks the
        // record as still needing a call.
        examples: [],
        trigger_keywords: [],
        inputs: [],
        outputs: [],
        depends_on: [],
        requires: [],
        status: 'beta',
        invoke: verdict.invoke,
      }
      try {
        mkdirSync(dataDir, { recursive: true })
        writeFileSync(join(dataDir, `${id}.json`), JSON.stringify(record, null, 2) + '\n')
      } catch (error) {
        skipped.push({ id: entry.name, root: skillsDir, error: `目录记录写入失败：${error?.message ?? error}` })
        continue
      }
      registered.add(id)
      covered.add(entry.name.toLowerCase())
      covered.add(id.toLowerCase())
      adopted.push({ id, name: verdict.name, description: verdict.description, category: record.category })
    }
  }
  return { adopted, skipped }
}

/**
 * Delete a skill: its whole folder plus its catalog record.
 *
 * The folder is looked up in every user-level root, so a skill that a skill
 * manager installed outside `<root>/skills` is removed where it actually lives
 * rather than leaving its record behind to re-adopt it on the next read.
 * @param root - data root.
 * @param id - skill id.
 * @returns { ok, id, error? }
 */
export function deleteSkill(root, id) {
  const dataPath = join(root, 'catalog', 'data', `${id}.json`)
  const recordExisted = existsSync(dataPath)
  // An adopted skill's record id is not always its folder name, so the folder is
  // asked of the record: deleting the skill has to remove the folder the user
  // actually copied in, not leave a loadable copy behind for the next scan.
  const folder = recordDirName(readPriorRecord(root, id), id)
  const dir = userSkillRoots(root)
    .map((base) => join(base, folder))
    .find((candidate) => existsSync(candidate))
  if (dir === undefined && !recordExisted) return { ok: false, error: `skill "${id}" not found` }
  if (dir !== undefined) rmSync(dir, { recursive: true, force: true })
  if (recordExisted) rmSync(dataPath, { force: true })
  return { ok: true, id }
}
