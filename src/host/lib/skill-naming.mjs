// science/skill-naming.mjs
// Name an imported skill in Chinese with the user's default model.
//
// A skill the user imports has only its own English SKILL.md, while the rail
// shows a Chinese name and a one-line Chinese summary. This reads the skill's
// `name` and `description`, asks the default chat model for the Chinese pair plus
// the category to file it under, and reports the result for the caller to store.
//
// The call is one plain request to the configured provider, using the default
// model from settings — no extra configuration surface, and none of the kernel's
// per-session request machinery, which a background naming call has no session
// for.
//
// Where the default model lives changed with the kernel: 0.1.7 moved user
// settings out of `<root>/settings.yaml` into per-entry profile-patch config
// (`profiles/<profile>/cordis.patch.yml`), and the kernel imports the old
// document away to `settings.yaml.imported`. A naming call that only read the
// retired file therefore reported "没有默认模型" on a root whose model was in
// fact configured and running. The caller now passes the live value the running
// composition resolved (`agentDefaultModel`), and the file readers below stay as
// the fallback for a caller with no kernel context.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseYaml } from './skill-acceptance.mjs'

/** Endpoint for the built-in provider route, whose config carries no baseURL. */
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
/** Credential ref that route resolves by default. */
const DEEPSEEK_API_KEY_ENV = 'DEEPSEEK_API_KEY'
/** Category used when the model is unavailable or names something unknown. */
export const FALLBACK_CATEGORY = 'misc'

/**
 * Documents read for a settings section, lowest priority first.
 *
 * `settings.yaml` is the retired namespace document; `settings.yaml.imported` is
 * what the kernel renamed it to after its one import, and is therefore the only
 * remaining copy on a migrated root. `settings-compat.json` holds the namespaces
 * third-party plugins wrote through the compatibility layer.
 */
const LEGACY_SETTINGS_DOCUMENTS = ['settings.yaml.imported', 'settings.yaml', 'settings-compat.json']
/** Home-level loader patch, which overrides the profile patch in the kernel's own read. */
const HOME_PATCH_DOCUMENT = 'cordis.patch.yml'

const MAX_NAME_CHARS = 24
const MAX_SUMMARY_CHARS = 120
/** Longest one "试试这样用" example, in characters. */
const MAX_EXAMPLE_CHARS = 40
/** How many examples one record keeps; the prompt asks for two or three. */
const MAX_EXAMPLES = 3
const REQUEST_TIMEOUT_MS = 60_000

/** Whether a value is a plain data object rather than an array, null, or class instance. */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read one settings or loader-patch document into a section map.
 *
 * A loader patch is a YAML sequence of `{ id, name, config }` rows, which is how
 * the running composition stores the user's per-entry overrides; folding it into
 * the same `{ section: value }` map a settings document uses lets both answer the
 * same question.
 * @param path - document path.
 * @returns the section map, or undefined when the file is absent or unreadable.
 */
