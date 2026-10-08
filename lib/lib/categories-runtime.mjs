// science/workbench-web/categories-runtime.mjs
// Category model for the science data root: the builtin research categories
// plus user-defined ones, persisted together at
// <root>/catalog/categories.json. Key generation and CRUD helpers live here;
// the HTTP surface is in plugin.mjs.
//
// Builtin categories are the *defaults*, not a hardcoded privilege: they are
// seeded into the data root on first use and then carry the same edit rights as
// custom ones (rename, re-icon, delete). `restoreDefaults()` reinstates the
// shipped set, so a deleted builtin is recoverable without touching the data
// root by hand.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * One category entry.
 * @typedef {object} CategoryEntry
 * @property {string} key - stable id (also the catalog `category` value).
 * @property {string} icon - icon name (a Lucide id such as `book-open`); legacy
 *   values that still hold an emoji are migrated on read.
 * @property {string} label - display name.
 * @property {boolean} custom - true for user-created entries.
 * @property {number} order - display position, ascending.
 */

/** The shipped category set: the seed for a data root, and the restore target. */
export const DEFAULT_CATEGORIES = [
  { key: 'literature', icon: 'book-open', label: '文献' },
  { key: 'writing', icon: 'pen-line', label: '写作' },
  { key: 'data-analysis', icon: 'chart-column', label: '数据分析' },
  { key: 'figure', icon: 'chart-line', label: '绘图' },
  { key: 'review', icon: 'star', label: '审稿' },
  { key: 'presentation', icon: 'monitor', label: '汇报' },
  { key: 'lab', icon: 'flask-conical', label: '实验' },
  { key: 'topic', icon: 'lightbulb', label: '选题' },
  { key: 'outcome', icon: 'medal', label: '成果' },
  { key: 'document', icon: 'file-text', label: '文档' },
  { key: 'misc', icon: 'package', label: '其他' },
]

/** Fallback icon for an entry whose stored value resolves to nothing. */
export const DEFAULT_CATEGORY_ICON = 'folder'

/** Skill category for internal support packages; never a stored category. */
export const INTERNAL_CATEGORY = 'internal'

/**
 * Emoji → icon-name migration. Legacy data (and an older client) stored an
 * emoji in `icon`; every glyph the previous model could assign maps to the
 * closest line icon so an upgrade never leaves a colored glyph in the rail.
 * @type {Record<string, string>}
 */
const LEGACY_EMOJI_ICONS = {
  '📁': 'folder', '💰': 'coins', '💡': 'lightbulb', '🧬': 'dna', '🧫': 'test-tube',
  '🔬': 'microscope', '💊': 'pill', '⚗️': 'flask-round', '⚛️': 'atom', '🌍': 'globe',
  '🤖': 'terminal', '🧠': 'brain', '📊': 'chart-column', '🧾': 'receipt', '📋': 'clipboard-list',
  '🛠️': 'wrench', '🗂️': 'folder-tree', '📚': 'book-open', '✍️': 'pen-line', '🎨': 'palette',
  '🧑‍⚖️': 'star', '🎤': 'monitor', '🧪': 'flask-conical', '📦': 'package', '🔍': 'search',
  '📌': 'pin', '🧩': 'puzzle', '📝': 'notebook-pen', '📈': 'chart-line',
}

/** Every emoji the migration table knows, longest first (ZWJ sequences first). */
const LEGACY_EMOJI_KEYS = Object.keys(LEGACY_EMOJI_ICONS).sort((a, b) => b.length - a.length)

/**
 * Resolve a stored category icon to a renderable icon name.
 *
 * Accepts an icon name as-is; maps a legacy emoji through `LEGACY_EMOJI_ICONS`;
 * strips any remaining pictograph; falls back to `DEFAULT_CATEGORY_ICON` so the
 * rail always draws a glyph.
 * @param value - stored `icon` value (icon name or legacy emoji).
 * @returns an icon name.
 */
export function normalizeCategoryIcon(value) {
  const raw = (value ?? '').trim()
  if (raw === '') return DEFAULT_CATEGORY_ICON
  const known = LEGACY_EMOJI_KEYS.find((emoji) => raw.includes(emoji))
  if (known !== undefined) return LEGACY_EMOJI_ICONS[known]
  // An unmapped pictograph still must not reach the rail as colored text.
  const stripped = raw.replace(/\p{Extended_Pictographic}/gu, '').trim()
  return stripped === '' ? DEFAULT_CATEGORY_ICON : raw
}

