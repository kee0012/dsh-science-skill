/**
 * dsh-science-skill — browser half.
 *
 * Four seats, all through the official slot API (no DOM surgery):
 *   - `settings.section` key=`science-skill`: the skill center settings panel
 *     (list, categories, import, gate switches);
 *   - `sidebar.panellist` id=`science-skills`: the sidebar row that opens the
 *     skill tree;
 *   - `main` key=`science-skills`: the skill tree itself — every row inserts a
 *     skill's `/command` reference into the composer and then hands the
 *     composer back, so a reference is never inserted out of sight;
 *   - the `/` input-trigger source: the codec that lets such a reference
 *     serialize back to `/command`, which is what makes the chip survive a copy.
 *
 * The tree sits in the main area rather than inside the left column because
 * stock DSH declares no content seat in the sidebar. Its whole child table is
 * `sidebar.brand.mark`, `sidebar.brand.name`, `sidebar.toggle.badge`,
 * `sidebar.panellist`, `sidebar.workspaces`, `sidebar.settings` and
 * `sidebar.footer.action`; the only child that hosts arbitrary content,
 * `sidebar.workspaces`, is `single` and already owned by the workspace browser.
 * `sidebar.skills` belonged to the Science Agent fork's build, so registering
 * into it left an injection waiting on a slot nobody declares and the tree
 * simply never rendered.
 *
 * Scope kept out on purpose: the Science Agent brand marks (whale) and the data
 * root switcher are not skill capability.
 *
 * A registration failure must never take the whole GUI down: every step warns
 * and returns instead of throwing.
 */
import type { JSX } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  IConversation,
  InputActions,
  SessionInput,
} from '@deepseek-ai/dsh-client-ui-conversation/client'

import { SkillSettingsSection, type SkillSettingsSectionProps } from './SkillSettingsSection.tsx'
import { ScienceCategoryIcon } from './ScienceCategoryIcon.tsx'
import { ScienceSkillBoard, type CatalogSkill } from './SkillStrip.tsx'
import { CSS as settingsCss } from './styles/SkillSettingsSection.ts'
import { CSS as stripCss } from './styles/SkillStrip.ts'
import { CSS as detailCss } from './styles/SkillDetail.ts'
import { installPanelStyles, pickDirectoryFrom } from './ui/inject.ts'
import { activateSkill } from './skill-gate.ts'

/** The plugin id; the shared `apply` contract keeps the factory from inlining it. */
export const name = 'dsh-science-skill'

/**
 * The reference source name shared by the chip and the codec. Both sides must
 * agree on this string: the chip records it, the codec is looked up by it.
 */
export const SKILL_REFERENCE_SOURCE = 'science-skill'

/** The panel id, which is also the settings namespace and the plugin name. */
const SECTION_ID = 'science-skill'
const SECTION_LABEL = 'Science Skill'

/**
 * One id shared by the sidebar row and the main-area panel it selects: the
 * sidebar's panel list resolves a row to the `main` entry carrying the same key
 * (`ctx.layout.selectPanel(id)`), so the two registrations cannot drift.
 */
const SKILLS_PANEL_ID = 'science-skills'
const SKILLS_PANEL_LABEL = '技能'

/**
 * Root services this half needs; the runtime seats them before `apply` runs.
 *
 * `conversation` belongs here even though the controller is addressed per
 * session (`conversation.input.for(actx)`): the fork's own science panel
 * declares the same seat and activates, and without the declaration
 * `ctx.get('conversation')` answers `undefined` — the composer insert then died
 * with `Cannot read properties of undefined (reading 'input')`. Declared seats
 * are also the only ones cordis waits for; a seat that is merely read is a race.
 *
 * `layout` is what swaps the main panel back to `conversation` after a row
 * inserts its reference; it is the same seat `ui-plugin-manager` declares to
 * open its own panel from the sidebar.
 */
export const inject = ['slots', 'sessions', 'conversation', 'remote', 'locale', 'inputTriggers', 'layout']

interface SlotRegistry {
  register: (spec: Record<string, unknown>, component: unknown) => unknown
  inject: (name: string, callback: () => unknown) => void
}

interface EffectService {
  effect?: (callback: () => () => void, label?: string) => unknown
}

/**
 * The `ctx.layout` face used here: the shell's main-panel selection. Only
 * `selectPanel` is addressed — the sidebar row already opened this plugin's
 * panel, and the tree only needs to hand the center column back to the
 * conversation once it has filled the composer.
 */