function loadDocument(path) {
  if (!existsSync(path)) return undefined
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
  if (path.endsWith('.json')) {
    try {
      const parsed = JSON.parse(text.replace(/^\uFEFF/, ''))
      return isPlainObject(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  let parsed
  try {
    parsed = parseYaml(text)
  } catch {
    // A patch may carry a tag this parser cannot resolve; the other documents
    // still answer, so one unreadable source is skipped rather than fatal.
    return undefined
  }
  if (Array.isArray(parsed)) {
    const sections = {}
    for (const row of parsed) {
      if (!isPlainObject(row) || typeof row.id !== 'string' || !isPlainObject(row.config)) continue
      sections[row.id] = isPlainObject(sections[row.id]) ? { ...sections[row.id], ...row.config } : row.config
    }
    return sections
  }
  return isPlainObject(parsed) ? parsed : undefined
}

/**
 * Merge every document that may carry the effective settings.
 *
 * The profile patch wins over the retired documents because it is what the
 * running composition reads; the home patch wins over the profile patch, which is
 * the order the kernel's own configuration editor reports.
 * @param root - data root.
 * @param patchPaths - profile patch documents supplied by the caller, lowest first.
 * @returns one merged section map, empty when nothing was readable.
 */
function effectiveSections(root, patchPaths) {
  const merged = {}
  const paths = [
    ...LEGACY_SETTINGS_DOCUMENTS.map((name) => join(root, name)),
    // A caller that supplies no patch paths must not be a crash: spreading
    // `undefined` threw out of `nameSkill` before any of its own error handling
    // could turn the miss into a reported failure.
    ...(Array.isArray(patchPaths) ? patchPaths : []),
    join(root, HOME_PATCH_DOCUMENT),
  ]
  for (const path of paths) {
    const sections = loadDocument(path)
    if (sections === undefined) continue
    for (const [key, value] of Object.entries(sections)) {
      merged[key] = isPlainObject(merged[key]) && isPlainObject(value)
        ? { ...merged[key], ...value }
        : value
    }
  }
  return merged
}

/**
 * Read the model this root uses for naming: the user's default chat model.
 *
 * The caller's live value wins — it is what the running composition resolved,
 * including a selection saved after this process read any document. Without it,
 * the merged documents answer, and an empty pair means no default model is
 * configured anywhere readable.
 * @param root - data root.
 * @param options - { target?, patchPaths? } — `target` is the live
 *   `{ provider, model }` from the running kernel; `patchPaths` are profile
 *   patch documents to read below the home patch.
 * @returns { provider, model } — both empty when no default model was found.
 */
export function readDefaultModel(root, options = {}) {
  const live = options.target
  if (typeof live?.provider === 'string' && live.provider !== ''
    && typeof live?.model === 'string' && live.model !== '') {
    return { provider: live.provider, model: live.model }
  }
  const configured = effectiveSections(root, options.patchPaths ?? [])['agent-default-model']
  return {
    provider: typeof configured?.provider === 'string' ? configured.provider : '',
    model: typeof configured?.model === 'string' ? configured.model : '',
  }
}

/**
 * Resolve where to send the request and which credential it needs.
 *
 * The built-in `deepseek-official` route carries no `baseURL` of its own, so it
 * falls back to the provider's public endpoint; a configured route
 * (`llm-pi-ai.providers.<key>`) supplies its own endpoint and credential name,
 * read from the profile patch that now stores it.
 * @param root - data root.
 * @param provider - provider route key.
 * @param patchPaths - profile patch documents to read below the home patch.
 * @returns { baseURL, apiKeyEnv } or undefined when the route is unknown.
 */
function resolveProvider(root, provider, patchPaths) {
  const configured = effectiveSections(root, patchPaths)['llm-pi-ai']?.providers?.[provider]
  if (isPlainObject(configured)) {
    const baseURL = typeof configured.baseURL === 'string' ? configured.baseURL : ''
    const apiKeyEnv = typeof configured.apiKeyEnv === 'string' ? configured.apiKeyEnv : ''
    if (baseURL !== '' && apiKeyEnv !== '') return { baseURL, apiKeyEnv }
  }
  if (provider === 'deepseek-official') return { baseURL: DEEPSEEK_BASE_URL, apiKeyEnv: DEEPSEEK_API_KEY_ENV }
  return undefined
}

/**
 * Read one credential out of the data root's store without parsing the document.
 *
 * The store also holds a `records` section whose keys are identifiers like
 * `client-connection/browser-session`. A `/` in a key is beyond the subset
 * reader this package falls back to on a machine without the `yaml` package, and
 * one such key took the whole document down with it — so every naming call
 * reported a missing credential while the key sat in `refs` all along. Only
 * `refs.<name>` is wanted here, so only that is read.
 * @param text - the credential store's contents.
 * @param name - credential name, e.g. `DEEPSEEK_API_KEY`.
 * @returns the secret, or undefined when the block or the entry is absent.
 */
export function readCredentialRef(text, name) {
  let inRefs = false
  let refsIndent = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const body = line.trim()
    const indent = line.length - line.trimStart().length
    if (!inRefs) {
      if (body === 'refs:') {
        inRefs = true
        refsIndent = indent
      }
      continue
    }
    // The block ends at the first line that is not deeper than `refs:` itself.
    if (indent <= refsIndent) return undefined
    const keyed = body.match(/^(.+?):(?:[ \t]+(.*))?$/)
    if (keyed === null || keyed[1].trim() !== name) continue
    const value = (keyed[2] ?? '').trim().replace(/^['"]|['"]$/gu, '')
    if (value !== '') return value
  }
  return undefined
}

/**
 * Resolve a credential: the process environment first, then the data root's
 * credential refs, which is where the shell stores what it read at setup.
 * @param root - data root.
 * @param name - credential name, e.g. `DEEPSEEK_API_KEY`.
 * @returns the secret, or undefined when neither source has it.
 */
function resolveApiKey(root, name) {
  const fromEnv = process.env[name]
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  let text
  try {
    text = readFileSync(join(root, '.credentials.yaml'), 'utf8')
  } catch {
    // No credential store; the caller reports the miss.
    return undefined
  }
  const scanned = readCredentialRef(text, name)
  if (scanned !== undefined) return scanned
  try {
    const parsed = parseYaml(text)?.refs?.[name]
    if (typeof parsed === 'string' && parsed.trim() !== '') return parsed.trim()
  } catch {
    // A store this parser cannot read has already been served by the scan above.
  }
  return undefined
}

/**
 * The instruction sent to the model.
 *
 * The category list is enumerated so the model chooses from what exists, and the
 * reply is constrained to one JSON object because code consumes it.
 *
 * The examples ride the same call as the name and summary on purpose: they are
 * one more thing the model already has the skill's description in hand for, and
 * a second request for them would double the cost of naming a whole library.
 * @param input - { skillId, description, categories }
 * @returns the prompt text.
 */
export function buildNamingPrompt(input) {
  return [
    '你在为一个科研软件的功能清单录入新技能，请根据技能资料给出中文展示信息。',
    '',
    `技能标识（英文）：${input.skillId}`,
    `技能原始说明（可能为英文）：${input.description || '（无说明）'}`,
    '',
    '可选分类（只能从中选一个，返回其 key）：',
    input.categories.map((entry) => `- ${entry.key}: ${entry.label}`).join('\n'),
    '',
    '请只返回一个 JSON 对象，不要任何解释、不要 markdown 代码块，格式如下：',
    '{"name":"中文名称","summary":"一句话中文描述","category":"分类key","examples":["试试这样用的示例一","示例二"]}',
    '',
    '要求：',
    `- name：中文名称，不超过 ${MAX_NAME_CHARS} 个汉字，专业、简洁，不要带引号或标点结尾`,
    `- summary：一句话中文描述，不超过 ${MAX_SUMMARY_CHARS} 字，说明这个技能能做什么`,
    '- category：从上面列表里选一个最贴切的 key；确实没有合适的就选 misc',
    `- examples：2～3 条「试试这样用」的示例提问，每条不超过 ${MAX_EXAMPLE_CHARS} 字。`
      + '要写成用户真的会打进对话框的那句话，口语化、具体、有指向性；'
      + '不要以「使用…」开头，不要写成功能说明，不要出现技能标识或命令名',
  ].join('\n')
}

/**
 * Normalize the model's `examples` list.
 *
 * Examples are decoration on top of the name and summary, so anything unusable
 * degrades to an empty list instead of failing the call: a reply without
 * examples is still worth storing, and re-asking for them would spend a second
 * request on something the panel can live without.
 * @param value - whatever the model put under `examples`.
 * @returns up to {@link MAX_EXAMPLES} distinct, whitespace-collapsed lines.
 */
function normalizeExamples(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const examples = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    // Models answer with newlines and doubled spaces inside a "one-line"
    // example; collapsing keeps the chip-sized rendering predictable.
    const text = entry.replace(/\s+/gu, ' ').trim()
    if (text === '') continue
    const clipped = text.slice(0, MAX_EXAMPLE_CHARS)
    if (seen.has(clipped)) continue
    seen.add(clipped)
    examples.push(clipped)
    if (examples.length === MAX_EXAMPLES) break
  }
  return examples
}

/**
 * Parse the model's reply into a validated result.
 *
 * Tolerates a fenced block or surrounding prose, because models add them even
 * when told not to; everything else is rejected rather than guessed.
 *
 * `examples` is the one field that degrades instead of rejecting: it is optional
 * display sugar, so a reply carrying a usable name and summary is still a good
 * reply, and the caller stores an empty list.
 * @param text - raw model output.
 * @param categories - allowed `{ key, label }` choices.
 * @returns { ok, name?, summary?, category?, examples?, error? }
 */
export function parseNamingReply(text, categories) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced === null ? text : fenced[1]).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end <= start) return { ok: false, error: '模型没有返回 JSON' }
  let parsed
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1))
  } catch (error) {
    return { ok: false, error: `模型返回的 JSON 无法解析：${String(error?.message ?? error)}` }
  }
  if (parsed === null || typeof parsed !== 'object') return { ok: false, error: '模型返回的不是对象' }

  const name = typeof parsed.name === 'string' ? parsed.name.trim().replace(/[。；;，,]$/, '') : ''
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  const answer = typeof parsed.category === 'string' ? parsed.category.trim() : ''
  if (name === '') return { ok: false, error: '模型没有给出中文名称' }
  if (summary === '') return { ok: false, error: '模型没有给出中文描述' }
  // The reply may name a category by its key or by the label shown in the prompt;
  // either is a real choice, and anything else is the fallback rather than a
  // category the model invented.
  const chosen = categories.find((entry) => entry.key === answer)
    ?? categories.find((entry) => entry.label === answer)
  return {
    ok: true,
    name: name.slice(0, MAX_NAME_CHARS),
    summary: summary.slice(0, MAX_SUMMARY_CHARS),
    category: chosen?.key ?? FALLBACK_CATEGORY,
    examples: normalizeExamples(parsed.examples),
  }
}