/**
 * Split a leading emoji glyph off a category name the user typed.
 * @param name - raw user input, e.g. "📁 基金申请" or "基金申请".
 * @returns { label: string } the name with any leading emoji removed.
 */
export function extractIconAndLabel(name) {
  const trimmed = (name ?? '').trim()
  const emoji = /^(\p{Extended_Pictographic}\u{FE0F}?)/u.exec(trimmed)
  if (emoji) return { label: trimmed.slice(emoji[1].length).trim() }
  return { label: trimmed }
}

/**
 * The icon glyphs this build can render, as Lucide (ISC) path data on Lucide's
 * 24×24 grid. Kept local — the client packages may not take a third-party icon
 * dependency — so the same ids resolve on the server (validation, picker list)
 * and in the rail (`ScienceCategoryIcon`).
 * @type {Record<string, string>}
 */
export const CATEGORY_ICON_PATHS = {
  'book-open': '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  'library': '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'files': '<path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>',
  'notebook-pen': '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.4 2.6a2 2 0 0 0-2.8 0l-7 7L11 13l3.4-.6 7-7a2 2 0 0 0 0-2.8z"/>',
  'pen-line': '<path d="M12 20h9"/><path d="M16.4 3.6a2 2 0 0 1 2.8 2.8L7.5 18.1a2 2 0 0 1-.9.5l-3.2.8.8-3.2a2 2 0 0 1 .5-.9z"/>',
  'pencil-ruler': '<path d="M13 7 8.7 2.7a2.4 2.4 0 0 0-3.4 0L2.7 5.3a2.4 2.4 0 0 0 0 3.4L7 13"/><path d="m8 6 2-2"/><path d="m18 16 2-2"/><path d="m17 11 4.3 4.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L11 17"/><path d="M21.2 7.8 7.8 21.2a1 1 0 0 1-1.4 0l-3.6-3.6a1 1 0 0 1 0-1.4L16.2 2.8a1 1 0 0 1 1.4 0l3.6 3.6a1 1 0 0 1 0 1.4z"/>',
  'highlighter': '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  'quote': '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3"/>',
  'languages': '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  'type': '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'flask-conical': '<path d="M14 2v6a2 2 0 0 0 .2.9l4.6 9.3A2 2 0 0 1 17 21H7a2 2 0 0 1-1.8-2.8l4.6-9.3A2 2 0 0 0 10 8V2"/><path d="M6.5 15h11"/><path d="M8.5 2h7"/>',
  'flask-round': '<path d="M10 2v6.3a1 1 0 0 1-.2.6L5 17a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-4.8-8.1a1 1 0 0 1-.2-.6V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  'test-tube': '<path d="M14.5 2v17.5a2.5 2.5 0 0 1-5 0V2"/><path d="M14.5 16h-5"/><path d="M8.5 2h6"/>',
  'test-tubes': '<path d="M9 2v17.5A2.5 2.5 0 0 1 6.5 22 2.5 2.5 0 0 1 4 19.5V2"/><path d="M16 2v17.5a2.5 2.5 0 0 1-5 0"/><path d="M14 2v12h4V2"/><path d="M3 2h7"/><path d="M14 2h6"/>',
  'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  'dna': '<path d="m10 16 1.5 1.5"/><path d="m14 8-1.5-1.5"/><path d="M15 2c-1.8 1.8-2.5 3.5-2.5 5.5 0 4.5 4 6.5 4 11 0 2-.7 3.7-2.5 5.5"/><path d="M9 22c1.8-1.8 2.5-3.5 2.5-5.5 0-4.5-4-6.5-4-11C7.5 3.5 8.2 1.8 10 0"/>',
  'atom': '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
  'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  'brain': '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>',
  'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'chart-column': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'chart-line': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  'chart-scatter': '<circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="18.5" cy="5.5" r=".5" fill="currentColor"/><circle cx="11.5" cy="11.5" r=".5" fill="currentColor"/><circle cx="7.5" cy="16.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="14.5" r=".5" fill="currentColor"/><path d="M3 3v16a2 2 0 0 0 2 2h16"/>',
  'pie-chart': '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
  'table': '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  'sigma': '<path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/>',
  'square-function': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/>',
  'image': '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'shapes': '<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  'palette': '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  'monitor': '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  'presentation': '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
  'mic': '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  'star': '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  'tag': '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  'folder-tree': '<path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 14h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5a1 1 0 0 0 1 1h2"/><path d="M3 5v14a1 1 0 0 0 1 1h5"/><path d="M6 5v14"/>',
  'archive': '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  'package': '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
  'package-open': '<path d="M12 22v-9"/><path d="M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"/><path d="M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"/><path d="M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  'rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'medal': '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
  'award': '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  'badge-check': '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  'code': '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  'terminal': '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  'wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  'wand-sparkles': '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'pin': '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  'puzzle': '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
  'folder-open': '<path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  'coins': '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  'file-spreadsheet': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  'chart-no-axes-column': '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
}

