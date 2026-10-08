/**
 * A YAML reader for SKILL.md frontmatter.
 *
 * Why not a YAML engine: the only questions this package asks of YAML are "would
 * the harness's parser accept this frontmatter?" and "what do `name` and
 * `description` say?". Vendoring a full engine to answer those would be the
 * plugin's largest dependency for its least-used feature — the repair path only
 * runs when a third-party skill ships broken frontmatter — and an offline install
 * must not be able to fail on it.
 *
 * So this module reads only the subset a SKILL.md is allowed to contain
 * (top-level scalars, `key:` mappings one level deep, `- item` lists, block
 * scalars, quoted strings, flow collections) and rejects everything else. That
 * bias is deliberate: `load` throwing means "do not touch this file", never "this
 * file is beyond repair". A construct the harness would accept but this reader
 * refuses simply keeps its bytes as authored.
 *
 * The one shape it must reject is the defect the repair exists for: an unquoted
 * top-level scalar containing `": "` is a nested mapping to a real parser, so it
 * has to fail here too or the repair would never trigger.
 */

/** Keys and block-scalar indicators that may start a YAML node. */
const KEY_LINE = /^([A-Za-z_][\w-]*):(?:[ \t]+(.*))?$/
const SEQUENCE_LINE = /^-([ \t]+(.*))?$/
const BLOCK_SCALAR_HEADER = /^[|>][+-]?[0-9]?$/
/** An unquoted scalar cannot carry a `": "` (or a trailing `:`), which is a nested mapping. */
const UNQUOTED_NESTED_MAPPING = /:[ \t]|:$/

/** Thrown when the block is outside the subset this reader handles. */
export class YamlSubsetError extends Error {}

/** @param body - one line without its line ending. @returns its indent width, or -1 when it mixes tabs and spaces. */
function indentOf(body) {
  let spaces = 0
  for (const character of body) {
    if (character === ' ') spaces += 1
    else if (character === '\t') return -1
    else break
  }
  return spaces
}

/** @param value - a scalar's text after its key. @returns the value with a trailing comment and surrounding space removed. */
function stripComment(value) {
  let quote = null
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quote !== null) {
      if (character === '\\' && quote === '"') index += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '#' && (index === 0 || /[ \t]/.test(value[index - 1]))) return value.slice(0, index).trimEnd()
  }
  return value.trimEnd()
}

/**
 * Whether a scalar is written in a form this reader accepts.
 * @param value - trimmed scalar text.
 */
function isInlineScalar(value) {
  if (value === '') return true
  const first = value[0]
  if (first === '"' || first === "'") return value.length > 1 && value.endsWith(first)
  if (first === '[') return value.endsWith(']')
  if (first === '{') return value.endsWith('}')
  if (first === '*' || first === '&' || first === '!') return true
  // A plain scalar: the defect this reader exists to catch is a colon that opens
  // a nested mapping, which is exactly what an unquoted SKILL.md description with
  // an English sentence in it looks like.
  return !UNQUOTED_NESTED_MAPPING.test(value)
}

/**
 * Decode one inline scalar to its value.
 * @param value - trimmed scalar text.
 */
function decodeScalar(value) {
  if (value === '') return ''
  const first = value[0]
  if (first === '"' && value.length > 1) {
    const body = value.slice(1, -1)
    return body.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (whole, escape) => {
      switch (escape[0]) {
        case 'n': return '\n'
        case 't': return '\t'
        case 'r': return '\r'
        case '0': return '\0'
        case 'b': return '\b'
        case 'f': return '\f'
        case '"': return '"'
        case '\\': return '\\'
        case '/': return '/'
        default:
          if (escape[0] === 'u' || escape[0] === 'x') {
            const code = Number.parseInt(escape.slice(1), 16)
            return Number.isNaN(code) ? whole : String.fromCodePoint(code)
          }
          return escape
      }
    })
  }
  if (first === "'" && value.length > 1) return value.slice(1, -1).replace(/''/g, "'")
  return value
}

/**
 * Fold a block scalar's body into one string.
 *
 * Literal (`|`) keeps its line breaks, folded (`>`) joins them with spaces — the
 * distinction matters because a `description:` written as `>` is the shape a
 * multi-line summary arrives in.
 * @param lines - the scalar's own lines, indentation already stripped.
 * @param indicator - the header, e.g. `>-`.
 */
