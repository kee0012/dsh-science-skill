/**
 * dsh-science-skill — the skill detail dialog.
 *
 * Opening a card is a read: the user wants to know what a skill does, what to
 * type at it, and what is actually in its `SKILL.md`, before committing it to
 * the composer. The dialog answers those three questions in that order, and the
 * only write it performs is the one the user explicitly asks for — 「去试试」
 * summons the skill, and clicking an example line puts that example into the
 * composer.
 *
 * The board already carries everything the header needs, so the dialog opens
 * with real content and *then* enriches itself from `GET /skills/detail`. That
 * ordering is the whole degradation story: examples and the markdown body come
 * from a route the host may not serve yet (an older build, or a half-upgraded
 * one), and a missing route must cost the user two blocks of the dialog, never
 * the dialog itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScienceCategoryIcon } from './ScienceCategoryIcon.tsx'
import { API_BASE } from './skill-gate.ts'
import type { CatalogSkill } from './SkillStrip.tsx'
import { SkillDetail as styles } from './styles/class-names.ts'

/** What `GET /skills/detail` answers with when the route exists. */
interface SkillDetailPayload {
  ok?: boolean
  id?: string
  name?: string
  displayName?: string
  displaySummary?: string
  category?: string
  categoryLabel?: string
  status?: string
  invoke?: string
  /** Ready-to-send prompts for this skill; empty when nothing generated one yet. */
  examples?: string[]
  /** The skill's own `SKILL.md` source. */
  markdown?: string
  /** True when the host cut `markdown` short to bound the response. */
  truncated?: boolean
}

/** Detail props: the skill to show, plus the two actions the dialog may take. */
export interface SkillDetailProps {
  /** The skill as the board already knows it; the header renders from this. */
  skill: CatalogSkill
  /** Icon name for the skill's category, resolved by the board's category list. */
  icon: string
  /** Close the dialog. */
  onClose: () => void
  /** Summon the skill into the current session's composer. */
  addSkill: (skill: CatalogSkill) => void
  /** Put one example line into the current session's composer. */
  insertExample: (text: string) => void
}

/** How the enrichment fetch went; drives which blocks can render. */
type Load = 'loading' | 'ok' | 'unavailable'

/** Status label shown next to the title, matching the board's card foot. */
const STATUS_TEXT: Record<string, string> = { stable: 'Stable', beta: 'Beta', draft: 'Draft' }

/**
 * Read one skill's detail payload.
 *
 * Never throws: a route the host does not serve (404), a malformed body, or a
 * network failure all collapse to `undefined`, which the caller renders as two
 * explanatory blocks rather than as an error state.
 * @param id - skill id.
 * @returns the payload, or `undefined` when the route could not answer.
 */
