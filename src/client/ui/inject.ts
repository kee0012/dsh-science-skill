/**
 * Style injection for the browser half.
 *
 * There is no plugin style API in the host: the six theme sheets the app itself
 * ships are hand-written `<style>` elements appended to `<head>`, de-duplicated
 * by the `data-plugin` / `data-plugin-css` dataset keys and removed with the
 * plugin. This module does exactly the same, so an unload takes the plug-in's
 * CSS with it.
 *
 * Scope rules that matter (they are why the sheets carry the token block
 * themselves):
 *  - the token layer lands on the panel root, never on `:root` — the host
 *    defines every `--dsw-alias-*` on `body`, and a custom property resolves on
 *    the element that uses it, so by the time the plug-in renders the inherited
 *    values are already in view;
 *  - dark mode is the `body[data-ds-dark-theme]` attribute, not
 *    `prefers-color-scheme`, so the dark override is written against that.
 */

/** One stylesheet the browser half installs. */
export interface PanelStyle {
  /** De-duplication key: re-mounting a sheet with the same key is a no-op. */
  key: string
  /** The CSS text, token block included (see the file comment). */
  css: string
}

/**
 * Install the given sheets once, keyed by {@link PanelStyle.key}.
 *
 * Idempotent: a sheet whose key is already in the document is skipped, so a
 * remount of the declaring owner cannot stack duplicates.
 * @param styles - Sheets to install, in order.
 * @returns disposer removing the sheets this call actually added.
 */
export function installPanelStyles(styles: readonly PanelStyle[]): () => void {
  const added: HTMLStyleElement[] = []
  for (const sheet of styles) {
    if (document.head.querySelector(`style[data-plugin-css="${sheet.key}"]`) !== null) continue
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-science-skill'
    tag.dataset.pluginCss = sheet.key
    tag.textContent = sheet.css
    document.head.appendChild(tag)
    added.push(tag)
  }
  return () => {
    for (const tag of added) tag.remove()
  }
}

/** The desktop shell's preload bridge, present when the page runs in the app. */
interface DesktopPickerBridge {
  pick?: () => Promise<string | null>
}

/** The workspace-UI service face the official native picker drives. */
interface WorkspacePicker {
  pickDirectory?: () => Promise<string | null>
}

/**
 * Ask the runtime for a folder, trying every picking surface it may offer.
 *
 * Three exist, most specific first:
 *  1. `globalThis.__DSH_DIRECTORY_PICKER__` — the desktop shell's preload
 *     bridge, and what the official native picker itself calls in the local
 *     Electron app (`lib/preload-app.cjs` exposes it);
 *  2. `ctx.uiWorkspace.pickDirectory()` — the workspace UI service the official
 *     picker falls back to in ordinary Web;
 *  3. `remote.directoryPicker` — the generated namespace the Science Agent fork
 *     addressed, kept last because this runtime does not serve it.
 *
 * A cancelled dialog answers `null` and **ends** the cascade: falling through
 * would open a second chooser over the one the user just dismissed. Only a
 * surface that is *missing*, or that throws, moves on to the next.
 *
 * The wire shape is not pinned: a generated remote may answer the bare
 * `string | null` or an `{ ok, value }` envelope, and both are read.
 * @param remote - the client context's `remote` service (optional).
 * @param uiWorkspace - the client context's `uiWorkspace` service (optional).
 * @returns the chosen absolute path, or `null` when nothing was picked.
 */
export async function pickDirectoryFrom(remote: unknown, uiWorkspace?: unknown): Promise<string | null> {
  // 1) The local desktop shell. This is the surface a desktop install has, and
  //    asking anything else first is what made the buttons look dead.
  const bridge = (globalThis as { __DSH_DIRECTORY_PICKER__?: DesktopPickerBridge }).__DSH_DIRECTORY_PICKER__
  if (typeof bridge?.pick === 'function') {
    try {
      const picked = await bridge.pick()
      if (typeof picked === 'string') return picked
      if (picked === null) return null
    } catch (error) {
      console.warn('[dsh-science-skill] desktop directory bridge failed:', error)
    }
  }

  // 2) The workspace UI service, which owns the directory-flow conversation.
  const workspace = uiWorkspace as WorkspacePicker | undefined
  if (typeof workspace?.pickDirectory === 'function') {
    try {
      const picked = await workspace.pickDirectory()
      if (typeof picked === 'string') return picked
      if (picked === null || picked === undefined) return null
    } catch (error) {
      console.warn('[dsh-science-skill] uiWorkspace.pickDirectory failed:', error)
    }
  }

  // 3) The fork's generated remote namespace, if this runtime serves one.
  type PickerResult = string | null | { ok: boolean; value?: string | null }
  const picker = (remote as { directoryPicker?: { pick?: () => Promise<PickerResult> } } | undefined)
    ?.directoryPicker
  if (typeof picker?.pick !== 'function') {
    // Nothing could have opened a chooser. Saying so is the difference between
    // "you cancelled" and "this build has no picker", which look identical from
    // the button.
    console.warn('[dsh-science-skill] no directory picker is available in this runtime')
    return null
  }
  try {
    const result = await picker.pick()
    if (result === null || typeof result === 'string') return result
    return result.ok ? (result.value ?? null) : null
  } catch (error) {
    console.warn('[dsh-science-skill] remote.directoryPicker failed:', error)
    return null
  }
}