function foldBlockScalar(lines, indicator) {
  const folded = indicator[0] === '>'
  const chomp = indicator.includes('-') ? 'strip' : indicator.includes('+') ? 'keep' : 'clip'
  let text = folded
    // Blank lines survive a fold as paragraph breaks.
    ? lines.join('\n').replace(/([^\n])\n(?!\n)/g, '$1 ')
    : lines.join('\n')
  if (chomp === 'strip') text = text.replace(/\n+$/, '')
  else if (chomp === 'clip') text = text.replace(/\n+$/, '') + (text.endsWith('\n') || lines.length > 0 ? '\n' : '')
  return text
}

/** @param indicator - a `|`/`>` header. */
function blockScalarIndent(indicator) {
  const explicit = indicator.match(/(\d+)$/)
  return explicit === null ? undefined : Number(explicit[1])
}

/**
 * Read the frontmatter block of a SKILL.md as YAML.
 *
 * @param block - the text between the `---` fences.
 * @returns the parsed mapping.
 * @throws {YamlSubsetError} when the block is outside the subset this reader handles.
 */
export function load(block) {
  if (typeof block !== 'string') throw new YamlSubsetError('frontmatter 不是文本')
  const lines = block.split(/\r?\n/)
  const root = {}
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      index += 1
      continue
    }
    if (indentOf(line) !== 0) throw new YamlSubsetError('顶层字段不能有缩进')
    const body = line.trimEnd()

    if (SEQUENCE_LINE.test(body)) throw new YamlSubsetError('frontmatter 必须是键值映射')

    const keyed = body.match(KEY_LINE)
    if (keyed === null) throw new YamlSubsetError(`无法识别的行：${body}`)
    const key = keyed[1]
    const inline = stripComment(keyed[2] ?? '')
    if (BLOCK_SCALAR_HEADER.test(inline)) {
      const read = readBlockScalar(lines, index + 1, inline)
      root[key] = read.value
      index = read.next
      continue
    }
    if (!isInlineScalar(inline)) throw new YamlSubsetError(`字段 "${key}" 的取值不是合法标量`)
    if (inline !== '') {
      root[key] = decodeScalar(inline)
      index += 1
      continue
    }
    // An empty value may open an indented child block — a mapping or a sequence.
    const child = lines[index + 1]
    if (child === undefined || child.trim() === '') {
      root[key] = ''
      index += 1
      continue
    }
    const childIndent = indentOf(child)
    if (childIndent <= 0) {
      root[key] = ''
      index += 1
      continue
    }
    if (child.trimStart().startsWith('-')) {
      const read = readSequence(lines, index + 1, childIndent)
      root[key] = read.value
      index = read.next
    } else {
      const read = readMapping(lines, index + 1, childIndent)
      root[key] = read.value
      index = read.next
    }
  }
  return root
}

/**
 * Consume an indented mapping.
 * @param lines - all frontmatter lines.
 * @param start - first line of the block.
 * @param indent - the block's own indent.
 * @returns `{ value, next }`.
 */
function readMapping(lines, start, indent) {
  const value = {}
  let index = start
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      index += 1
      continue
    }
    const own = indentOf(line)
    if (own < indent) break // dedent ends the block
    if (own > indent) throw new YamlSubsetError('字段缩进不一致')
    // The line still carries the block's indentation, and KEY_LINE is anchored
    // at `^`, so it must be trimmed on both sides. Trimming only the end made
    // every nested mapping unparsable: a frontmatter that nests `metadata:`
    // (which the shipped science skills all do) was rejected outright, and the
    // catalog silently listed only the flat-frontmatter skills.
    const keyed = line.trim().match(KEY_LINE)
    if (keyed === null) throw new YamlSubsetError(`无法识别的行：${line.trim()}`)
    const inline = stripComment(keyed[2] ?? '')
    if (BLOCK_SCALAR_HEADER.test(inline)) {
      const read = readBlockScalar(lines, index + 1, inline)
      value[keyed[1]] = read.value
      index = read.next
      continue
    }
    if (!isInlineScalar(inline)) throw new YamlSubsetError(`字段 "${keyed[1]}" 的取值不是合法标量`)
    if (inline !== '') {
      value[keyed[1]] = decodeScalar(inline)
      index += 1
      continue
    }
    const child = lines[index + 1]
    if (child !== undefined && indentOf(child) > indent) {
      // A child block is a mapping or a sequence, exactly as at the top level.
      // Assuming a mapping made a nested list (`tags:` followed by `- one`)
      // throw, which rejected the whole skill.
      const childIndent = indentOf(child)
      const read = child.trimStart().startsWith('-')
        ? readSequence(lines, index + 1, childIndent)
        : readMapping(lines, index + 1, childIndent)
      value[keyed[1]] = read.value
      index = read.next
    } else {
      value[keyed[1]] = ''
      index += 1
    }
  }
  return { value, next: index }
}