async function loadDetail(id: string): Promise<SkillDetailPayload | undefined> {
  try {
    const res = await fetch(`${API_BASE}/skills/detail?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (!res.ok) return undefined
    const data = await res.json() as SkillDetailPayload
    return data?.ok === true ? data : undefined
  } catch {
    return undefined
  }
}

/**
 * Render the detail dialog for one skill.
 * @param props - the skill, the close handler, and the two composer actions.
 * @returns the modal, or nothing once closed (the caller unmounts it).
 */
export function SkillDetail({ skill, icon, onClose, addSkill, insertExample }: SkillDetailProps): JSX.Element {
  const [detail, setDetail] = useState<SkillDetailPayload | undefined>(undefined)
  const [load, setLoad] = useState<Load>('loading')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // One fetch per skill. The board remounts this dialog per selection, so the
  // dependency is the id rather than a mounted-once effect.
  useEffect(() => {
    let alive = true
    setLoad('loading')
    setDetail(undefined)
    void loadDetail(skill.id).then((payload) => {
      if (!alive) return
      setDetail(payload)
      setLoad(payload === undefined ? 'unavailable' : 'ok')
    })
    return () => { alive = false }
  }, [skill.id])

  // Escape closes, and the document behind the overlay must not scroll while the
  // dialog is up — the board is a long scroll and a wheel event that leaks
  // through reads as the dialog jumping.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    const restoreTo = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    // Focus the dialog itself rather than a control inside it: the first control
    // is the close button, and landing there makes Enter dismiss the dialog the
    // user just opened.
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      restoreTo?.focus?.()
    }
  }, [onClose])

  /** Close only when the overlay itself was hit, not a click that bubbled from the dialog. */
  const onOverlayClick = useCallback((event: { target: unknown; currentTarget: unknown }): void => {
    if (event.target === event.currentTarget) onClose()
  }, [onClose])

  const title = detail?.displayName ?? skill.displayName ?? skill.name ?? skill.id
  const invoke = detail?.invoke ?? skill.invoke ?? `/${skill.id}`
  const summary = detail?.displaySummary ?? skill.displaySummary ?? skill.summary ?? ''
  const categoryLabel = detail?.categoryLabel ?? skill.categoryLabel ?? ''
  const status = detail?.status ?? skill.status ?? 'beta'
  const examples = Array.isArray(detail?.examples) ? detail.examples : []
  const markdown = typeof detail?.markdown === 'string' ? detail.markdown : ''

  /**
   * Summon the skill and dismiss the dialog. The dialog is a modal over the
   * board, so leaving it open would cover the composer the user just filled.
   */
  const summon = (): void => {
    addSkill(skill)
    onClose()
  }

  /**
   * Put one example into the composer and dismiss, for the same reason.
   * @param text - the example line the user clicked.
   */
  const useExample = (text: string): void => {
    insertExample(text)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onOverlayClick} data-skill-detail={skill.id}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`技能详情：${title}`}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className={styles.head}>
          <span className={styles.headGlyph} aria-hidden="true">
            <ScienceCategoryIcon name={icon} size={22} />
          </span>
          <span className={styles.headText}>
            <span className={styles.title}>{title}</span>
            <span className={styles.headMeta}>
              <span className={styles.invoke}>{invoke}</span>
              {categoryLabel !== '' && <span className={styles.catTag}>{categoryLabel}</span>}
              <span className={styles.statusTag}>{STATUS_TEXT[status] ?? status}</span>
            </span>
          </span>
          <span className={styles.headActions}>
            <button type="button" className={styles.try} onClick={summon}>去试试</button>
            <button type="button" className={styles.close} onClick={onClose} aria-label="关闭">×</button>
          </span>
        </div>

        {summary !== '' && <p className={styles.summary}>{summary}</p>}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>试试这样用</h3>
          {load === 'unavailable' ? (
            <p className={styles.hint}>暂时读不到示例（宿主还没提供详情接口）。点「去试试」先把技能召唤进输入框。</p>
          ) : load === 'loading' ? (
            <p className={styles.hint}>正在读取示例…</p>
          ) : examples.length === 0 ? (
            <p className={styles.hint}>该技能还没有示例，点设置里的「刷新」后由默认模型生成。</p>
          ) : (
            <div className={styles.exampleList}>
              {examples.map((example, index) => (
                // Each row is its own button: the payload is a list of peer
                // prompts, and a row is a complete action on one of them.
                <button
                  type="button"
                  className={styles.example}
                  key={`${index}-${example}`}
                  onClick={() => { useExample(example) }}
                >
                  <span className={styles.exampleText}>{example}</span>
                  <span className={styles.exampleIcon} aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m22 2-7 20-4-9-9-4Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>技能详情</h3>
          {load === 'unavailable' ? (
            <p className={styles.hint}>暂时读不到 SKILL.md 原文（宿主还没提供详情接口）。</p>
          ) : load === 'loading' ? (
            <p className={styles.hint}>正在读取 SKILL.md…</p>
          ) : markdown === '' ? (
            <p className={styles.hint}>这个技能没有可展示的 SKILL.md 原文。</p>
          ) : (
            <div className={styles.markdownScroll}>
              <pre className={styles.markdown}>{markdown}</pre>
              {detail?.truncated === true && <p className={styles.hint}>内容过长，已截断显示。</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
