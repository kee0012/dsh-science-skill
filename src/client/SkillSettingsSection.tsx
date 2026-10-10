/**
 * SkillSettingsSection: the "设置 → Skill" management page. Shows installed
 * research skills (from the data-root catalog) as cards with
 * name/description/category/status plus management actions:
 *  - "+ 添加目录": import a folder (native picker, manual-path fallback);
 *    re-importing an existing id overwrites it without asking (the user forgot,
 *    or downloaded a newer copy — either way the newer folder is what they want).
 *  - category pill: open a dropdown of every category (fixed + custom) and
 *    move the skill into the chosen one.
 *  - edit (pencil): rename the skill's display name (catalog only).
 *  - delete: second-confirm removal of the whole skill folder.
 *  - "+" at the end of the filter chips: create a custom category (name may
 *    carry an emoji; id is generated server-side). Custom chips expose a
 *    small manage menu (rename / re-icon / delete category).
 *  - search box: filters by Chinese name, summary, English id, or invoke
 *    command across every category, overriding the category chips until the
 *    box is cleared (the user remembers what a skill does, not where it sits).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ScienceCategoryIcon } from './ScienceCategoryIcon.tsx'
import { DEFAULT_CATEGORY_ICON, PICKER_ICON_NAMES } from './icon-paths.ts'
import { readPinnedSkills, setPinnedSkill, API_BASE } from './skill-gate.ts'
import { matchesSkillQuery } from './skill-search.ts'
import { SkillSettingsSection as styles } from './styles/class-names.ts'

/** Full props: runtime for the settings.section seat + injected pick action. */
export type SkillSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & { pickDirectory: () => Promise<string | null> }

/** Skill row shape from the skills API. */
interface SkillRow {
  id: string
  name: string
  /** Chinese display name (falls back to `name`/`id`). */
  displayName?: string
  /** One-line Chinese summary (falls back to the skill's own summary). */
  displaySummary?: string
  category: string
  categoryLabel: string
  summary: string
  status: string
  invoke: string
}

/** Category shape from the categories API. */
interface CategoryRow {
  key: string
  icon: string
  label: string
  builtin: boolean
}

const STATUS_TEXT: Record<string, string> = { stable: 'Stable', beta: 'Beta', draft: 'Draft' }

/** Mirrors `.catDropdown`'s max-height in the module CSS: the room a flipped
 *  menu needs above the pill before the caller prefers opening it upwards. */
const CATEGORY_MENU_MAX_PX = 260

/**
 * The name the kernel's skill registry answers to for one catalog row.
 *
 * The catalog stores the command with its leading `/`, and a row that names no
 * `invoke` falls back to its directory id — exactly the rule the rail uses when
 * it inserts a chip, so both halves of the activation gate agree on one key.
 * @param skill - Catalog row as the skills API returns it.
 * @returns the skill name as the model-facing catalog would publish it.
 */
