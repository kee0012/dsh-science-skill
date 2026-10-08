// science/skill-acceptance.mjs
// The harness's skill acceptance rules, in one place.
//
// `skill-filesystem` parses each SKILL.md with a real YAML parser and **silently
// skips** any file it cannot accept: the skill never reaches the model and its
// `/name` invocation does nothing, with nothing in the UI to explain it. Every
// other component that judges a skill — the workbench import gate, the
// diagnostic report, the build — must apply the same rules, or one of them
// reports a skill as fine while the host refuses to load it. That divergence is
// exactly how a skill ends up installed, listed, and unusable.
//
// Keep this in step with `packages/skill/skill-filesystem/src/index.ts`
// (`discoverRoot` → `parseSkillFile`).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadTolerant } from './frontmatter-yaml.mjs'
import { planSkillRepair } from './skill-frontmatter.mjs'

/**
 * Read YAML with whatever parser is available.
 *
 * The harness itself reads frontmatter with the `yaml` package, so judging a
 * skill with the same parser is the only way to predict whether the host will
 * load it. That package is not this plugin's dependency, though — on a machine
 * that has it, resolution finds it; on one that does not, this package's own
 * subset reader answers instead. The subset reader rejects more than `yaml`
 * does, so the fallback can only ever report a skill as unreadable, never as
 * loadable when the host would refuse it. `parse` is undefined when neither is
 * available, and every caller treats that as "cannot judge".
 * @returns `{ parse, source }`.
 */
function loadYaml() {
  // `yaml` ships CJS as well as ESM; the CJS build exposes `parse` on the
  // namespace's `default`, so unwrap whichever shape arrived.
  const loaded = loadedModules.get('yaml')
  const parse = loaded?.parse ?? loaded?.default?.parse
  if (typeof parse === 'function') return { parse, source: 'yaml' }
  return { parse: loadTolerant, source: 'frontmatter-yaml' }
}

/** The parsers this module can resolve, filled by {@link primeYaml}. */
const loadedModules = new Map()

/**
 * Resolve the host's YAML parser, if it is present.
 *
 * A missing `yaml` must never be fatal: this module is imported at plugin boot,
 * and a hard failure here would take the whole plugin down on a machine that
 * simply does not have the package.
 * @returns {Promise<{ parse: (block: string) => unknown, source: string }>}
 */
export async function primeYaml() {
  try {
    loadedModules.set('yaml', await import('yaml'))
  } catch {
    // The subset reader stands in; see `loadYaml`.
  }
  return loadYaml()
}

const resolved = loadYaml()

/**
 * Parse a YAML document.
 * @param block - YAML text.
 */
export const parseYaml = resolved.parse

/** `SKILL_NAME` in `@deepseek-ai/dsh-skill`: the only accepted skill name form. */
export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Frontmatter keys the parser rejects outright; the canonical spelling is the value. */
export const LEGACY_INVOCATION_KEYS = {
  disableModelInvocation: 'disable-model-invocation',
  modelInvocable: 'disable-model-invocation',
  userInvocable: 'user-invocable',
}

/** The one filename the provider reads, case-sensitively. */
export const SKILL_FILENAME = 'SKILL.md'

/** The frontmatter block, matching the provider's own delimiters. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

/**
 * Read a skill directory's SKILL.md, tolerating a UTF-8 BOM.
 *
 * The name comparison is case-insensitive on purpose: the provider reads the
 * literal `SKILL.md`, so a directory holding only `skill.md` loads on Windows and
 * is skipped on Linux/macOS. Reporting that difference is this module's job.
 * @param dir - candidate skill directory.
 * @returns { path, text } or an error string.
 */
export function readSkillMarkdown(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true }).map((entry) => entry.name)
  } catch (error) {
    return { error: `目录无法读取：${error?.message ?? error}` }
  }
  if (!entries.includes(SKILL_FILENAME)) {
    const wrongCase = entries.find((entry) => entry.toLowerCase() === SKILL_FILENAME.toLowerCase())
    if (wrongCase !== undefined) {
      return { error: `文件名是 "${wrongCase}"；宿主只读 ${SKILL_FILENAME}，大小写不符会被跳过` }
    }
    return { error: `目录中没有 ${SKILL_FILENAME}` }
  }
  const path = join(dir, SKILL_FILENAME)
  try {
    return { path, text: readFileSync(path, 'utf8').replace(/^\uFEFF/, '') }
  } catch (error) {
    return { error: `${SKILL_FILENAME} 无法读取：${error?.message ?? error}` }
  }
}

