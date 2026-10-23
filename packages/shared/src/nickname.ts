/** Lake words a new player's nickname is made from ("Heron 4821"), so no one's real name or email shows on the board. */
export const LAKE_WORDS = ["Heron", "Otter", "Loon", "Osprey", "Kingfisher", "Beaver", "Dragonfly", "Swan", "Grebe", "Willow", "Reed", "Frog"] as const;

export const NICKNAME_MAX = 24;

/** A lake word and four digits; `word` names the word in the reader's language. */
export function lakeNickname(random: () => number = Math.random, word: (english: string) => string = (english) => english): string {
  const pick = LAKE_WORDS[Math.floor(random() * LAKE_WORDS.length)]!;
  return `${word(pick)} ${1000 + Math.floor(random() * 9000)}`;
}

/** A typed nickname trimmed and cut to 24 characters, an emoji counted as one; empty when nothing is left. */
export function cleanNickname(name: string | null | undefined): string {
  return [...(name ?? "").trim()].slice(0, NICKNAME_MAX).join("").trim();
}