function gateNameOf(skill: SkillRow): string {
  return (skill.invoke || skill.id).replace(/^\//, '')
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  return await res.json() as T
}

async function loadSkills(): Promise<SkillRow[]> {
  try {
    const data = await json<{ ok: boolean; skills?: SkillRow[] }>(`${API_BASE}/skills`)
    return Array.isArray(data?.skills) ? data.skills : []
  } catch {
    return []
  }
}

async function loadCategories(): Promise<CategoryRow[]> {
  try {
    const data = await json<{ ok: boolean; categories?: CategoryRow[] }>(`${API_BASE}/categories`)
    return Array.isArray(data?.categories) ? data.categories : []
  } catch {
    return []
  }
}

/**
 * The default import directory, or `''` when the user has never set one — in
 * which case the host installs into `<root>/skills` and the panel says so
 * rather than showing a path it invented.
 *
 * `providerRegistered` rides along because it is read on the same request and
 * describes the same feature: a directory the harness never accepted as a skill
 * source lists skills the model cannot load. It is `undefined` — not `false` —
 * when the host does not report it, so an older host is never shown as broken.
 *
 * `legacyBackups` names the `.<id>.old-<timestamp>` folders versions up to
 * 2.0.5 left behind when they replaced a skill. It is a list rather than a count
 * because the panel offers to delete exactly those folders, and an older host
 * that does not report it answers with an empty list, which hides the offer.
 * @returns the directory and, when the host reports it, whether the provider
 *   registration succeeded, plus the retired folders still on disk.
 */
async function loadImportSettings(): Promise<{
  defaultSkillDir: string
  providerRegistered: boolean | undefined
  legacyBackups: string[]
}> {
  try {
    const data = await json<{
      ok: boolean
      defaultSkillDir?: string
      providerRegistered?: boolean
      legacyBackups?: string[]
    }>(`${API_BASE}/import-settings`)
    return {
      defaultSkillDir: typeof data?.defaultSkillDir === 'string' ? data.defaultSkillDir : '',
      providerRegistered: typeof data?.providerRegistered === 'boolean' ? data.providerRegistered : undefined,
      legacyBackups: Array.isArray(data?.legacyBackups)
        ? data.legacyBackups.filter((name): name is string => typeof name === 'string' && name !== '')
        : [],
    }
  } catch {
    return { defaultSkillDir: '', providerRegistered: undefined, legacyBackups: [] }
  }
}

/** Ask the server which icon a category name would get (keyword → fallback). */
async function suggestIcon(label: string): Promise<string | null> {
  const q = encodeURIComponent(label)
  try {
    const data = await json<{ ok: boolean; icon: string | null }>(`${API_BASE}/categories/suggest?label=${q}`)
    return data.icon ?? null
  } catch {
    return null
  }
}

/** Icon seat shared with the sidebar tree: one line glyph per category. */
function CategoryGlyph({ name, className }: { name: string; className?: string | undefined }) {
  return <ScienceCategoryIcon name={name} className={className} />
}

/**
 * Icon seat for the category forms. The field starts as the single icon the
 * form will store — the suggestion derived from the category name — and only
 * unfolds the full grid when the user asks for a different one, so the form
 * stays one line tall instead of opening on a wall of glyphs.
 */
function IconPicker({ value, onPick }: { value: string; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={styles.iconPick} data-popup-open={open || undefined}>
      <button
        type="button"
        className={styles.iconPickBtn}
        aria-expanded={open}
        aria-label="选择分类图标"
        title="选择分类图标"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <CategoryGlyph name={value} className={styles.iconCellSvg} />
        <span className={styles.iconPickCaret} aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div className={styles.iconGrid} role="radiogroup" aria-label="分类图标">
          {PICKER_ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={name === value}
              aria-label={name}
              title={name}
              className={styles.iconCell + (name === value ? ' ' + styles.iconCellActive : '')}
              onClick={() => { onPick(name); setOpen(false) }}
            >
              <CategoryGlyph name={name} className={styles.iconCellSvg} />
            </button>
          ))}
        </div>
      ) : null}
    </span>
  )
}