/**
 * Judge one skill directory by the provider's rules.
 *
 * `fixable` reports whether {@link repairSkillFrontmatter} can turn a rejection
 * into an acceptance, so a caller can auto-repair instead of merely reporting.
 * A directory whose name differs from the frontmatter `name` is accepted — the
 * provider keys skills by `name` — but carries `invoke` so callers can tell the
 * user which command actually exists.
 * @param dir - candidate skill directory.
 * @returns { ok, code, error?, name?, description?, invoke?, fixable? }
 */
export function diagnoseSkillDir(dir) {
  const read = readSkillMarkdown(dir)
  if (read.error !== undefined) return { ok: false, code: 'no-skill-file', error: read.error }

  const match = read.text.match(FRONTMATTER)
  if (match === null) {
    return { ok: false, code: 'no-frontmatter', error: '缺少 YAML frontmatter（文件必须以 --- 开头，且成对闭合）' }
  }

  let data
  try {
    data = parseYaml(match[1])
  } catch (error) {
    const repairable = planSkillRepair(read.path).status === 'repaired'
    return {
      ok: false,
      code: 'invalid-yaml',
      fixable: repairable,
      error: `frontmatter 不是合法 YAML：${String(error?.message ?? error).split('\n')[0]}`
        + (repairable ? '（可自动修复）' : '（需手工修复）'),
    }
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, code: 'frontmatter-not-mapping', error: 'frontmatter 解析结果不是键值映射' }
  }

  const frontmatterName = typeof data.name === 'string' ? data.name : ''
  const description = typeof data.description === 'string' ? data.description : ''
  const directoryName = dir.replace(/[\\/]+$/, '').split(/[\\/]/).pop()
  if (frontmatterName === '') {
    // An absent name falls back to the folder, which is what the import gate and
    // the shipped-set build both do.
    if (SKILL_NAME.test(directoryName)) {
      return {
        ok: false,
        code: 'no-name',
        fixable: true,
        suggestedName: directoryName,
        error: `frontmatter 缺少 name；可用目录名 "${directoryName}" 补上`,
      }
    }
    return { ok: false, code: 'no-name', error: 'frontmatter 缺少 name，目录名也不能作为技能标识' }
  }
  if (description === '') {
    return { ok: false, code: 'no-description', error: 'frontmatter 缺少 description（宿主要求 name 与 description 都有）' }
  }
  if (!SKILL_NAME.test(frontmatterName)) {
    if (SKILL_NAME.test(directoryName)) {
      return {
        ok: false,
        code: 'bad-name',
        fixable: true,
        suggestedName: directoryName,
        error: `name "${frontmatterName}" 非法（只允许小写字母、数字与中间的单连字符）；可用目录名 "${directoryName}" 代替`,
      }
    }
    return {
      ok: false,
      code: 'bad-name',
      error: `name "${frontmatterName}" 非法：只允许小写字母、数字，以及中间的单连字符（如 my-skill-2）`,
    }
  }
  const legacy = Object.keys(LEGACY_INVOCATION_KEYS).find((key) => Object.hasOwn(data, key))
  if (legacy !== undefined) {
    return {
      ok: false,
      code: 'legacy-key',
      fixable: true,
      error: `frontmatter 用了旧字段 "${legacy}"，宿主会整个丢弃该技能；应改为 "${LEGACY_INVOCATION_KEYS[legacy]}"`,
    }
  }

  return { ok: true, code: 'ok', name: frontmatterName, description, invoke: `/${frontmatterName}`, directoryName }
}

/**
 * Diagnose every skill directory under a root.
 * @param skillsDir - a directory whose children are skill directories.
 * @returns { scanned, usable, rejected, warned } — `warned` entries are loadable
 *   but their `/invoke` differs from the directory name.
 */
export function diagnoseSkillsDir(skillsDir) {
  let entries
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true })
  } catch (error) {
    return { scanned: 0, usable: 0, rejected: [], warned: [], error: `无法读取 ${skillsDir}：${error?.message ?? error}` }
  }
  const rejected = []
  const warned = []
  let usable = 0
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const verdict = diagnoseSkillDir(join(skillsDir, entry.name))
    if (!verdict.ok) {
      rejected.push({ id: entry.name, ...verdict })
      continue
    }
    usable += 1
    if (verdict.name !== entry.name) warned.push({ id: entry.name, ...verdict })
  }
  return { scanned: usable + rejected.length, usable, rejected, warned }
}