/**
 * The icons offered in the category icon picker, in display order: a curated
 * research-oriented slice of the set above rather than the full library.
 * @type {string[]}
 */
export const PICKER_ICON_NAMES = [
  'book-open', 'library', 'file-text', 'files', 'notebook-pen', 'file-spreadsheet',
  'pen-line', 'highlighter', 'quote', 'languages', 'type',
  'lightbulb', 'target', 'brain', 'puzzle',
  'flask-conical', 'flask-round', 'test-tube', 'test-tubes', 'microscope', 'dna', 'atom',
  'pill', 'heart-pulse',
  'chart-column', 'chart-line', 'chart-scatter', 'chart-no-axes-column', 'pie-chart',
  'table', 'database', 'sigma', 'square-function',
  'image', 'palette', 'shapes', 'layout-grid',
  'monitor', 'presentation', 'mic', 'star', 'medal', 'award', 'badge-check',
  'clipboard-list', 'receipt', 'tag', 'folder', 'folder-tree', 'folder-open',
  'archive', 'package', 'package-open', 'globe', 'leaf', 'rocket', 'scale',
  'code', 'terminal', 'wrench', 'wand-sparkles', 'search', 'pin',
]
/** Subset of the above that is a valid icon name (guards against typos here). */
const KNOWN_ICON_NAMES = new Set(Object.keys(CATEGORY_ICON_PATHS))

/**
 * Typical research topic → icon suggestion, for a new category whose name the
 * user typed without choosing an icon. Chinese keywords match as substrings;
 * ASCII keywords need a word boundary so e.g. `ai` does not hit inside
 * `waiting`. Order matters: the first rule with a hit wins.
 * @type {Array<{ icon: string, keywords: string[] }>}
 */
