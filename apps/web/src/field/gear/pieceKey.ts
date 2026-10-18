import { getLang, t, type Lang } from "../../i18n";

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
  const key = pieceKey(t(label));
  return lang === "pl" ? key.split(" ").map((word) => (word.length > 3 ? word.replace(/[aąeęiouy]$/, "") : word)).join(" ") : key;
}
