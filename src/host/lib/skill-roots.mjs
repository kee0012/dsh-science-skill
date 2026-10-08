// src/host/lib/skill-roots.mjs
// The user-level skill roots the host loads skills from, in provider rank order.
//
// Copied from science-agent's `science/workbench-web/skill-roots.mjs`. Changes:
// the data root arrives as the argument (one resolved root drives both the
// catalog and this scan, instead of re-reading `$DSH_HOME` here), and skill
// directories the host was configured with explicitly are considered too.
//
// An installer writes into whichever root it knows about, and different skill
// managers pick differently, so a single hard-coded directory silently misses
// skills the host is already loading. Keep this in step with
// `packages/skill/skill-filesystem/src/index.ts` (`roots()`).
//
// The user's own import directory (`<root>/skill-import.json`) leads the list:
// it is where this plugin installs skills the user added, and the setting would
// be a lie if the folder it names were not scanned — the skill would copy fine
// and then never load. Leading also makes it the winner for an id that exists
// both there and in `<root>/skills`, which is the choice the user just made.
//
// Project-level roots (`<project>/.dsh/skills`, `<project>/.agents/skills`) are
// deliberately absent: they follow the session's working directory, while the
// rail and this catalog are one global list. A preset's own `customSkillDirs`
// point at harness-shipped skills, not at anything a user installs.
import { homedir } from 'node:os'
import { isAbsolute, join, normalize } from 'node:path'
import { defaultImportDir } from './import-settings.mjs'

/**
 * Resolve the user-level skill directories the host discovers skills in.
 * @param root - data root, which is the host's `$DSH_HOME`.
 * @param extraDirs - extra skill directories to consider (plugin config).
 * @returns absolute skill directories, most authoritative first — a skill with
 *   one id in two roots is loaded from the first one, so adoption must agree.
 */
export function userSkillRoots(root, extraDirs = []) {
  const importDir = defaultImportDir(root)
  const candidates = []
  if (importDir !== '') {
    // A configured import directory IS the skill set this plugin manages. The
    // user pointed at one folder; scanning the harness's own roots alongside it
    // mixed in skills they never chose, listed 24 folder names twice, and turned
    // the rescan's "skipped" count into a report about folders nobody asked
    // about. Scanning only what was chosen keeps the panel honest.
    candidates.push(importDir)
  } else {
    // Unset: behave as before, so a fresh install still sees the harness's own
    // skill roots rather than an empty tree.
    const agentsHome = process.env.DSH_AGENTS_HOME?.trim() || join(homedir(), '.agents')
    candidates.push(join(root, 'skills'), join(agentsHome, 'skills'))
  }
  // Explicitly configured directories are the operator's own choice, so they
  // apply in both modes.
  for (const dir of Array.isArray(extraDirs) ? extraDirs : []) {
    if (typeof dir === 'string' && dir.trim() !== '') candidates.push(isAbsolute(dir) ? dir : join(root, dir))
  }
  // Same path twice would adopt one skill and then see the other as its own
  // duplicate; compare the way Windows does.
  const seen = new Set()
  const roots = []
  for (const candidate of candidates) {
    const key = normalize(candidate).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    roots.push(candidate)
  }
  return roots
}
