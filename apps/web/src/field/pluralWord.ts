/**
 * A typed word read as a plural of a name's word: "szczupaki" of "szczupak", "okonie" of "okoń", "bluegills" of
 * "bluegill". Both folded. The name's word takes three letters or more, and the typed one at most three more.
 */
export function pluralOf(typed: string, word: string): boolean {
  // A Polish adjective in the plural changes its ending rather than adding one: "tęczowy" → "tęczowe".
  if (word.length >= 4 && /[yi]$/.test(word) && typed === `${word.slice(0, -1)}e`) return true;
  return word.length >= 3 && typed.length > word.length && typed.length - word.length <= 3 && typed.startsWith(word);
}

/** The shorter forms a typed word may stand for when it is a plural: "szczupaki" → "szczupak", "szczupa", "szczup". */
export function singularStems(typed: string): string[] {
  const stems: string[] = [];
  // Words only: "2026-09" is a month, not a plural of "2026".
  if (!/^\p{L}+$/u.test(typed)) return stems;
  for (let cut = 1; cut <= 3 && typed.length - cut >= 4; cut += 1) stems.push(typed.slice(0, -cut));
  return stems;
}
