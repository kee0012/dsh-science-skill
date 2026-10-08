/**
 * dsh-science-skill — the skill board.
 *
 * The catalog as a browsing surface: a wrapping bar of category tabs over a
 * four-column grid of cards. It replaced an accordion of category rows. The
 * catalog is browsed far more often than it is searched, and an accordion shows
 * one category at a time — as the catalog grew, the user spent their time
 * opening and closing rows instead of reading skills, and the drag-to-reorder
 * gesture that came with it was a management action living in a browsing view.
 *
 * The board owns only what the user is looking at: the selected tab and the
 * query. The catalog and the category list are read from the data root on mount,
 * and re-read on every signal that they may have moved underneath us — window
 * focus, the panel becoming visible again, and the `catalog-changed` event that
 * any view announces after it writes.
 *
 * One write lives here: filing a skill under another category, which each card's
 * category pill offers. It is the same write the settings page performs and it
 * announces itself on the same event, so whichever view made the change, both
 * end up agreeing. Creating, renaming and reordering categories stay the settings
 * page's job — those change the catalog's shape rather than one skill's filing.
 *
 * A card carries two different intentions, so it carries two different targets.
 * Clicking the body opens the detail dialog — the user is asking what a skill
 * does. The 「召唤」 pill in the corner performs the write — the user has decided.
 * Keeping them apart matters because the destructive-looking one used to be the
 * whole card: a stray click while reading inserted a reference into their draft.
 *
 * Both actions are reported upward. The board deliberately knows nothing about
 * sessions or the composer: `addSkill` inserts the skill's `/command` reference
 * into the session already on screen, and `insertExample` puts one example line
 * of prose **behind that skill's reference**, so the line arrives with the skill
 * it belongs to. The seat above decides what each means.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ScienceCategoryIcon } from './ScienceCategoryIcon.tsx'
import { SkillDetail } from './SkillDetail.tsx'
import { API_BASE } from './skill-gate.ts'
import { matchesSkillQuery } from './skill-search.ts'
import { SkillStrip as styles } from './styles/class-names.ts'

/** Board props: the two composer actions the board may report. The board loads
 * its own catalog and categories from the data-root APIs, so it takes no seat
 * runtime. */
export type ScienceSkillBoardProps = {
  /** Summon a skill: insert its `/command` reference into the current session. */
  addSkill: (skill: CatalogSkill) => void
  /** Reference a skill **and** drop one of its examples in behind it. The skill
   * travels with the text because an example with no skill attached tells the
   * model nothing about which skill the user meant. */
  insertExample: (skill: CatalogSkill, text: string) => void
}

/** Skill record shape returned by the data-root catalog API. */
export interface CatalogSkill {
  id: string
  name?: string
  /** Chinese display name (falls back to `name`/`id`). */
  displayName?: string
  /** One-line Chinese summary (falls back to the skill's own summary). */
  displaySummary?: string
  category?: string
  /** Resolved display label for `category`, so a card need not look it up. */
  categoryLabel?: string
  summary?: string
  status?: string
  invoke?: string
}

/** Category record shape from the categories API (shipped defaults + customs). */
interface CatalogCategory {
  key: string
  icon: string
  label: string
  builtin: boolean
}

/**
 * The tab standing for "every category". Not a real category key — it is
 * `__all__` rather than a plausible key like `all` so a user-created category
 * could never collide with it.
 */
const ALL_CATEGORIES = '__all__'

/** Icon for a skill whose category is missing from the categories API. */
const DEFAULT_ICON = 'folder'

/**
 * Room a category menu needs before it is worth opening downwards. Measured
 * against the window, not the card: the menu is positioned inside the card but
 * the limit on where it can be drawn is the viewport edge. Same threshold the
 * settings page uses, so both pickers flip at the same point.
 */
const CATEGORY_MENU_MAX_PX = 280

const STATUS_TEXT: Record<string, string> = { stable: 'Stable', beta: 'Beta', draft: 'Draft' }

