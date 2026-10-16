/**
 * One tackle piece however it was written: "Spinnerbaits" and "spinnerbait" are the same piece, as are a list's
 * piece and a catch's lure. A plain final "s" goes; "glasses" keeps its "glass", and "floss" stays whole.
 */
export function pieceKey(label: string): string {
  const name = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (/sses$/.test(name)) return name.slice(0, -2);
  if (/ss$/.test(name)) return name;
  return name.replace(/s$/, "");
}