interface LayoutService {
  /**
   * Select the `main` entry carrying this key; `null` clears the selection.
   * Throws when no `main` entry declares the key.
   */
  selectPanel: (id: string | null) => void
}

/**
 * The `ctx.inputTriggers` service face: a plain source registry whose
 * `registerSource` answers with its own disposer.
 *
 * There is deliberately no `inject` here. The in-tree build exposed one, and
 * calling it is what used to throw `l.inject is not a function` out of `apply`
 * — taking every seat below it down with it. Waiting for the seat is the
 * context's job (`ctx.inject`), not the service's.
 */
interface InputTriggerService {
  registerSource: (source: {
    trigger: string
    name: string
    candidates: () => Promise<unknown[]>
    onPick: () => undefined
    codec: { clipboardText: (ref: string) => string; serialize: (ref: string) => Promise<string> }
  }) => () => void
}

/** The session-id brand the session service both hands out and accepts. */
type SessionId = Parameters<ISessions['retainInfo']>[0]

/**
 * The chip skin the in-tree build renders for a skill reference.
 *
 * The published insert contract types the field as
 * `ReferenceInsert['appearance']` — `'session' | 'file' | 'folder'` (see
 * `dsh-client-ui-conversation`'s `contract/draft-editor.d.ts`) — while the chip
 * renderer itself reads the primitives' wider `ReferenceIconKind`. The value is
 * therefore carried through one explicit widening rather than dropped: a host
 * with a `skill` skin renders the science chip, and a host without one falls
 * back to the default chip instead of losing the reference.
 */
type ChipAppearance = NonNullable<Parameters<SessionInput['insertReference']>[0]['appearance']>
const SKILL_CHIP_APPEARANCE = 'skill' as unknown as ChipAppearance

/**
 * Insert a skill's `/command` reference into the composer of the session the
 * main view is showing, then mark it activated for that session.
 * @param sessions - the client session service.
 * @param conversation - the conversation service owning the composer.
 * @param skill - the skill to reference; `invoke` wins over `id`.
 * @returns whether the reference actually landed. The example path needs this:
 *   a sentence inserted without its skill is exactly the defect this reports,
 *   so it inserts nothing rather than leave an orphan line behind.
 */