/**
 * Consume a sequence block.
 * @param lines - all frontmatter lines.
 * @param start - first item line.
 * @param indent - the block's own indent.
 * @returns `{ value, next }`.
 */
function readSequence(lines, start, indent) {
  const value = []
  let index = start
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      index += 1
      continue
    }
    const own = indentOf(line)
    if (own < indent) break
    if (own > indent) throw new YamlSubsetError('列表项缩进不一致')
    // Same reason as the mapping reader: SEQUENCE_LINE is anchored at `^`, so a
    // nested sequence has to be trimmed on both sides to match at all.
    const item = line.trim().match(SEQUENCE_LINE)
    if (item === null) throw new YamlSubsetError(`列表项不是 "- " 开头：${line.trim()}`)
    const inline = stripComment(item[2] ?? '')
    if (!isInlineScalar(inline)) throw new YamlSubsetError('列表项不是合法标量')
    value.push(decodeScalar(inline))
    index += 1
  }
  return { value, next: index }
}

/**
 * Consume the indented body of a `|` / `>` block scalar.
 * @param lines - all frontmatter lines.
 * @param start - first line of the scalar body.
 * @param indicator - the `|`/`>` header.
 * @returns `{ value, next }`.
 */
function readBlockScalar(lines, start, indicator) {
  const explicit = blockScalarIndent(indicator)
  let first = start
  while (first < lines.length && lines[first].trim() === '') first += 1
  if (first >= lines.length) throw new YamlSubsetError('块标量没有任何内容')
  const base = explicit ?? indentOf(lines[first])
  if (base <= 0) throw new YamlSubsetError('块标量没有缩进')
  const body = []
  let index = start
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      body.push('')
      index += 1
      continue
    }
    if (indentOf(line) < base) break
    body.push(line.slice(base))
    index += 1
  }
  while (body.length > 0 && body[body.length - 1] === '') body.pop()
  return { value: foldBlockScalar(body, indicator), next: index }
}

/**
 * Read only the top-level scalar keys, ignoring structure entirely.
 *
 * This is the second chance for a document the strict reader refuses. It walks
 * the block once, keeps `key: value` pairs that start in column zero, appends
 * the indented continuation lines of a plain scalar that has already started
 * (a wrapped `description:` is the common case), and skips every nested block —
 * including constructs the subset reader does not model, like a sequence of
 * mappings or a list nested two levels deep.
 *
 * Nothing here is a general YAML parser and it must not become one: callers in
 * this package read `name` and `description` and nothing else.
 * @param block - the frontmatter body.
 * @returns the top-level scalars it could make out.
 */
function scanTopLevelScalars(block) {
  const data = {}
  let openKey = null
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (indentOf(line) === 0) {
      const keyed = line.match(KEY_LINE)
      if (keyed === null) {
        // A top-level sequence marker or prose: not something this package reads.
        openKey = null
        continue
      }
      const inline = stripComment(keyed[2] ?? '')
      if (inline !== '' && isInlineScalar(inline)) data[keyed[1]] = decodeScalar(inline)
      else if (inline === '') data[keyed[1]] = ''
      // An unmodelled inline form keeps the key so its continuation is not lost.
      openKey = keyed[1]
      continue
    }
    if (openKey === null) continue
    const text = line.trim()
    if (text === '' || text.startsWith('-') || KEY_LINE.test(text)) continue
    const existing = data[openKey]
    data[openKey] = typeof existing === 'string' && existing !== '' ? `${existing} ${text}` : text
  }
  return data
}

/**
 * Parse frontmatter, standing in for YAML the strict reader cannot model.
 *
 * The subset reader throws on constructs the host's own `yaml` package accepts —
 * a wrapped plain scalar, a sequence of mappings, a list under a nested key. The
 * host loads those skills happily, so rejecting them here would hide skills that
 * work, which is exactly what a catalog must not do.
 *
 * The scan only takes over when it actually found something the callers read;
 * otherwise the original error is rethrown so a genuinely broken file is still
 * reported as broken (and stays eligible for the repair path).
 * @param block - the frontmatter body.
 * @returns the parsed mapping.
 */
export function loadTolerant(block) {
  try {
    return load(block)
  } catch (error) {
    const scanned = scanTopLevelScalars(block)
    if (typeof scanned.name === 'string' || typeof scanned.description === 'string') return scanned
    throw error
  }
}
