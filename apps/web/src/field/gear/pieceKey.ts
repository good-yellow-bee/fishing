import { getLang, polishBook, t, type Lang } from "../../i18n";

/**
 * One tackle piece however it was written: "Spinnerbaits" and "spinnerbait" are the same piece, as are a list's
 * piece and a catch's lure. A plain final "s" goes; "glasses" keeps its "glass", and "floss" stays whole.
 */
export function pieceKey(label: string): string {
  const name = label.trim().toLowerCase().replace(/\s+/g, " ");
  // "boxes", "leeches", "brushes": the "es" came with the plural.
  if (/(sses|xes|ches|shes)$/.test(name)) return name.slice(0, -2);
  if (/ss$/.test(name)) return name;
  return name.replace(/s$/, "");
}

/**
 * A piece as it reads in `lang`, for matching what was packed against what the fish were logged under: "Rosówka"
 * packed is the "Nightcrawler" a fish took. Polish puts the plural on any word ("Nimfy pheasant tail", "Woblery"), so
 * there each word longer than three letters drops its last vowel: "nimfy" and "nimfa" both read "nimf".
 */
export function shownPieceKey(label: string, lang: Lang = getLang()): string {
  const key = pieceKey(t(bookSpelling(label)));
  return lang === "pl" ? key.split(" ").map((word) => (word.length > 3 ? word.replace(/[aąeęiouy]$/, "") : word)).join(" ") : key;
}

let spellings: { book: object; keys: Map<string, string> } | null = null;

/**
 * A piece as the dictionary spells it, so it reads the same however it was typed: "spoon " and "Spoons" are the book's
 * "Spoon", "Wahadłówka" in Polish. A name the dictionary doesn't know comes back trimmed.
 */
export function bookSpelling(label: string): string {
  const name = label.trim();
  const book = polishBook();
  if (spellings?.book !== book) {
    const keys = new Map<string, string>();
    for (const key of Object.keys(book)) if (!keys.has(key.toLowerCase())) keys.set(key.toLowerCase(), key);
    spellings = { book, keys };
  }
  const lower = name.toLowerCase().replace(/\s+/g, " ");
  // "Perches", "Boxes": the "es" came with the plural, as pieceKey takes it.
  const plural = /(ch|sh|x|ss)es$/.test(lower) ? lower.slice(0, -2) : lower.endsWith("s") ? lower.slice(0, -1) : null;
  return spellings.keys.get(lower) ?? (plural ? spellings.keys.get(plural) : undefined) ?? name;
}

/** A piece's name in the reader's language, however it was typed: "spoon " reads "Wahadłówka" in Polish. */
export function pieceName(label: string): string {
  // English keeps the angler's own spelling: only a translation needs the dictionary's.
  return getLang() === "pl" ? t(bookSpelling(label)) : t(label.trim());
}