function addSkillToComposer(
  sessions: ISessions,
  conversation: IConversation,
  skill: CatalogSkill,
): boolean {
  try {
    const current = sessions.list
      .getSnapshot()
      .ids.find((id: SessionId) => (sessions.retainInfo(id).getSnapshot().retainedBy.mainView ?? 0) > 0)
    if (current === undefined) {
      console.warn('[dsh-science-skill] no session is shown in the main view')
      return false
    }
    const actx = sessions.binding(current)?.ctx
    if (actx === undefined) {
      console.warn('[dsh-science-skill] session has no agent context')
      return false
    }
    const input = conversation.input.for(actx)
    if (input === undefined) return false
    const command = (skill.invoke ?? skill.id).replace(/^\//, '')
    // The selection must be captured before the insert so the chip replaces the
    // caret span, and the capture rides the composer's action face: a facade
    // without it means there is no editor to insert into.
    const actions = (input as SessionInput & { actions?: InputActions }).actions
    if (actions === undefined) {
      console.warn('[dsh-science-skill] composer exposes no insertion actions')
      return false
    }
    void input.insertReference(
      {
        source: SKILL_REFERENCE_SOURCE,
        ref: command,
        label: command,
        appearance: SKILL_CHIP_APPEARANCE,
        clipboardText: `/${command}`,
      },
      actions.captureInsertion(),
    )
    activateSkill(current, command)
    return true
  } catch (error) {
    console.warn('[dsh-science-skill] could not reference the skill:', error)
    return false
  }
}

/**
 * Insert one line of plain text into the composer of the session on screen.
 *
 * This is the detail dialog's example path, and it is deliberately not the same
 * operation as {@link addSkillToComposer}: an example is prose the user is
 * expected to edit, whereas a skill is an atomic reference chip. The host's own
 * public input face carries exactly that distinction — `InputActions.insertText`
 * is documented as "insert asynchronous text without replacing subsequent edits
 * or reference chips", while the chip goes through `SessionInput.insertReference`
 * — so this uses the former and rides the same captured-span protocol as the
 * latter.
 *
 * Verified against the runtime, not guessed: `dsh-client-ui-conversation`'s
 * `lib/types/client/contract/input.d.ts` declares
 * `captureInsertion(): TokenSpan` and `insertText(text, span): boolean` on the
 * `InputActions` face, and the shipped `lib/client.js` implements the latter as
 * `draftEditor.insertAsyncText(span, text)`.
 * @param sessions - the client session service.
 * @param conversation - the conversation service owning the composer.
 * @param text - the plain text to place at the caret.
 * @returns whether the host accepted the insert.
 */
function insertTextIntoComposer(
  sessions: ISessions,
  conversation: IConversation,
  text: string,
): boolean {
  try {
    const current = sessions.list
      .getSnapshot()
      .ids.find((id: SessionId) => (sessions.retainInfo(id).getSnapshot().retainedBy.mainView ?? 0) > 0)
    if (current === undefined) {
      console.warn('[dsh-science-skill] no session is shown in the main view')
      return false
    }
    const actx = sessions.binding(current)?.ctx
    if (actx === undefined) {
      console.warn('[dsh-science-skill] session has no agent context')
      return false
    }
    const input = conversation.input.for(actx)
    if (input === undefined) return false
    const actions = (input as SessionInput & { actions?: InputActions }).actions
    if (actions === undefined) {
      console.warn('[dsh-science-skill] composer exposes no insertion actions')
      return false
    }
    // The span is captured before the write: `insertText` refuses a stale
    // revision, which is what stops an example from landing at a caret the user
    // has since moved.
    return actions.insertText(text, actions.captureInsertion())
  } catch (error) {
    console.warn('[dsh-science-skill] could not insert the example text:', error)
    return false
  }
}

/**
 * The main-area skill board. The sidebar's `技能` row selects this panel, and the
 * panel is the full-width home of the board. `ScienceSkillBoard` loads its own
 * catalog and categories from the data-root APIs, so the only thing it needs
 * handed in is the add action.
 *
 * The wrapper carries inline geometry on purpose: the panel is a guest in the
 * center column, and the board's grid is authored to want the whole width rather
 * than the narrow rail it used to live in.
 * @param props - the injected add-skill and example-text actions.
 */
function SkillsPanel({ addSkill, insertExample }: {
  addSkill: (skill: CatalogSkill) => void
  insertExample: (skill: CatalogSkill, text: string) => void
}): JSX.Element {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>科研技能</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, opacity: 0.62 }}>
          点击卡片查看技能详情，或直接点右上角「召唤」把它加入当前会话的输入框。
        </p>
        <ScienceSkillBoard addSkill={addSkill} insertExample={insertExample} />
      </div>
    </div>
  )
}

/**
 * Mount the browser half: styles first, then the four seats.
 * @param ctx - the client plugin context.
 */
