/**
 * Skill search: one matcher shared by the sidebar category rail and the
 * "设置 → Skill" page, so the same query finds the same skills in both views.
 * Recall is usually partial — a remembered word from the Chinese display name
 * or from the one-line Chinese summary, an English id fragment, or a
 * `/command` — so every field a user might remember becomes one haystack, and
 * a query's whitespace-separated terms must all appear in it.
 */

/** The fields of a catalog skill that a user may remember and search by. */
export interface SearchableSkill {
  /** Skill folder id under one of the skill roots. */
  id: string
  /** Skill identifier (English; the frontmatter name or the folder id). */
  name?: string | undefined
  /** Chinese display name. */
  displayName?: string | undefined
  /** One-line Chinese summary. */
  displaySummary?: string | undefined
  /** The skill's own summary (SKILL.md text); the fallback for the above. */
  summary?: string | undefined
  /** Chat trigger, e.g. `/nature-polishing`. */
  invoke?: string | undefined
}

/**
 * Whether one skill matches a query.
 *
 * @param query - Raw search text; blank matches everything.
 * @param skill - The skill record as either catalog view carries it.
 * @returns True when every whitespace-separated term appears in a searchable
 *   field, compared case-insensitively.
 */
export function matchesSkillQuery(query: string, skill: SearchableSkill): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term !== '')
  if (terms.length === 0) return true
  const haystack = [skill.displayName, skill.name, skill.displaySummary, skill.summary, skill.id, skill.invoke]
    .filter((field): field is string => typeof field === 'string' && field !== '')
    .join(' ')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}