export const ICON_RULES = [
  { icon: 'coins', keywords: ['基金', '申请', '资助', '标书', '预算', '经费', 'grant', 'fund', 'funding'] },
  { icon: 'medal', keywords: ['专利', '发明', '交底', '软著', '著作权', '成果', 'patent', 'copyright'] },
  { icon: 'dna', keywords: ['基因', '基因组', '测序', '生信', '转录', '单细胞', '组学', 'genome', 'seq', 'dna', 'rna', '遗传', '变异', '突变', '进化', 'phylogeny'] },
  { icon: 'test-tube', keywords: ['细胞', '培养', '蛋白', '抗体', '分子', '细胞系', 'cell', 'protein', 'antibody', '菌', 'bacteria'] },
  { icon: 'microscope', keywords: ['显微', '影像', '切片', '病理', '图像', 'microscopy', 'imaging', '电镜', 'sem', 'tem'] },
  { icon: 'pill', keywords: ['药物', '药理', '临床', '疾病', '药靶', 'drug', 'clinical', '药', '病', '疗效', '毒理', 'pharma'] },
  { icon: 'flask-round', keywords: ['化学', '合成', '材料', '催化', 'chemistry', 'material', '反应', '聚合物', 'polymer', '电池'] },
  { icon: 'atom', keywords: ['物理', '量子', '光学', '光子', 'physics', 'quantum', 'optics', '力学', '电磁'] },
  { icon: 'globe', keywords: ['地球', '气候', '环境', '生态', '遥感', '水文', 'earth', 'climate', 'remote', '地质', '土壤', '大气', '气象', '海洋'] },
  { icon: 'brain', keywords: ['认知', '神经', '脑', '心理', 'brain', 'neural', '行为', '情绪', '记忆'] },
  { icon: 'terminal', keywords: ['智能', '模型', '算法', '机器', '学习', '深度', '强化', '神经网', 'agent', 'ai', 'ml', 'model', '大模型', 'llm'] },
  { icon: 'chart-column', keywords: ['统计', '数据', '分析', '回归', 'statistics', 'data', '概率'] },
  { icon: 'chart-line', keywords: ['可视化', '图表', '画图', 'visualization', 'plot', 'chart', 'graph'] },
  { icon: 'image', keywords: ['绘图', '插图', '配图', 'figure', 'diagram', '示意图', '作画'] },
  { icon: 'monitor', keywords: ['汇报', '演示', 'ppt', 'slide', 'presentation', '演讲', '答辩'] },
  { icon: 'star', keywords: ['审稿', '评审', '同行', 'reviewer', 'peer', '评价'] },
  { icon: 'flask-conical', keywords: ['实验', '试验', '检测', '测定', 'experiment', 'assay', 'protocol'] },
  { icon: 'target', keywords: ['选题', '方向', '目标', 'idea', 'topic', 'proposal', '方案'] },
  { icon: 'file-text', keywords: ['文档', '格式', '报告', 'document', 'docx', 'word', 'pdf', 'xlsx', 'excel'] },
  { icon: 'palette', keywords: ['设计', '海报', '视觉', 'design', 'poster', 'visual'] },
  { icon: 'search', keywords: ['检索', '文献', '阅读', '书籍', 'library', 'search', 'reference', 'literature'] },
  { icon: 'pen-line', keywords: ['写作', '论文', '投稿', '手稿', 'writing', 'paper', 'manuscript', '撰写', '润色', '草稿'] },
  { icon: 'folder-tree', keywords: ['项目', '管理', '协作', '规划', 'project', 'manage', '课题', '团队'] },
  { icon: 'wrench', keywords: ['工具', '开发', '脚本', '代码', 'workflow', 'tool', '软件', '自动化'] },
]

/** ASCII keywords match on a word boundary, Chinese on plain substring. */
function keywordHit(text, keyword) {
  if (/[\u4e00-\u9fff]/.test(keyword)) return text.includes(keyword)
  return new RegExp(`(^|[^a-z0-9])${keyword}($|[^a-z0-9])`, 'i').test(text)
}

/**
 * Suggest an icon for a plain (emoji-free) category label by keyword rules.
 * Never returns undefined for a non-empty label: labels no rule matches fall
 * back to a stable pick from the picker set, so "添加分类" always previews a
 * usable icon instead of an empty seat.
 * @param label - category label with any leading emoji already stripped.
 * @returns a matching icon name, or undefined for an empty label.
 */
export function suggestIconForLabel(label) {
  const hay = label.trim().toLowerCase()
  if (!hay) return undefined
  for (const rule of ICON_RULES) {
    if (rule.keywords.some((keyword) => keywordHit(hay, keyword))) return rule.icon
  }
  const pool = PICKER_ICON_NAMES.filter((name) => KNOWN_ICON_NAMES.has(name))
  const code = hay.codePointAt(0) ?? 0
  return pool[code % pool.length]
}


/** Slugify any latin text to a kebab key; non-latin (CJK) input → empty. */
export function slugifyCategoryKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a unique category key for a new entry: latin labels slug to readable
 * keys (grant-writing), CJK labels fall back to custom-<n>; any collision with
 * an existing key appends a numeric suffix.
 * @param taken - keys already in use.
 * @param label - the category label (emoji already stripped by caller).
 * @returns a key that does not collide.
 */
