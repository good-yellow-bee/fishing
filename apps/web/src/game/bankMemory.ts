import { daysBetween, localDate, type SpotId } from "@stillwater/shared";

/** Kept per angler, as the outing is, so another angler on the same browser starts with fresh banks. */
export function bankMemoryKey(userId: string) {
  return `stillwater.bankdays.${userId}.v1`;
}
/** A bank where this many fish were landed yesterday was fished hard. */
export const YESTERDAY_HARD_FISH = 8;
/** Its first this many casts today bite this much slower, while the fish there are still wary. */
export const YESTERDAY_WARY_CASTS = 5;
export const YESTERDAY_WAIT = 1.15;

type Tally = Partial<Record<SpotId, number>>;
/** One local day's fish landed and casts made at each bank. */
export type BankDay = { day: string; landed: Tally; casts: Tally };
export type BankMemory = { today: BankDay; yesterday: BankDay | null };

const fresh = (day: string): BankDay => ({ day, landed: {}, casts: {} });

function isDay(value: unknown): value is BankDay {
  const one = value as BankDay | null;
  return !!one && typeof one.day === "string" && typeof one.landed === "object" && !!one.landed && typeof one.casts === "object" && !!one.casts;
}

/** The banks' memory as of `now`: the stored day moves to yesterday when a new day starts, and anything older is forgotten. */
export function rollBankMemory(stored: unknown, now: Date): BankMemory {
  const today = localDate(now);
  const memory = stored as Partial<BankMemory> | null;
  if (!memory || !isDay(memory.today)) return { today: fresh(today), yesterday: null };
  if (memory.today.day === today) return { today: memory.today, yesterday: isDay(memory.yesterday) && daysBetween(memory.yesterday.day, today) === 1 ? memory.yesterday : null };
  return { today: fresh(today), yesterday: daysBetween(memory.today.day, today) === 1 ? memory.today : null };
}

export function loadBankMemory(userId: string, now = new Date()): BankMemory {
  try {
    return rollBankMemory(JSON.parse(localStorage.getItem(bankMemoryKey(userId)) ?? "null"), now);
  } catch {
    return rollBankMemory(null, now);
  }
}

export function saveBankMemory(userId: string, memory: BankMemory) {
  try {
    localStorage.setItem(bankMemoryKey(userId), JSON.stringify(memory));
  } catch {
    // A blocked store only means the banks forget yesterday.
  }
}

/** The memory with one more cast, or one more fish landed, at `spot` today. */
export function countAtBank(memory: BankMemory, spot: SpotId, kind: "casts" | "landed"): BankMemory {
  return { ...memory, today: { ...memory.today, [kind]: { ...memory.today[kind], [spot]: (memory.today[kind][spot] ?? 0) + 1 } } };
}

/** Whether a cast at `spot` meets fish still wary from yesterday: the bank was fished hard then, and today's first casts there are not yet spent. */
export function waryFromYesterday(memory: BankMemory, spot: SpotId): boolean {
  return (memory.yesterday?.landed[spot] ?? 0) >= YESTERDAY_HARD_FISH && (memory.today.casts[spot] ?? 0) < YESTERDAY_WARY_CASTS;
}
