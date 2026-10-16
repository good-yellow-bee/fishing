/** Links into the catch search on the field log home; kept apart so cards can link without importing the search. */

/** The catch search for fish matching both `within` (a kind of fish or a water) and `text`, such as a sky or a season. */
export function findWithLink(within: string, text: string): string {
  return findLink(`${within} + ${text}`);
}

export const FIND_PARAM = "find";

/** Search terms that match one name whole ("species:\"Bass\"" finds bass, not smallmouth bass), so a link opens exactly the fish its count counted. */
export const EXACT_FIELDS = ["species", "lure", "water"] as const;
export type ExactField = (typeof EXACT_FIELDS)[number];

export function exactTerm(field: ExactField, name: string): string {
  return `${field}:"${name}"`;
}

/** The field and name of an exact term, or null for any other search. */
export function parseExactTerm(text: string): { field: ExactField; name: string } | null {
  const match = /^\s*(species|lure|water):"(.+)"\s*$/i.exec(text);
  return match ? { field: match[1]!.toLowerCase() as ExactField, name: match[2]! } : null;
}

/** The field log home, opened with this catch search already typed in. */
export function findLink(text: string): string {
  return `/?${new URLSearchParams({ [FIND_PARAM]: text }).toString()}`;
}
