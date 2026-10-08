// science/skill-frontmatter.mjs
// Frontmatter repair shared by the skill-set build, the standalone checker, and
// the workbench's boot migration.
//
// Several third-party bundles write `description:` as one long unquoted line
// containing `": "`, which YAML reads as a nested mapping and rejects
// (`bad indentation of a mapping entry`). The harness parses frontmatter with a
// real YAML parser and **silently skips** a skill whose frontmatter fails, so
// the skill never reaches the model and its `/name` invocation does nothing.
// Repairing it keeps every shipped skill host-invocable.
//
// `yaml.load` is this package's own subset reader, not a vendored engine — see
// `frontmatter-yaml.mjs` for why, and for what "rejected" means here.
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import * as yaml from './frontmatter-yaml.mjs'

const FRONTMATTER = /^(---\r?\n)([\s\S]*?)(\r?\n---)/
/** An unquoted scalar that a real parser would read as a nested mapping. */
const UNQUOTED_NESTED = /:[ \t]|:$/

/** Quote a scalar as a YAML double-quoted string. */
function quote(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Quote multi-line scalar content as one double-quoted YAML string.
 *
 * The continuation lines are joined with escaped newlines rather than emitted as
 * a block scalar: they arrive with their original indentation, and re-emitting
 * that indentation under a block scalar turns a line like `  Triggers: x` back
 * into a nested mapping — the very defect being repaired, one level down.
 * Escaping sidesteps indentation entirely.
 */
function quoteLines(lines) {
  return quote(lines.join('\n'))
}

/** Whether a frontmatter block is accepted by a YAML parser. */
function parses(block) {
  try {
    yaml.load(block)
    return true
  } catch {
    return false
  }
}

/**
 * The replacement line(s) for one repaired scalar.
 *
 * With continuation lines the scalar becomes a block scalar that keeps every
 * line; otherwise a quoted single line. The result carries its own terminating
 * newline, because the caller splices it in place of a line whose newline it
 * also removes.
 * @param key - the frontmatter key.
 * @param value - the first line's value.
 * @param extra - continuation lines belonging to the same scalar.
 * @param lineEnding - the file's line ending, so a repair does not mix endings.
 * @returns the replacement text, terminated with `lineEnding`.
 */
function scalarReplacement(key, value, extra, lineEnding) {
  const quoted = extra.length > 0 ? quoteLines([value, ...extra]) : quote(value)
  return `${key}: ${quoted}${lineEnding}`
}

/**
 * Locate the frontmatter in a SKILL.md, tolerating a leading UTF-8 BOM.
 *
 * The BOM matters: Windows editors add one routinely, the harness strips it, but
 * a `^---` match against the raw text fails on it — so every repair must strip it
 * first or it silently does nothing on exactly the files a Windows author wrote.
 * @param text - full SKILL.md text.
 * @returns { bom, match } where `match` is the delimited frontmatter or null.
 */
function locateFrontmatter(text) {
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : ''
  const body = bom === '' ? text : text.slice(1)
  return { bom, body, match: body.match(FRONTMATTER) }
}

/**
 * Decide what one SKILL.md frontmatter needs.
 *
 * The key and every other line stay byte-identical; only the malformed scalar is
 * quoted (or, when the unquoted scalar swallowed continuation lines, rewritten
 * as a block scalar).
 *
 * Statuses:
 * - `valid` — the frontmatter already parses, or the file has none to parse;
 * - `repaired` — `after` carries the full repaired text;
 * - `unplannable` — the parser rejected it outside the single-key shape this
 *   handles. Reported rather than swallowed, because the harness silently skips
 *   such a skill and nothing else would tell the user why it never loads.
 * @param text - full SKILL.md text.
 * @returns { status, after? }
 */
export function repairFrontmatterText(text) {
  // The flags are a single-character string, so this replaces only the first
  // character and the BOM survives into the repaired text.
  const { bom, body, match } = locateFrontmatter(text)
  if (match === null) return { status: 'valid' }
  const [full, open, block, close] = match
  if (parses(block)) return { status: 'valid' }

  // Locate the offending line directly instead of reading a position out of the
  // parser's message: this reader reports *that* a block is invalid, not where,
  // and the repair needs the line anyway. The first top-level `key: value` whose
  // value is an unquoted scalar holding a colon is the nested mapping a real
  // parser would have flagged.
  const offset = locateUnquotedNestedMapping(block)
  if (offset === -1) return { status: 'unplannable', error: '未找到可修复的字段' }

  const lineStart = block.lastIndexOf('\n', Math.max(0, offset - 1)) + 1
  let lineEnd = block.indexOf('\n', offset)
  if (lineEnd === -1) lineEnd = block.length
  const lineEnding = block.includes('\r\n') ? '\r\n' : '\n'

  const readLine = (start) => {
    if (start > block.length) return undefined
    let end = block.indexOf('\n', start)
    if (end === -1) end = block.length
    return { text: block.slice(start, end).replace(/\r$/, ''), end }
  }
  /** The continuation lines directly under a key, stopping at the next key. */
  const continuationAfter = (start) => {
    const extra = []
    let next = start
    for (;;) {
      const line = readLine(next)
      if (line === undefined || line.text.trim() === '') break
      if (/^[A-Za-z_][\w-]*:(\s|$)/.test(line.text)) break
      if (!/^\s+\S/.test(line.text)) break
      extra.push(line.text.trim())
      next = line.end + 1
    }
    return { extra, next }
  }
  const assertParses = (candidate) => {
    if (!parses(candidate)) return undefined
    // `full` is measured from the BOM-stripped body, so the original suffix is
    // taken from there and the BOM re-attached ahead of it.
    const after = `${bom}${open}${candidate}${close}${body.slice(full.length)}`
    return { status: 'repaired', after }
  }

  const ownLine = readLine(lineStart)
  const owner = ownLine?.text.match(/^([A-Za-z_][\w-]*):[ \t]+(\S.*)$/)
  if (owner !== null && owner !== undefined) {
    // The flagged character sits on a key's own line, which is the usual defect:
    // a colon-space inside an unquoted scalar. The unquoted scalar may also have
    // swallowed the lines under it.
    const value = owner[2].replace(/\r$/, '').trim()
    const { extra, next } = continuationAfter(ownLine.end + 1)
    const attempt = assertParses(
      `${block.slice(0, lineStart)}${scalarReplacement(owner[1], value, extra, lineEnding)}${block.slice(next)}`,
    )
    if (attempt !== undefined) return attempt
  }

  // The flagged position can instead fall inside an indented continuation line —
  // the parser reports where the nested mapping was noticed, not the colon that
  // caused it, and the column can land well past the offending scalar. Repair
  // the nearest enclosing top-level key whose unquoted scalar spans that line,
  // and accept the first candidate that actually parses.
  const ownerKeyIndex = block.lastIndexOf('\n') === lineStart - 1 ? lineStart : lineStart
  for (let start = ownerKeyIndex; start >= 0; start = block.lastIndexOf('\n', start - 2) + 1) {
    const line = readLine(start)
    if (line === undefined) break
    if (line.text.trim() === '' || /^\s/.test(line.text)) {
      if (start === 0) break
      continue
    }
    const candidate = line.text.match(/^([A-Za-z_][\w-]*):[ \t]+(\S.*)$/)
    if (candidate === null) break
    const value = candidate[2].replace(/\r$/, '').trim()
    const { extra, next } = continuationAfter(line.end + 1)
    const attempt = assertParses(
      `${block.slice(0, start)}${scalarReplacement(candidate[1], value, extra, lineEnding)}${block.slice(next)}`,
    )
    if (attempt !== undefined) return attempt
    if (start === 0) break
  }
  return { status: 'unplannable', error: '字段无法机械修复' }
}

/**
 * The offset of the first unquoted top-level scalar that opens a nested mapping.
 *
 * This is the defect the repair exists for: `description: a sentence with "x: y"
 * in it` reads as a mapping child to a real YAML parser. Indented lines and lines
 * already quoted are skipped, so a well-formed key earlier in the block does not
 * shadow the broken one.
 * @param block - the frontmatter text between its fences.
 * @returns the offset of the offending line's first character, or -1.
 */
function locateUnquotedNestedMapping(block) {
  let offset = 0
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.replace(/\r$/, '')
    const owner = line.match(/^([A-Za-z_][\w-]*):[ \t]+(\S.*)$/)
    if (owner !== null && /^["'[{*]/.test(owner[2].trim()) === false && UNQUOTED_NESTED.test(owner[2].trim())) {
      return offset
    }
    offset += raw.length + 1
  }
  return -1
}

/**
 * Inspect one SKILL.md on disk.
 * @param path - absolute SKILL.md path.
 * @returns { status, after? } as documented on `repairFrontmatterText`.
 * @throws when the file cannot be read — callers decide how loud that is.
 */
export function planSkillRepair(path) {
  return repairFrontmatterText(readFileSync(path, 'utf8'))
}

/**
 * Rename frontmatter keys the harness rejects to their canonical spelling.
 *
 * `skill-filesystem` throws on `disableModelInvocation` / `modelInvocable` /
 * `userInvocable` and then skips the whole skill, and third-party bundles written
 * for other agents use those spellings often. Key order is preserved and only the
 * key token changes, so a renamed key stays where its author put it; the two
 * `modelInvocable` spellings collapse onto `disable-model-invocation`, which is
 * the same booleans in the same sense.
 * @param text - full SKILL.md text.
 * @param rename - legacy key → canonical key, from `LEGACY_INVOCATION_KEYS`.
 * @returns { status, after?, renamed? } — `renamed` names the keys that changed.
 */
export function renameLegacyFrontmatterKeys(text, rename) {
  const { bom, body, match } = locateFrontmatter(text)
  if (match === null) return { status: 'valid' }
  const [, open, block, close] = match
  const lineEnding = block.includes('\r\n') ? '\r\n' : '\n'
  const lines = block.split(/\r?\n/)
  const renamed = []
  const patched = lines.map((line) => {
    const keyed = line.match(/^([A-Za-z_][\w-]*)(:.*)$/)
    if (keyed === null) return line
    const canonical = rename[keyed[1]]
    if (canonical === undefined || canonical === keyed[1]) return line
    renamed.push(`${keyed[1]}→${canonical}`)
    return `${canonical}${keyed[2]}`
  })
  if (renamed.length === 0) return { status: 'valid' }
  // Normalize to the file's dominant ending, so splitting on either form cannot
  // leave stray carriage returns behind.
  const candidate = patched.join(lineEnding).replace(/\r\n/g, '\n').replace(/\n/g, lineEnding)
  if (!parses(candidate)) return { status: 'unplannable', renamed }
  return { status: 'repaired', renamed, after: `${bom}${open}${candidate}${close}${body.slice(match[0].length)}` }
}

/**
 * The legacy frontmatter keys the harness rejects and their canonical spelling.
 *
 * Mirrors `LEGACY_INVOCATION_KEYS` in `skill-acceptance.mjs`; the default lives
 * here so the migrator cannot be called without a rename table and silently do
 * nothing.
 */
const DEFAULT_LEGACY_RENAME = {
  disableModelInvocation: 'disable-model-invocation',
  modelInvocable: 'disable-model-invocation',
  userInvocable: 'user-invocable',
}

/**
 * Rewrite a frontmatter `name:` to a usable identifier.
 *
 * Third-party bundles contain names the provider rejects outright (`降Ai`
 * suffixes, stray quotes, non-ASCII), and the provider's name — not the folder —
 * is what `/` invokes. Rewriting it to the folder's identifier is the same
 * fallback the shipped-set build applies, so a bundle whose folder name is fine
 * becomes loadable instead of being refused.
 * @param text - full SKILL.md text.
 * @param name - the identifier to write; the caller guarantees it is valid kebab-case.
 * @returns { status, after? } — `valid` when the name already matches or the file
 *   has no frontmatter to rewrite.
 */
export function renameSkillFrontmatterName(text, name) {
  const { bom, body, match } = locateFrontmatter(text)
  if (match === null) return { status: 'valid' }
  const [full, open, block, close] = match
  const lineEnding = block.includes('\r\n') ? '\r\n' : '\n'
  let replaced = false
  const patched = block.split(/\r?\n/)
    .map((line) => {
      const keyed = line.match(/^name:(.*)$/)
      if (keyed === null) return line
      const current = keyed[1].trim().replace(/^["']|["']$/g, '')
      if (current === name) return line
      replaced = true
      return `name: ${name}`
    })
    .join(lineEnding)
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, lineEnding)
  if (!replaced) return { status: 'valid' }
  if (!parses(patched)) return { status: 'unplannable' }
  return { status: 'repaired', after: `${bom}${open}${patched}${close}${body.slice(full.length)}` }
}

/**
 * Bring one SKILL.md up to the frontmatter the harness accepts.
 *
 * Applies every mechanically fixable defect, in order: invalid YAML (quote the
 * offending scalar), then frontmatter keys the harness rejects (rename to their
 * canonical spelling), then an unusable `name` (rewrite to `options.name`). All
 * steps work on in-memory text that is written once, so a half-repaired file
 * never reaches disk, and only canonicalizations the parser accepts are written.
 * @param path - absolute SKILL.md path.
 * @param options - { rename?: legacy→canonical table; name?: identifier to write }
 * @returns { repaired, steps } — `steps` are human-readable, for logging and for
 *   telling the user what changed. Throws when the file cannot be read.
 */
export function migrateSkillFrontmatter(path, options = {}) {
  const rename = options.rename ?? DEFAULT_LEGACY_RENAME
  let body = readFileSync(path, 'utf8')
  const steps = []

  const yamlRepair = repairFrontmatterText(body)
  if (yamlRepair.status === 'repaired') {
    body = yamlRepair.after
    steps.push('frontmatter 加引号')
  }

  const keyRepair = renameLegacyFrontmatterKeys(body, rename)
  if (keyRepair.status === 'repaired') {
    body = keyRepair.after
    steps.push(...keyRepair.renamed.map((entry) => `字段改名 ${entry}`))
  }

  if (typeof options.name === 'string' && options.name !== '') {
    const nameRepair = renameSkillFrontmatterName(body, options.name)
    if (nameRepair.status === 'repaired') {
      body = nameRepair.after
      steps.push(`name 改为 ${options.name}`)
    }
  }

  if (steps.length === 0) return { repaired: false, steps }
  const temporary = `${path}.repair-tmp`
  writeFileSync(temporary, body, 'utf8')
  renameSync(temporary, path)
  return { repaired: true, steps }
}

/**
 * Apply a plan to disk. Writes through a temporary sibling and renames, so a
 * crash mid-write cannot leave a truncated SKILL.md behind.
 * @param path - absolute SKILL.md path.
 * @param plan - a `repaired` result from `repairFrontmatterText`/`planSkillRepair`.
 * @returns whether the file was rewritten.
 */
export function writeSkillRepair(path, plan) {
  if (plan.status !== 'repaired') return false
  const temporary = `${path}.repair-tmp`
  writeFileSync(temporary, plan.after, 'utf8')
  renameSync(temporary, path)
  return true
}
