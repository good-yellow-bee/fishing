/** Links into the catch search on the field log home; kept apart so cards can link without importing the search. */

/** The catch search for fish matching both `within` (a kind of fish or a water) and `text`, such as a sky or a season. */
export function findWithLink(within: string, text: string): string {
  return findLink(`${within} + ${text}`);
}

export const FIND_PARAM = "find";

/** The field log home, opened with this catch search already typed in. */
export function findLink(text: string): string {
  return `/?${new URLSearchParams({ [FIND_PARAM]: text }).toString()}`;
}