/** Render the Skill settings page. */
export function SkillSettingsSection({ pickDirectory }: SkillSettingsSectionProps) {
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [category, setCategory] = useState<string>('all')
  // Search text. A non-empty query searches every category and overrides the
  // category chips, because the user remembers what a skill does rather than
  // where it was filed; clearing the box restores the chip filter.
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualPath, setManualPath] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'pending'; text: string } | null>(null)
  /**
   * Where "+ 添加目录" installs the skill it copies. `''` means the host default
   * (`<root>/skills`), which is what an install that never touched this setting
   * uses — so the empty value is the feature's own "restore default".
   */
  const [defaultSkillDir, setDefaultSkillDir] = useState('')
  const [savingDir, setSavingDir] = useState(false)
  /**
   * Whether the harness accepted this plugin as a skill provider. `undefined`
   * means the host did not say (an older host), which must render as nothing —
   * a warning is only honest when the host has actually reported a refusal.
   */
  const [providerRegistered, setProviderRegistered] = useState<boolean | undefined>(undefined)
  /** A rescan of every skill root is in flight (the 刷新 button). */
  const [rescanning, setRescanning] = useState(false)
  /**
   * `.<id>.old-<timestamp>` folders an older version of this plugin left in the
   * skill directory, reported by the host and shown as a cleanup button. An
   * empty list is both "nothing to clean" and "the host cannot say", which are
   * the same thing to a button that must not appear for either.
   */
  const [legacyBackups, setLegacyBackups] = useState<string[]>([])
  /** The 清理旧版本 button is waiting on the host. */
  const [cleaning, setCleaning] = useState(false)

  // Pending confirmations, keyed by skill id / category key.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  // Category dropdown open for a skill id; category manage menu for a key.
  const [openCategoryFor, setOpenCategoryFor] = useState<string | null>(null)
  // Whether that dropdown opens upwards. The list is taller than most cards, so
  // opening downwards from a card near the bottom of the panel would put the
  // rows outside the visible area.
  const [categoryMenuUp, setCategoryMenuUp] = useState(false)
  const [manageCategory, setManageCategory] = useState<string | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState('')
  // Icon the label's keyword rules suggest; the picker shows it until the user
  // chooses another glyph, and a create always stores the picker's value.
  const [suggestedIcon, setSuggestedIcon] = useState<string>(DEFAULT_CATEGORY_ICON)
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameIcon, setRenameIcon] = useState<string>(DEFAULT_CATEGORY_ICON)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)
  /**
   * Skills toggled on in this page: the Host persists them, and an enabled
   * skill stays activated in every session regardless of the rail selection.
   */
  const [pinned, setPinned] = useState<ReadonlySet<string>>(() => new Set<string>())

  useEffect(() => { void readPinnedSkills().then(setPinned) }, [])

  /**
   * Flip one skill's global toggle. The Host owns the persisted value, so the
   * local set follows the confirmed answer rather than the click.
   */
  const togglePinned = useCallback(async (skill: SkillRow, enabled: boolean): Promise<void> => {
    const name = gateNameOf(skill)
    const saved = await setPinnedSkill(name, enabled)
    if (!saved) {
      setMsg({ kind: 'err', text: `「${skill.displayName ?? skill.name}」开关未能保存` })
      return
    }
    setPinned((previous) => {
      const next = new Set(previous)
      if (enabled) next.add(name)
      else next.delete(name)
      return next
    })
  }, [])

  /** Icon name for a category key, read from the loaded category list. */
  const iconOf = useCallback((key: string): string =>
    categories.find((c) => c.key === key)?.icon ?? DEFAULT_CATEGORY_ICON, [categories])
  const rootRef = useRef<HTMLDivElement | null>(null)

  /** Re-read the catalog, the category list and the import settings. Announces
   * nothing, so it is safe to call from the change listener below. */
  const reload = useCallback(async (): Promise<void> => {
    const [list, cats, importSettings] = await Promise.all([loadSkills(), loadCategories(), loadImportSettings()])
    setSkills(list)
    setCategories(cats)
    setDefaultSkillDir(importSettings.defaultSkillDir)
    setProviderRegistered(importSettings.providerRegistered)
    setLegacyBackups(importSettings.legacyBackups)
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    await reload()
    // Broadcast to the other views of this catalog so a change made here is
    // reflected immediately in them (same window, no focus event fires): the
    // skill board and the sidebar re-read their data on this event.
    window.dispatchEvent(new CustomEvent('dsh-science-skill:catalog-changed'))
  }, [reload])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The other direction of the same channel: the skill board performs this same
  // category write, so it announces on this event too. Re-reading here rather
  // than refreshing — which would announce again — is what keeps the two views
  // in step without the event echoing between them.
  useEffect(() => {
    const onChanged = (): void => { void reload() }
    window.addEventListener('dsh-science-skill:catalog-changed', onChanged)
    return () => window.removeEventListener('dsh-science-skill:catalog-changed', onChanged)
  }, [reload])

  // Close open dropdowns on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current === null) return
      if (!rootRef.current.contains(e.target as Node)) {
        setOpenCategoryFor(null)
        setManageCategory(null)
        setAddingCategory(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  /**
   * Show a transient message.
   * @param kind - message tone.
   * @param text - message body.
   * @param holdMs - how long it stays before hiding. An import result names the
   *   category the skill landed in, which takes longer to read than the
   *   confirmations around it, so callers may extend the default.
   */
  const flash = useCallback((kind: 'ok' | 'err', text: string, holdMs = 4000): void => {
    setMsg({ kind, text })
    window.setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), holdMs)
  }, [])

  const run = useCallback(async (action: () => Promise<{ ok?: boolean; error?: string; note?: string }>, okText: string): Promise<void> => {
    setBusy(true)
    const result = await action()
    setBusy(false)
    if (result.ok) {
      flash('ok', result.note ?? okText)
      await refresh()
    } else {
      flash('err', result.error ?? '操作失败')
    }
  }, [flash, refresh])

  /**
   * Import one skill folder into the configured default directory.
   *
   * The import always overwrites: the folder the user picks is the folder they
   * want, so a re-import of a skill they already have means they forgot or they
   * downloaded a newer version, and stopping to ask only costs a click. The copy
   * it replaces is deleted outright — and any `.<id>.old-<timestamp>` folder an
   * earlier version parked there goes with it — while the Chinese name, category
   * and examples of the record survive.
   * @param path - skill folder the user picked or typed.
   */
  const doImportPath = useCallback(async (path: string): Promise<void> => {
    const p = path.trim()
    if (!p) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/skills/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: p, overwrite: true }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; note?: string }
      setBusy(false)
      if (data.ok) {
        // Hold the import result longer: it reports the Chinese name and the
        // category the skill was filed under, which the user needs time to read.
        flash('ok', data.note ?? '导入完成。', 20_000)
        await refresh()
        setShowManual(false)
        setManualPath('')
      } else {
        flash('err', data.error ?? '导入失败')
      }
    } catch (error) {
      setBusy(false)
      flash('err', String(error))
    }
  }, [flash, refresh])

  const addDirectory = async (): Promise<void> => {
    setBusy(true)
    setMsg(null)
    try {
      const picked = await pickDirectory()
      if (picked) {
        setBusy(false)
        await doImportPath(picked)
        return
      }
      setShowManual(true)
      setMsg({ kind: 'ok', text: '未选择目录。可手动输入文件夹路径。' })
      setBusy(false)
    } catch {
      setShowManual(true)
      setBusy(false)
    }
  }

  const handleManualImport = async (): Promise<void> => {
    await doImportPath(manualPath)
  }

  /**
   * Re-scan every skill root on demand.
   *
   * Skills a user drops into their chosen directory by hand have no import to
   * announce them, so without this the only way to pick them up would be a page
   * reload. The host adopts what is new, rebuilds the catalog, and starts
   * Chinese naming for anything it has never named — so a folder that was filled
   * in advance ends up looking exactly like one built through the panel.
   */
  const rescan = async (): Promise<void> => {
    setRescanning(true)
    setMsg(null)
    try {
      // Re-reading the list is the part that must happen: the list route itself
      // adopts anything new, so a folder dropped in by hand shows up from this
      // alone. The host's rescan route adds the second half — starting Chinese
      // naming for records it has never named — and an older host answers 404
      // for it, so it is asked for but never depended on.
      let adopted: number | undefined
      let skipped = 0
      let firstSkip = ''
      let naming = 0
      let namingDisabled = false
      try {
        const res = await fetch(`${API_BASE}/skills/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json() as {
            ok?: boolean
            adopted?: string[]
            skipped?: { id?: string; error?: string }[]
            naming?: number
            namingDisabled?: boolean
          }
          if (data?.ok === true) {
            adopted = data.adopted?.length ?? 0
            skipped = data.skipped?.length ?? 0
            // The host reports one reason per folder; showing the first keeps a
            // long list from reading as if every skip were the same problem.
            const reason = data.skipped?.[0]?.error
            firstSkip = typeof reason === 'string' ? reason : ''
            naming = data.naming ?? 0
            namingDisabled = data.namingDisabled === true
          }
        }
      } catch {
        // Older host without the rescan route: the re-read below still runs.
      }

      await refresh()

      const parts = [adopted === undefined
        ? '已重新读取技能列表'
        : adopted > 0 ? `自动收录 ${adopted} 个新技能（文件夹保持原样）` : '没有发现新技能']
      if (skipped > 0) parts.push(`跳过 ${skipped} 个${firstSkip === '' ? '' : `（例：${firstSkip}）`}`)
      if (adopted !== undefined && !namingDisabled && naming > 0) {
        parts.push(`正在用默认模型生成 ${naming} 个技能的中文名`)
      }
      flash('ok', `${parts.join('；')}。`)
      // Naming is one model call per skill, so the list is re-read rather than
      // waited on.
      if (naming > 0) window.setTimeout(() => { void refresh() }, 4000)
    } catch (error) {
      flash('err', String(error))
    } finally {
      setRescanning(false)
    }
  }

  /**
   * Delete the `.<id>.old-<timestamp>` folders earlier versions left behind.
   *
   * Overwriting a skill used to copy the folder it replaced to a dot-prefixed
   * backup beside it, so a directory that has seen a few updates holds stale
   * copies of skills the user replaced — they read as skill folders to anyone
   * browsing it, and they are never what the user wants. The host deletes only
   * names it recognizes as its own retired backups, and only when asked: this is
   * the user's own directory, and no scan may delete from it on its own.
   */
  const cleanupBackups = async (): Promise<void> => {
    setCleaning(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/skills/cleanup-backups`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      })
      const data = await res.json() as { ok?: boolean; removed?: string[]; error?: string; note?: string }
      if (data?.ok === true) {
        const kept = Math.max(0, legacyBackups.length - (data.removed?.length ?? 0))
        const note = data.note ?? '已清理旧版本备份。'
        flash('ok', kept > 0 ? `${note}另有 ${kept} 个未能删除。` : note)
        await refresh()
      } else {
        flash('err', data?.error ?? '清理失败')
      }
    } catch (error) {
      flash('err', String(error))
    } finally {
      setCleaning(false)
    }
  }

  /**
   * Store the default import directory. An empty value clears the setting, so
   * imports go back to the host default (`<root>/skills`); the Host owns the
   * persisted value, so the panel follows the confirmed answer, not the click.
   */
  const saveDefaultDir = useCallback(async (value: string): Promise<void> => {
    setSavingDir(true)
    setMsg(null)
    try {
      const data = await json<{ ok?: boolean; error?: string; defaultSkillDir?: string }>(`${API_BASE}/import-settings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ defaultSkillDir: value }),
      })
      if (data.ok) {
        const saved = typeof data.defaultSkillDir === 'string' ? data.defaultSkillDir : value
        setDefaultSkillDir(saved)
        flash('ok', saved === ''
          ? '已恢复默认：导入的技能装到数据根下的 skills。'
          : `已设为默认安装目录：${saved}`)
        // The directory just joined the scan roots. Re-reading the list is what
        // adopts skills already sitting in it — adoption is driven by the list
        // route, not by the settings write — so a folder the user filled in
        // beforehand appears now instead of the next time the panel opens. The
        // refresh also broadcasts to the skill tree, which reloads with it.
        await refresh()
      } else {
        flash('err', data.error ?? '默认目录保存失败')
      }
    } catch (error) {
      flash('err', String(error))
    } finally {
      setSavingDir(false)
    }
  }, [flash, refresh])

  /**
   * Pick the default import directory with the host's own chooser. A cancelled
   * dialog answers `null` too, so nothing is written and the current setting
   * stands — "cancel" must not read as "clear".
   */
  const pickDefaultDir = async (): Promise<void> => {
    setMsg(null)
    let picked: string | null = null
    try {
      picked = await pickDirectory()
    } catch {
      picked = null
    }
    if (!picked) {
      flash('ok', '未选择目录，默认安装目录保持不变。')
      return
    }
    await saveDefaultDir(picked)
  }

  const moveCategory = useCallback(async (skillId: string, target: string): Promise<void> => {
    setOpenCategoryFor(null)
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/skills/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: skillId, category: target }),
      })
      return data
    }, '已移动分类。')
  }, [run])

  const saveName = useCallback(async (skillId: string): Promise<void> => {
    const nextName = nameDraft.trim()
    const nextSummary = summaryDraft.trim()
    setEditingName(null)
    if (!nextName) return
    // Name and summary travel in one request so a record write cannot race.
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/skills/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: skillId, displayName: nextName, displaySummary: nextSummary }),
      })
      return data
    }, '已更新中文名与简介。')
  }, [nameDraft, summaryDraft, run])

  const deleteSkill = useCallback(async (skillId: string): Promise<void> => {
    setPendingDelete(null)
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/skills/delete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: skillId }),
      })
      return data
    }, '已删除。')
  }, [run])

  const createCategory = useCallback(async (): Promise<void> => {
    const label = categoryDraft.trim()
    if (!label) return
    setAddingCategory(false)
    setCategoryDraft('')
    const icon = suggestedIcon
    setSuggestedIcon(DEFAULT_CATEGORY_ICON)
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/categories/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, icon }),
      })
      return data
    }, '已添加分类。')
  }, [categoryDraft, run, suggestedIcon])

  const renameCategory = useCallback(async (key: string): Promise<void> => {
    const label = renameDraft.trim()
    setRenamingCategory(null)
    setManageCategory(null)
    if (!label) return
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/categories/rename`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, label, icon: renameIcon }),
      })
      return data
    }, '已更新分类。')
  }, [renameDraft, renameIcon, run])

  const restoreCategories = useCallback(async (): Promise<void> => {
    setManageCategory(null)
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/categories/restore`, { method: 'POST' })
      return data
    }, '已恢复默认分类（自定义分类保留）。')
    setCategory('all')
  }, [run])

  const deleteCategory = useCallback(async (key: string): Promise<void> => {
    setManageCategory(null)
    await run(async () => {
      const data = await json<{ ok?: boolean; error?: string; note?: string }>(`${API_BASE}/categories/delete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      return data
    }, '已删除分类（其下技能回到文献）。')
    if (category === key) setCategory('all')
  }, [category, run])

  // Refresh the icon the form would use when the label's keywords suggest a
  // different glyph (cheap server lookup, no model call). The picker's own
  // choice always wins because it is what the request sends.
  const updateIconPreview = useCallback(async (value: string, setIcon: (icon: string) => void): Promise<void> => {
    const suggested = await suggestIcon(value.trim())
    if (suggested !== null) setIcon(suggested)
  }, [])

  const trimmed = query.trim()

  const filtered = useMemo(
    () => (trimmed !== ''
      ? skills.filter((s) => matchesSkillQuery(trimmed, s))
      : (category === 'all' ? skills : skills.filter((s) => s.category === category))),
    [skills, category, trimmed],
  )

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.head}>
        <span className={styles.title}>Science Skill</span>
        <span className={styles.subtitle}>
          从本地文件夹添加科研技能（含 SKILL.md）。导入后自动出现在技能树里，可直接用于科研任务。
        </span>
      </div>

      {/* 技能默认目录：决定「+ 添加目录」把导入的技能装到哪里 */}
      <div className={styles.importDir}>
        <div className={styles.importDirHead}>
          <span className={styles.importDirTitle}>技能默认目录</span>
          <span className={styles.importDirHint}>
            导入的技能会安装到该目录下（以 &lt;技能标识&gt; 作为子文件夹名）。未设置时使用数据根目录下的 skills。
          </span>
        </div>
        <div className={styles.importDirRow}>
          <span className={styles.importDirPath} title={defaultSkillDir || '默认（数据根下的 skills）'}>
            {defaultSkillDir || '默认（数据根下的 skills）'}
          </span>
          <button type="button" className={styles.btn} disabled={busy || savingDir} onClick={() => void pickDefaultDir()}>
            {savingDir ? '保存中…' : '选择目录'}
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={busy || savingDir || defaultSkillDir === ''}
            title="清除后，导入的技能装回数据根下的 skills"
            onClick={() => void saveDefaultDir('')}
          >
            清除
          </button>
        </div>
        {/*
          The host refused — or never had — the skill registry. The panel still
          lists skills, so without this the user sees a working screen whose
          skills silently do nothing when referenced. Only an explicit `false`
          warns: `undefined` is an older host that cannot answer.
        */}
        {providerRegistered === false && (
          <div className={styles.importDirRow}>
            <span className={styles.status + ' ' + styles.warn}>
              当前 DSH 未接受技能注册，这些技能只在面板可见，模型无法加载。请确认 DSH 版本，或重启后重试。
            </span>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => { setQuery(e.target.value) }}
          placeholder="搜索技能：中文名 / 简介 / 英文 id / 命令"
          aria-label="搜索技能"
          spellCheck={false}
        />
        <span className={styles.count}>
          {trimmed === '' ? `共 ${skills.length} 个技能` : `找到 ${filtered.length} 个 / 共 ${skills.length}`}
        </span>
        <button
          type="button"
          className={styles.btn}
          disabled={busy || rescanning}
          onClick={() => void rescan()}
          title="重新扫描默认技能目录：手动粘贴进去的新技能会被自动收录"
        >
          {rescanning ? '扫描中…' : '刷新'}
        </button>
        {/*
          Only rendered when the host found something: an empty list is also how
          an older host answers, and a button that can only ever say "没有需要
          清理的" is worse than no button.
        */}
        {legacyBackups.length > 0 && (
          <button
            type="button"
            className={styles.btn}
            disabled={busy || cleaning}
            onClick={() => void cleanupBackups()}
            title={`删除旧版本残留文件夹：${legacyBackups.slice(0, 3).join('、')}${legacyBackups.length > 3 ? ' 等' : ''}`}
          >
            {cleaning ? '清理中…' : `清理旧版本（${legacyBackups.length}）`}
          </button>
        )}
        <button
          type="button"
          className={styles.btn + ' ' + styles.primary}
          disabled={busy}
          onClick={() => void addDirectory()}
          title="添加技能文件夹；若该技能已存在，直接覆盖更新（旧版本会被删除，不保留备份）"
        >
          {busy ? '处理中…' : '+ 添加目录'}
        </button>
      </div>

      {showManual && (
        <div className={styles.manualRow}>
          <input
            className={styles.manualInput}
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            placeholder="技能文件夹路径，如 ~/my-skills/nature-xxx"
            spellCheck={false}
          />
          <button type="button" className={styles.btn + ' ' + styles.primary} disabled={busy || !manualPath.trim()} onClick={() => void handleManualImport()}>
            导入
          </button>
          <button type="button" className={styles.btn} onClick={() => setShowManual(false)}>取消</button>
        </div>
      )}

      {msg && <span className={styles.status + ' ' + styles[msg.kind]}>{msg.text}</span>}

      {/* Category filter chips + custom-category add/manage */}
      {categories.length > 0 && (
        <div className={styles.filters}>
          <button type="button" className={styles.filter + (category === 'all' ? ' ' + styles.active : '')} onClick={() => setCategory('all')}>
            全部
          </button>
          {categories.map((c) => {
            const present = skills.some((s) => s.category === c.key)
            const active = category === c.key
            return (
              <span key={c.key} className={styles.chipWrap} data-active={active || undefined} data-popup-open={(manageCategory === c.key || renamingCategory === c.key) || undefined}>
                <button
                  type="button"
                  className={styles.filter + (active ? ' ' + styles.active : '')}
                  onClick={() => setCategory(active ? 'all' : c.key)}
                >
                  <CategoryGlyph name={c.icon} className={styles.chipIcon} />
                  {c.label}
                  {!present && <span className={styles.chipEmpty} title="该分类下暂无技能">·0</span>}
                </button>
                <button
                  type="button"
                  className={styles.chipManage}
                  title="管理分类（改名/换图标/删除）"
                  aria-label={`管理分类 ${c.label}`}
                  onClick={() => setManageCategory(manageCategory === c.key ? null : c.key)}
                >
                  ▾
                </button>
                {manageCategory === c.key && (
                  <span className={styles.chipMenu}>
                    <button type="button" className={styles.menuItem} onClick={() => { setRenamingCategory(c.key); setRenameDraft(c.label); setRenameIcon(c.icon) }}>
                      改名 / 换图标
                    </button>
                    {confirmDeleteCat === c.key ? (
                      <>
                        <span className={styles.status + ' ' + styles.err}>其下技能将回到「文献」</span>
                        <button type="button" className={styles.menuItem + ' ' + styles.menuDanger} onClick={() => void deleteCategory(c.key)}>确认删除</button>
                        <button type="button" className={styles.menuItem} onClick={() => setConfirmDeleteCat(null)}>取消</button>
                      </>
                    ) : (
                      <button type="button" className={styles.menuItem + ' ' + styles.menuDanger} onClick={() => setConfirmDeleteCat(c.key)}>
                        删除分类
                      </button>
                    )}
                  </span>
                )}
                {renamingCategory === c.key && (
                  <span className={styles.chipMenu}>
                    <input
                      className={styles.manualInput + ' ' + styles.menuInput}
                      value={renameDraft}
                      onChange={(e) => { setRenameDraft(e.target.value); void updateIconPreview(e.target.value, setRenameIcon) }}
                      placeholder="新名称"
                      spellCheck={false}
                      autoFocus
                    />
                    <IconPicker value={renameIcon} onPick={setRenameIcon} />
                    <button type="button" className={styles.menuItem} disabled={!renameDraft.trim()} onClick={() => void renameCategory(c.key)}>保存</button>
                    <button type="button" className={styles.menuItem} onClick={() => setRenamingCategory(null)}>取消</button>
                  </span>
                )}
              </span>
            )
          })}
          <button type="button" className={styles.filter + ' ' + styles.addFilter} title="新增自定义分类" onClick={() => setAddingCategory((v) => !v)}>
            +
          </button>
          {addingCategory && (
            <span className={styles.chipWrap}>
              <span className={styles.addRow}>
                <input
                  className={styles.manualInput + ' ' + styles.menuInput}
                  value={categoryDraft}
                  onChange={(e) => { setCategoryDraft(e.target.value); void updateIconPreview(e.target.value, setSuggestedIcon) }}
                  placeholder="分类名称，如 基金申请"
                  spellCheck={false}
                  autoFocus
                />
                <IconPicker value={suggestedIcon} onPick={setSuggestedIcon} />
                <button type="button" className={styles.btn + ' ' + styles.primary} disabled={!categoryDraft.trim() || busy} onClick={() => void createCategory()}>添加</button>
                <button type="button" className={styles.btn} onClick={() => { setAddingCategory(false); setCategoryDraft(''); setSuggestedIcon(DEFAULT_CATEGORY_ICON) }}>取消</button>
              </span>
            </span>
          )}
          <button
            type="button"
            className={styles.filter + ' ' + styles.addFilter}
            title="恢复默认分类（自定义分类保留）"
            onClick={() => void restoreCategories()}
            disabled={busy}
          >
            恢复默认
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {trimmed === ''
            ? '暂无技能。点击「添加目录」导入第一个科研技能。'
            : `没有匹配「${trimmed}」的技能。`}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((s) => (
            <article
              className={styles.card}
              data-off={pinned.has(gateNameOf(s)) ? undefined : 'true'}
              data-popup-open={openCategoryFor === s.id || undefined}
              key={s.id}
            >
              <div className={styles.cardTop}>
                {/* Category glyph: the rail's own icon for this skill's category. */}
                <span className={styles.cardGlyph} aria-hidden="true">
                  <ScienceCategoryIcon name={iconOf(s.category)} />
                </span>
                {editingName === s.id ? (
                  <input
                    className={styles.cardNameInput}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="中文显示名"
                    spellCheck={false}
                    autoFocus
                  />
                ) : (
                  <span className={styles.cardName}>{s.displayName ?? s.name}</span>
                )}
                <span className={styles.cardActions}>
                  {/* Activation switch, sharing the card's top-right row. */}
                  <label
                    // The base class already draws the off state and there is no
                    // `.gateOff` rule, so the old ternary spliced the literal
                    // class name "undefined" onto every un-pinned skill. It was
                    // invisible — off is the default look — which is exactly why
                    // it survived.
                    className={pinned.has(gateNameOf(s)) ? `${styles.gateToggle} ${styles.gateOn}` : styles.gateToggle}
                    title="开启后：无论是否在侧栏选择，这个技能在所有会话里都始终激活（模型可以发现并调用它）"
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      checked={pinned.has(gateNameOf(s))}
                      aria-label={`开启「${s.displayName ?? s.name}」`}
                      onChange={(e) => { void togglePinned(s, e.target.checked) }}
                    />
                    <span className={styles.gateTrack} aria-hidden="true">
                      <span className={styles.gateThumb} />
                    </span>
                  </label>
                  {editingName === s.id ? (
                    <>
                      <button type="button" className={styles.miniBtn} onClick={() => void saveName(s.id)}>保存</button>
                      <button type="button" className={styles.miniBtn} onClick={() => setEditingName(null)}>✕</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.miniBtn}
                      title="修改中文名与简介（只改显示，不动 SKILL.md）"
                      aria-label={`修改 ${s.displayName ?? s.name} 的中文名与简介`}
                      onClick={() => {
                        setEditingName(s.id)
                        setNameDraft(s.displayName ?? s.name ?? '')
                        setSummaryDraft(s.displaySummary ?? s.summary ?? '')
                      }}
                    >
                      ✎
                    </button>
                  )}
                </span>
              </div>
              {editingName === s.id ? (
                <textarea
                  className={styles.cardDescInput}
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  placeholder="一句话中文简介：这个技能能做什么"
                  spellCheck={false}
                />
              ) : (
                <div className={styles.cardDesc}>{s.displaySummary ?? s.summary}</div>
              )}
              <div className={styles.cardFoot}>
                <span className={styles.invoke}>{s.invoke}</span>
                <span className={styles.badge + ' ' + styles[s.status]}>{STATUS_TEXT[s.status] ?? s.status}</span>
              </div>
              <div className={styles.cardManage}>
                <span className={styles.catPicker}>
                  <button
                    type="button"
                    className={styles.catPill}
                    title="移动到其它分类"
                    onClick={(event) => {
                      const opening = openCategoryFor !== s.id
                      setOpenCategoryFor(opening ? s.id : null)
                      if (!opening) return
                      // Open towards whichever side of the pill can hold the
                      // list: a card near the panel's bottom edge has no room
                      // below it, and the rows would land out of sight.
                      const pill = event.currentTarget.getBoundingClientRect()
                      const below = window.innerHeight - pill.bottom
                      setCategoryMenuUp(below < CATEGORY_MENU_MAX_PX && pill.top > below)
                    }}
                  >
                    <span className={styles.catPillText}>{s.categoryLabel || s.category}</span>
                    <span className={styles.catCaret} aria-hidden="true">▾</span>
                  </button>
                  {openCategoryFor === s.id && (
                    <span className={styles.catDropdown} data-drop={categoryMenuUp ? 'up' : undefined}>
                      {categories.map((c) => (
                        <button
                          type="button"
                          key={c.key}
                          className={styles.catOption + (s.category === c.key ? ' ' + styles.catOptionActive : '')}
                          onClick={() => void moveCategory(s.id, c.key)}
                        >
                          <span className={styles.catOptionLabel}>
                            <CategoryGlyph name={c.icon} className={styles.chipIcon} />
                            {c.label}
                          </span>
                          {s.category === c.key && <span className={styles.catCheck}>✓</span>}
                        </button>
                      ))}
                    </span>
                  )}
                </span>
                {pendingDelete === s.id ? (
                  <span className={styles.deleteConfirm}>
                    <span className={styles.status + ' ' + styles.err}>将删除整个文件夹</span>
                    <button type="button" className={styles.miniBtn + ' ' + styles.dangerMini} onClick={() => void deleteSkill(s.id)}>确认删除</button>
                    <button type="button" className={styles.miniBtn} onClick={() => setPendingDelete(null)}>取消</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.miniBtn + ' ' + styles.dangerMini}
                    title="删除技能（含整个文件夹）"
                    onClick={() => setPendingDelete(s.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