export function nextCategoryKey(taken, label) {
  const used = new Set(taken)
  const base = slugifyCategoryKey(label) || 'custom'
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** Absolute path of the persisted category list. */
export function categoriesPath(root) {
  return join(root, 'catalog', 'categories.json')
}

/** Absolute path of the pre-upgrade custom-only list. */
export function legacyCustomCategoriesPath(root) {
  return join(root, 'catalog', 'custom-categories.json')
}

/**
 * Normalize one stored entry into the current record.
 * @param entry - raw stored entry.
 * @param index - position used when the entry carries no `order`.
 * @returns the normalized entry, or undefined when it has no usable key/label.
 */
function normalizeEntry(entry, index) {
  const key = typeof entry?.key === 'string' ? entry.key.trim() : ''
  const label = typeof entry?.label === 'string' ? entry.label.trim() : ''
  if (key === '' || label === '') return undefined
  return {
    key,
    label,
    icon: normalizeCategoryIcon(entry?.icon),
    custom: entry?.custom === true,
    order: Number.isFinite(entry?.order) ? entry.order : index,
  }
}

/**
 * Stamp `order` from array position.
 *
 * The array order is the source of truth for the rail: a reorder request builds
 * the array it wants and the stored `order` is derived here. (Sorting by the
 * stored `order` instead would silently undo every reorder.)
 * @param list - entries in display order.
 * @returns the same entries with `order` renumbered from 0.
 */
function reindex(list) {
  return list.map((entry, index) => ({ ...entry, order: index }))
}

/**
 * Parse a JSON file written by an editor, tolerating a UTF-8 BOM.
 *
 * Notepad and several Windows editors add one; `JSON.parse` rejects it outright,
 * so a BOM would silently discard a user's saved categories.
 * @param path - file to read.
 * @returns the parsed value.
 */
function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

/**
 * Read the persisted category list.
 * @param root - data root.
 * @returns normalized entries; an empty array when the file is absent/invalid.
 */
export function readCategories(root) {
  const path = categoriesPath(root)
  if (!existsSync(path)) return []
  try {
    const parsed = readJsonFile(path)
    const list = Array.isArray(parsed) ? parsed : parsed?.categories
    if (!Array.isArray(list)) return []
    return list.map(normalizeEntry).filter((entry) => entry !== undefined)
  } catch {
    return []
  }
}

/**
 * Persist the category list (creates the catalog dir as needed).
 *
 * The array order is authoritative and is written through as `order`, so a
 * caller's reordering survives the round trip.
 */
export function writeCategories(root, list) {
  const path = categoriesPath(root)
  mkdirSync(dirname(path), { recursive: true })
  const stored = reindex(list).map((entry) => ({
    key: entry.key,
    label: entry.label,
    icon: normalizeCategoryIcon(entry.icon),
    custom: entry.custom === true,
    order: entry.order,
  }))
  writeFileSync(path, `${JSON.stringify(stored, null, 2)}\n`, 'utf8')
}

/** The default list as stored entries, in shipped order. */
function defaultEntries() {
  return DEFAULT_CATEGORIES.map((entry, index) => ({ ...entry, custom: false, order: index }))
}

/**
 * Read the category list, seeding or migrating it on first use.
 *
 * Three cases, all idempotent:
 * - no `categories.json` and no legacy file → write the shipped defaults;
 * - legacy `custom-categories.json` present → merge its entries onto the
 *   defaults (a pre-upgrade data root keeps its custom categories) and retire
 *   the legacy file so it is not merged twice;
 * - a readable `categories.json` → returned as-is.
 * @param root - data root.
 * @returns the effective category list.
 */
export function ensureCategories(root) {
  const existing = readCategories(root)
  if (existing.length > 0) return existing

  const defaults = defaultEntries()
  const legacyPath = legacyCustomCategoriesPath(root)
  let merged = defaults
  if (existsSync(legacyPath)) {
    try {
      const legacyParsed = readJsonFile(legacyPath)
      const legacy = Array.isArray(legacyParsed) ? legacyParsed : []
      const seen = new Set(defaults.map((entry) => entry.key))
      const adopted = []
      for (const [index, raw] of legacy.entries()) {
        const entry = normalizeEntry(raw, defaults.length + index)
        if (entry === undefined || seen.has(entry.key)) continue
        seen.add(entry.key)
        adopted.push({ ...entry, custom: true })
      }
      merged = [...defaults, ...adopted]
    } catch {
      merged = defaults
    }
    // Retire the legacy file once its entries are either adopted or known to be
    // unusable, so the same data is never merged twice.
    rmSync(legacyPath, { force: true })
  }
  writeCategories(root, merged)
  return readCategories(root)
}

/**
 * Rename and/or re-icon one category.
 * @param root - data root.
 * @param key - category key.
 * @param patch - { label?, icon? }.
 * @returns { ok, entry? , error? }
 */
export function updateCategory(root, key, patch = {}) {
  const list = ensureCategories(root)
  const entry = list.find((item) => item.key === key)
  if (entry === undefined) return { ok: false, error: `分类 "${key}" 不存在` }
  const label = typeof patch.label === 'string' ? patch.label.trim() : ''
  if (label === '') return { ok: false, error: '分类名称不能为空' }
  if (list.some((item) => item.key !== key && item.label === label)) {
    return { ok: false, error: `分类「${label}」已存在` }
  }
  entry.label = label
  if (typeof patch.icon === 'string' && patch.icon.trim() !== '') entry.icon = normalizeCategoryIcon(patch.icon)
  writeCategories(root, list)
  return { ok: true, entry }
}

/**
 * Apply a new rail order.
 *
 * The request names the categories it wants to place; any it does not name keep
 * their relative order after those, so a client that has not yet seen a category
 * (another window created one) cannot drop it by reordering.
 * @param root - data root.
 * @param keys - category keys in the requested order.
 * @returns { ok, categories?, error? }
 */
export function reorderCategories(root, keys) {
  const list = ensureCategories(root)
  const requested = Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : []
  const known = new Set(list.map((entry) => entry.key))
  const unknown = requested.filter((key) => !known.has(key))
  if (unknown.length > 0) return { ok: false, error: `未知分类 ${unknown.join(', ')}` }
  const byKey = new Map(list.map((entry) => [entry.key, entry]))
  const ordered = []
  for (const key of requested) {
    const entry = byKey.get(key)
    if (entry === undefined || ordered.includes(entry)) continue
    ordered.push(entry)
  }
  for (const entry of list) {
    if (!ordered.includes(entry)) ordered.push(entry)
  }
  // The array order is authoritative: writing it through renumbers `order`.
  writeCategories(root, ordered)
  return { ok: true, categories: readCategories(root) }
}

/**
 * Create a custom category.
 * @param root - data root.
 * @param label - display name (emoji already stripped by caller).
 * @param icon - icon name; falls back to the caller-provided suggestion.
 * @returns { ok, entry? , error? }
 */
export function createCategory(root, label, icon) {
  const name = (label ?? '').trim()
  if (name === '') return { ok: false, error: '分类名称不能为空' }
  const list = ensureCategories(root)
  if (list.some((item) => item.label === name)) return { ok: false, error: `分类「${name}」已存在` }
  const entry = {
    key: nextCategoryKey(list.map((item) => item.key), name),
    label: name,
    icon: normalizeCategoryIcon(icon),
    custom: true,
    order: list.length,
  }
  writeCategories(root, [...list, entry])
  return { ok: true, entry }
}

/**
 * Delete one category. Its skills move to `literature`, which the caller does by
 * rewriting catalog records.
 * @param root - data root.
 * @param key - category key.
 * @returns { ok, entry? , error? }
 */
export function deleteCategory(root, key) {
  const list = ensureCategories(root)
  const entry = list.find((item) => item.key === key)
  if (entry === undefined) return { ok: false, error: `分类 "${key}" 不存在` }
  if (key === 'literature') return { ok: false, error: '「文献」是技能回落的默认分类，不能删除' }
  writeCategories(root, list.filter((item) => item.key !== key))
  return { ok: true, entry }
}

/**
 * Reinstate the shipped category set.
 *
 * Entries the defaults do not name are kept, so user-created categories and
 * their skills survive a restore; builtins recover their shipped label, icon
 * and order, and any deleted builtin reappears.
 * @param root - data root.
 * @returns { ok, categories, restored, added }
 */
export function restoreDefaultCategories(root) {
  const defaults = defaultEntries()
  const current = ensureCategories(root)
  const byKey = new Map(current.map((entry) => [entry.key, entry]))
  const restored = []
  const merged = defaults.map((entry) => {
    const existing = byKey.get(entry.key)
    if (existing === undefined) {
      restored.push(entry.key)
      return entry
    }
    if (existing.label !== entry.label || existing.icon !== entry.icon) restored.push(entry.key)
    return { ...entry, custom: false }
  })
  const extras = current.filter((entry) => !defaults.some((d) => d.key === entry.key))
  writeCategories(root, [...merged, ...extras])
  return { ok: true, categories: readCategories(root), restored, added: extras.map((entry) => entry.key) }
}