/** Which status skin a value gets; anything unrecognised wears the beta one. */
function statusKeyOf(status: string | undefined): 's' | 'b' | 'd' {
  if (status === 'stable') return 's'
  if (status === 'draft') return 'd'
  return 'b'
}

/** Load the live skill catalog from the server data root. */
async function loadCatalog(): Promise<CatalogSkill[]> {
  try {
    const res = await fetch(`${API_BASE}/catalog`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.skills) ? data.skills : []
  } catch {
    return []
  }
}

/** Load the live category list (shipped defaults + custom categories). */
async function loadCategories(): Promise<CatalogCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.categories) ? data.categories : []
  } catch {
    return []
  }
}

/**
 * Render the board.
 * @param props - the two composer actions injected by the panel seat.
 * @returns the tab bar and the card grid, plus the detail dialog when open.
 */
export function ScienceSkillBoard({ addSkill, insertExample }: ScienceSkillBoardProps) {
  const [skills, setSkills] = useState<CatalogSkill[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string>(ALL_CATEGORIES)
  // The skill whose dialog is open, or undefined when none is. Holding the
  // skill itself (not just an id) is what lets the dialog paint its header from
  // data the board already has, before — or without — the detail route.
  const [openSkill, setOpenSkill] = useState<CatalogSkill | undefined>(undefined)
  // True until the first read settles, so the grid can say it is working rather
  // than claim the catalog is empty.
  const [loading, setLoading] = useState(true)
  // Instance-unique, so two boards on one page cannot share tab/panel ids.
  const panelId = `skill-board-${useId().replace(/:/g, '')}`

  // Which card's category menu is open, and whether it had to be flipped above
  // the pill because the card sits too near the bottom edge of the window.
  const [catMenuFor, setCatMenuFor] = useState<string | null>(null)
  const [catMenuUp, setCatMenuUp] = useState(false)
  // The skill whose category write is in flight, so its pill can say so rather
  // than sit there unchanged while the request is out.
  const [savingId, setSavingId] = useState<string | null>(null)
  // Outcome of the last category write. The board is the view that performed it,
  // so the board is the one that has to answer for it.
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Flipped on unmount so a response that arrives late cannot set state on a
  // board that is no longer on screen.
  const alive = useRef(true)

  const reload = useCallback((): void => {
    void Promise.all([loadCatalog(), loadCategories()]).then(([list, cats]) => {
      if (!alive.current) return
      setSkills(list)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    // Re-armed on every run, not just at declaration: the cleanup below clears
    // it, and React re-runs an effect in development, so a board that was torn
    // down and mounted again would otherwise refuse every response it asked for.
    alive.current = true
    reload()
    // Refresh when the window regains focus so an import made in another view
    // shows up without the user having to reopen the panel.
    const onFocus = (): void => { reload() }
    window.addEventListener('focus', onFocus)
    // Same for the document and this panel becoming visible again: the board and
    // the settings page are two views of one window, so switching between them
    // must re-read the catalog even if a change event was missed.
    const onVisible = (): void => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    // Every write to the catalog announces itself here — this board's own
    // category move, and the settings page's import, rename, move and rescan.
    // None of them fire a focus event, because the window never lost focus.
    window.addEventListener('dsh-science-skill:catalog-changed', onFocus)
    return () => {
      alive.current = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('dsh-science-skill:catalog-changed', onFocus)
    }
  }, [reload])

  // An open menu closes on any click that lands outside a card's picker. Bound
  // only while one is open, so the board is not listening for the common case.
  useEffect(() => {
    if (catMenuFor === null) return
    const onDown = (event: MouseEvent): void => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-cat-picker]') !== null) return
      setCatMenuFor(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [catMenuFor])

  // Internal support packages are not user-facing skills: the settings list
  // excludes them, and the board has to agree, or the same catalog reads
  // differently in the two views.
  const listed = skills.filter((skill) => skill.category !== 'internal')
  const tabs = categories.filter((category) => category.key !== 'internal')

  const trimmed = query.trim()
  const searching = trimmed !== ''

  /** How many skills a tab stands for; the count is what makes a tab worth clicking. */
  const countOf = (key: string): number =>
    key === ALL_CATEGORIES ? listed.length : listed.filter((skill) => skill.category === key).length

  /** Display label for a category key, falling back to the raw key. */
  const labelOf = (key: string | undefined): string =>
    categories.find((category) => category.key === key)?.label ?? key ?? ''

  /** Icon name for a category key, falling back to the neutral folder. */
  const iconOf = (key: string | undefined): string =>
    categories.find((category) => category.key === key)?.icon ?? DEFAULT_ICON

  // Category order decides the order of search hits too, so a flat result list
  // still reads in the order the tabs present. A skill whose category is missing
  // from the categories API sorts last rather than vanishing from the results.
  const order = new Map(categories.map((category, index) => [category.key, index]))
  const orderOf = (skill: CatalogSkill): number => order.get(skill.category ?? '') ?? order.size

  /** Show the outcome of a write for a moment, then clear it. */
  const flash = useCallback((kind: 'ok' | 'err', text: string): void => {
    setNote({ kind, text })
    window.setTimeout(() => setNote((current) => (current?.text === text ? null : current)), 4000)
  }, [])

  /**
   * File one skill under another category.
   *
   * The Host owns the record, so this posts and then re-reads instead of moving
   * the card locally: the settings page may have renamed or deleted the same
   * skill in the meantime, and a local edit would paint a catalog that no longer
   * exists. The re-read is triggered by the announcement below, which this board
   * also listens to, so there is exactly one path back to fresh data.
   *
   * @param skill - the skill whose card was used.
   * @param key - the category key chosen from the menu.
   */
  const moveCategory = useCallback(async (skill: CatalogSkill, key: string): Promise<void> => {
    setCatMenuFor(null)
    if (skill.category === key) return
    setSavingId(skill.id)
    try {
      const res = await fetch(`${API_BASE}/skills/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: skill.id, category: key }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; note?: string }
      if (data.ok === true) {
        flash('ok', data.note ?? '已移动分类。')
        // The settings page and the sidebar read this same catalog. They will
        // not see a focus event, because the window never lost focus, so the
        // move is announced on the shared channel instead — the one the settings
        // page already uses for its own edits.
        window.dispatchEvent(new CustomEvent('dsh-science-skill:catalog-changed'))
      } else {
        flash('err', data.error ?? '分类未能保存')
      }
    } catch (error) {
      flash('err', String(error))
    } finally {
      setSavingId(null)
    }
  }, [flash])

  const visible = searching
    ? listed.filter((skill) => matchesSkillQuery(trimmed, skill)).sort((a, b) => orderOf(a) - orderOf(b))
    : active === ALL_CATEGORIES
      ? listed
      : listed.filter((skill) => skill.category === active)

  /**
   * Choose a tab. A query and a tab answer different questions — "find this
   * skill" against "show me this category" — so choosing a tab drops the query
   * instead of leaving the grid showing something the selected tab does not
   * describe.
   * @param key - category key, or {@link ALL_CATEGORIES}.
   */
  const selectTab = (key: string): void => {
    setActive(key)
    setQuery('')
  }

  /** The one message the grid shows instead of cards, when it has none to show. */
  const emptyState = ((): { title: string; hint: string } | undefined => {
    if (loading) return { title: '正在载入技能…', hint: '正在读取数据根里的技能目录。' }
    if (listed.length === 0) {
      return { title: '暂无技能', hint: '在「设置 → Science Skill」里添加技能目录后，技能会出现在这里。' }
    }
    // Emptiness is decided by whether there is anything to show at all: with
    // matches in hand the grid renders, and only a genuinely empty result picks
    // one of the two messages below. Asking "is a query typed?" instead would
    // blank out every successful search whose matches were right there.
    if (visible.length > 0) return undefined
    if (searching) return { title: `没有匹配「${trimmed}」的技能`, hint: '换个关键词，或清空搜索框回到分类浏览。' }
    return { title: `「${labelOf(active)}」下暂无技能`, hint: '换一个分类，或在设置里把技能移到这个分类。' }
  })()

  return (
    <div className={styles.root}>
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(event) => { setQuery(event.target.value) }}
          placeholder="搜索技能：中文名 / 简介 / 英文 id / 命令"
          aria-label="搜索技能"
          spellCheck={false}
        />
        {searching && <span className={styles.searchCount}>{visible.length} 个结果</span>}
      </div>

      {/* The board's own write result. A category move made here has nowhere else
          to report itself: the card simply reappears under another tab, and a
          failed write would otherwise look exactly like a successful one. */}
      {note !== null && (
        <div
          className={styles.note + ' ' + (note.kind === 'ok' ? styles.noteOk : styles.noteErr)}
          role="status"
        >
          {note.text}
        </div>
      )}

      <div className={styles.tabs} role="tablist" aria-label="技能分类">
        <button
          type="button"
          role="tab"
          id={`${panelId}-tab-all`}
          aria-selected={active === ALL_CATEGORIES}
          aria-controls={panelId}
          className={styles.tab + (active === ALL_CATEGORIES ? ' ' + styles.tabActive : '')}
          onClick={() => { selectTab(ALL_CATEGORIES) }}
        >
          <span className={styles.tabLabel}>全部</span>
          <span className={styles.tabCount}>{countOf(ALL_CATEGORIES)}</span>
        </button>
        {tabs.map((category) => {
          const selected = active === category.key
          return (
            <button
              type="button"
              role="tab"
              key={category.key}
              id={`${panelId}-tab-${category.key}`}
              aria-selected={selected}
              aria-controls={panelId}
              className={styles.tab + (selected ? ' ' + styles.tabActive : '')}
              onClick={() => { selectTab(category.key) }}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                <ScienceCategoryIcon name={category.icon} size={14} />
              </span>
              <span className={styles.tabLabel}>{category.label}</span>
              <span className={styles.tabCount}>{countOf(category.key)}</span>
            </button>
          )
        })}
      </div>

      <div id={panelId} role="tabpanel" aria-label={searching ? '搜索结果' : labelOf(active) || '全部技能'}>
        {emptyState !== undefined ? (
          <div className={styles.state}>
            <span className={styles.stateTitle}>{emptyState.title}</span>
            <span className={styles.stateHint}>{emptyState.hint}</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {visible.map((skill) => {
              const title = skill.displayName ?? skill.name ?? skill.id
              const invoke = skill.invoke ?? `/${skill.id}`
              const summary = skill.displaySummary ?? skill.summary ?? ''
              const status = skill.status ?? 'beta'
              return (
                // The body opens the dialog; the pill summons. The container is
                // an `<article>` carrying `role="button"` rather than a real
                // `<button>`, because a button cannot contain the summon button
                // — nesting them is invalid HTML and the browser drops the inner
                // one. The cost is that a screen reader is told about a button
                // containing a button; the summon carries its own label and
                // stops propagation, which is the part that would otherwise
                // misfire, and both targets stay individually reachable.
                <article
                  key={skill.id}
                  className={styles.card}
                  data-skill={skill.id}
                  // While this card's menu is open the card is raised above its
                  // neighbours, so the menu is not painted over by the next card
                  // in the grid.
                  data-popup-open={catMenuFor === skill.id ? 'true' : undefined}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看技能详情：${title}`}
                  onClick={() => { setOpenSkill(skill) }}
                  onKeyDown={(event) => {
                    // `role` alone brings no key behaviour: Enter and Space are
                    // what a real button answers to, so they are handled here.
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    setOpenSkill(skill)
                  }}
                >
                  <span className={styles.cardAvatar} aria-hidden="true">
                    <ScienceCategoryIcon name={iconOf(skill.category)} size={18} />
                  </span>
                  <button
                    type="button"
                    className={styles.summon}
                    aria-label={`召唤技能「${title}」`}
                    onClick={(event) => {
                      // Without this the card's own handler runs on the same
                      // click and opens the dialog over the composer that was
                      // just filled.
                      event.stopPropagation()
                      addSkill(skill)
                    }}
                  >
                    召唤
                  </button>
                  <span className={styles.cardTitle}>{title}</span>
                  <span className={styles.cardInvoke}>{invoke}</span>
                  <span className={styles.cardSummary}>{summary}</span>
                  <span className={styles.cardFoot}>
                    {/* The category pill is the one management affordance the
                        board carries, and it is a `<button>` inside the card's
                        `role="button"` article — legal, because the article is
                        not itself a button, and the same shape the summon pill
                        already uses. Every event in here stops at the picker so
                        it cannot also open the detail dialog underneath. */}
                    <span
                      className={styles.catPicker}
                      data-cat-picker={skill.id}
                      onClick={(event) => { event.stopPropagation() }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') { setCatMenuFor(null) }
                        // Enter and Space belong to the picker's own buttons.
                        // Left to bubble, the card's handler would answer them by
                        // opening the dialog on top of the menu.
                        event.stopPropagation()
                      }}
                    >
                      <button
                        type="button"
                        className={styles.catPill}
                        title="点击修改分类"
                        aria-haspopup="menu"
                        aria-expanded={catMenuFor === skill.id}
                        aria-label={`修改「${title}」的分类，当前为 ${skill.categoryLabel ?? labelOf(skill.category)}`}
                        onClick={(event) => {
                          const opening = catMenuFor !== skill.id
                          setCatMenuFor(opening ? skill.id : null)
                          if (!opening) return
                          // Open towards whichever side of the pill can hold the
                          // list: a card near the window's bottom edge has no room
                          // below it, and the options would land out of sight.
                          const pill = event.currentTarget.getBoundingClientRect()
                          const below = window.innerHeight - pill.bottom
                          setCatMenuUp(below < CATEGORY_MENU_MAX_PX && pill.top > below)
                        }}
                      >
                        <span className={styles.catPillText}>
                          {savingId === skill.id ? '保存中…' : (skill.categoryLabel ?? labelOf(skill.category))}
                        </span>
                        <span className={styles.catCaret} aria-hidden="true">▾</span>
                      </button>
                      {catMenuFor === skill.id && (
                        <span className={styles.catDropdown} data-drop={catMenuUp ? 'up' : undefined} role="menu">
                          {tabs.map((category) => {
                            const current = skill.category === category.key
                            return (
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={current}
                                key={category.key}
                                className={styles.catOption + (current ? ' ' + styles.catOptionActive : '')}
                                onClick={() => { void moveCategory(skill, category.key) }}
                              >
                                <span className={styles.catOptionLabel}>
                                  <ScienceCategoryIcon name={category.icon} size={12} />
                                  {category.label}
                                </span>
                                {current && <span className={styles.catCheck}>✓</span>}
                              </button>
                            )
                          })}
                        </span>
                      )}
                    </span>
                    <span className={styles.status + ' ' + styles[statusKeyOf(status)]}>
                      {STATUS_TEXT[status] ?? status}
                    </span>
                  </span>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Rendered inside the board rather than beside it: the overlay is
          `position: fixed`, so it escapes this subtree anyway, and keeping it
          here means the dialog cannot outlive the catalog it was opened from. */}
      {openSkill !== undefined && (
        <SkillDetail
          skill={openSkill}
          icon={iconOf(openSkill.category)}
          onClose={() => { setOpenSkill(undefined) }}
          addSkill={addSkill}
          // The dialog deals in examples only; which skill an example belongs to
          // is bound here, where the open skill is known. Binding it any lower
          // would let the dialog reference a skill of its own choosing.
          insertExample={(text) => { insertExample(openSkill, text) }}
        />
      )}
    </div>
  )
}