export function apply(ctx: Context): void {
  const slots = (ctx as unknown as { slots: SlotRegistry }).slots
  const effect = (ctx as unknown as EffectService).effect

  // The host has no style-injection API, so the sheets ride the plugin effect:
  // cordis runs the effect body immediately and collects what it *returns* as
  // the teardown. Handing it `() => install` therefore installs nothing — the
  // installer itself becomes the teardown — so the body must do the work and
  // return the disposer `installPanelStyles` answered with.
  const install = (): (() => void) =>
    installPanelStyles([
      { key: 'dsh-science-skill/skills-settings.css', css: settingsCss },
      { key: 'dsh-science-skill/skills-strip.css', css: stripCss },
      { key: 'dsh-science-skill/skills-detail.css', css: detailCss },
    ])
  if (typeof effect === 'function') effect(install, 'dsh-science-skill: panel styles')
  else install()

  const sessions = ctx.get('sessions') as unknown as ISessions
  // Declared seats resolve through the inject proxy, not through `ctx.get`.
  const conversation = (ctx as unknown as { conversation: IConversation }).conversation
  const layout = (ctx as unknown as { layout: LayoutService }).layout
  const remote = ctx.get('remote')

  // The desktop shell's preload bridge is the surface this install actually
  // has; `uiWorkspace` is the official fallback and `remote` the fork's.
  const pickDirectory = (): Promise<string | null> =>
    pickDirectoryFrom(remote, ctx.get('uiWorkspace'))

  // The `/` reference source: the codec that lets an inserted skill chip
  // serialize back to `/command`. The seat is already guaranteed by this
  // half's own `inject` list, so the service is read straight off the context
  // — the registry owns its disposer, which rides this plugin's effect.
  // Everything here is best-effort: a runtime without the source registry (or
  // with a different one) must still get the two slot seats below.
  try {
    const inputTriggers = (ctx as unknown as { inputTriggers?: InputTriggerService }).inputTriggers
    if (inputTriggers !== undefined && typeof inputTriggers.registerSource === 'function') {
      const source = {
        trigger: '/',
        name: SKILL_REFERENCE_SOURCE,
        candidates: async () => [],
        onPick: () => undefined,
        codec: {
          clipboardText: (ref: string) => `/${ref}`,
          serialize: async (ref: string) => `/${ref}`,
        },
      }
      if (typeof effect === 'function') effect(() => inputTriggers.registerSource(source), 'dsh-science-skill: slash source')
      else inputTriggers.registerSource(source)
    }
  } catch (error) {
    console.warn('[dsh-science-skill] slash source registration failed:', error)
  }

  const addSkill = (skill: CatalogSkill): void => {
    addSkillToComposer(sessions, conversation, skill)
    // The tree is a main-area panel, so the row that filled the composer also
    // returns to it: a reference inserted into a composer the user cannot see is
    // a reference they cannot send. The reference is held by the workspace's
    // `mainView` retention, so it survives the panel switch either way.
    try {
      layout.selectPanel('conversation')
    } catch (error) {
      console.warn('[dsh-science-skill] could not return to the conversation panel:', error)
    }
  }

  /**
   * Put one example line from the detail dialog into the composer, behind the
   * skill that example belongs to.
   *
   * **The order is the whole point.** Both writes ride `captureInsertion()`,
   * which reads the caret at the moment it is called, so the reference chip has
   * to be placed first for the prose to land after it. Inserting the prose alone
   * — which is what this used to do — left the user with a sentence and no skill
   * attached, so the model had no way to know which skill was meant.
   *
   * The separating space matters for the same reason the order does: without it
   * the sentence abuts the chip and reads as part of the reference.
   *
   * The panel switch happens last and only when the prose actually landed:
   * switching away from the board on a refused insert would hide the dialog and
   * leave the user looking at a composer with no explanation.
   * @param skill - the skill the clicked example belongs to.
   * @param text - the example line to place after the reference.
   */
  const insertExample = (skill: CatalogSkill, text: string): void => {
    // Both or neither. A sentence inserted without its skill is the defect this
    // path was fixed for, so a reference that could not land must not leave an
    // orphan line behind either — the user would be back to prose the model
    // cannot attribute to a skill.
    if (!addSkillToComposer(sessions, conversation, skill)) return
    if (!insertTextIntoComposer(sessions, conversation, ` ${text}`)) return
    try {
      layout.selectPanel('conversation')
    } catch (error) {
      console.warn('[dsh-science-skill] could not return to the conversation panel:', error)
    }
  }

  try {
    slots.inject('settings.section', () =>
      slots.register(
        {
          name: 'settings.section',
          id: SECTION_ID,
          order: 21,
          label: SECTION_LABEL,
          inject: () => ({ pickDirectory }),
        },
        function SkillCenterPanel(props: unknown) {
          const runtime = props as SkillSettingsSectionProps
          return <SkillSettingsSection {...runtime} pickDirectory={pickDirectory} />
        },
      ),
    )
  } catch (error) {
    console.warn('[dsh-science-skill] settings section registration failed:', error)
  }

  // The tree's main-area seat. `main` is keyed, and the key is what
  // `selectPanel` resolves, so it has to equal the sidebar row's id.
  try {
    slots.inject('main', () =>
      slots.register(
        {
          name: 'main',
          key: SKILLS_PANEL_ID,
          inject: () => ({ addSkill, insertExample }),
        },
        function SkillTreePanel(props: unknown) {
          const runtime = props as {
            addSkill: (skill: CatalogSkill) => void
            insertExample: (skill: CatalogSkill, text: string) => void
          }
          return <SkillsPanel addSkill={runtime.addSkill} insertExample={runtime.insertExample} />
        },
      ),
    )
  } catch (error) {
    console.warn('[dsh-science-skill] skill panel registration failed:', error)
  }

  // The sidebar row that opens it. `sidebar.panellist` is a list of panel rows
  // whose component is the row's glyph, so this half draws only an icon.
  try {
    slots.inject('sidebar.panellist', () =>
      slots.register(
        {
          name: 'sidebar.panellist',
          id: SKILLS_PANEL_ID,
          order: 12,
          label: SKILLS_PANEL_LABEL,
        },
        function SkillTreeIcon(props: unknown) {
          const { size } = props as { size?: number }
          return <ScienceCategoryIcon name="library" size={size ?? 16} />
        },
      ),
    )
  } catch (error) {
    console.warn('[dsh-science-skill] sidebar row registration failed:', error)
  }
}
