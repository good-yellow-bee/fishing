/** How many of a day's heaviest fish make an angler's bag. */
export const BAG_SIZE = 5;

/** The UTC day a moment falls in, one bag race for the whole lodge: from its midnight to the next. */
export function bagDay(at: Date = new Date()): { from: string; to: string } {
  const from = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}

/** The bag's fish, heaviest first, at most BAG_SIZE of them. */
export function bagOf(weights: readonly number[]): number[] {
  return [...weights].sort((a, b) => b - a).slice(0, BAG_SIZE);
}

/** The bag's total weight, to the hundredth of a pound. */
export function bagTotal(weights: readonly number[]): number {
  return Math.round(bagOf(weights).reduce((sum, weight) => sum + weight, 0) * 100) / 100;
}

/** What a fish must outweigh to raise a full bag: its lightest fish; null while the bag has room for any fish. */
export function bagToBeat(weights: readonly number[]): number | null {
  const bag = bagOf(weights);
  return bag.length < BAG_SIZE ? null : bag[bag.length - 1]!;
}

/** The bag with one more fish landed, and how much that fish raised it (0 when it was too light to make it). */
export function addToBag(weights: readonly number[], weight: number): { bag: number[]; raisedBy: number } {
  const bag = bagOf([...weights, weight]);
  return { bag, raisedBy: Math.round((bagTotal(bag) - bagTotal(weights)) * 100) / 100 };
}