/**
 * Name and categorize one skill with the default model.
 *
 * Never throws: a caller stores the failure and leaves the English name in place.
 * @param root - data root.
 * @param input - { skillId, description, categories }
 * @param options - { target?, patchPaths? } passed through to the model lookup.
 * @returns { ok, name?, summary?, category?, examples?, error? } — `examples` is
 *   `[]` rather than absent when the model did not supply usable ones.
 */
export async function nameSkill(root, input, options = {}) {
  const target = readDefaultModel(root, options)
  if (target.provider === '' || target.model === '') {
    return { ok: false, error: '设置里没有默认模型，无法自动命名' }
  }
  const route = resolveProvider(root, target.provider, options.patchPaths)
  if (route === undefined) {
    return { ok: false, error: `找不到渠道 "${target.provider}" 的配置` }
  }
  const apiKey = resolveApiKey(root, route.apiKeyEnv)
  if (apiKey === undefined) {
    return { ok: false, error: `渠道 "${target.provider}" 缺少密钥（${route.apiKeyEnv}）` }
  }

  const body = JSON.stringify({
    model: target.model,
    messages: [{ role: 'user', content: buildNamingPrompt(input) }],
    temperature: 0,
    // A reasoning model spends output tokens on its reasoning first, so a small
    // cap leaves the answer empty. This budget covers the reasoning plus the
    // one-object reply.
    max_tokens: 4096,
  })
  try {
    const response = await fetch(`${route.baseURL.replace(/\/+$/u, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const text = await response.text()
    if (!response.ok) {
      return { ok: false, error: `模型返回 HTTP ${response.status}：${text.slice(0, 200)}` }
    }
    const payload = JSON.parse(text)
    const message = payload?.choices?.[0]?.message
    // `content` is the answer; a reasoning model may instead leave it empty and
    // put the text in its reasoning field, which still carries the JSON.
    const content = typeof message?.content === 'string' && message.content.trim() !== ''
      ? message.content
      : (typeof message?.reasoning_content === 'string' ? message.reasoning_content : '')
    if (content.trim() === '') {
      const finish = payload?.choices?.[0]?.finish_reason
      return { ok: false, error: `模型没有返回内容（finish_reason=${finish ?? '未知'}）` }
    }
    return { ...parseNamingReply(content, input.categories), model: `${target.provider}/${target.model}` }
  } catch (error) {
    return { ok: false, error: `模型调用失败：${String(error?.message ?? error)}` }
  }
}
