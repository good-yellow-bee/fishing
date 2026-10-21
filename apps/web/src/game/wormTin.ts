import { localDate, type LakeSeason } from "@stillwater/shared";
import { readAngler, writeAngler } from "./anglerStore";
import { rainedYesterday } from "./logic";

/** Kept per angler, as the groundbait bag is, so another angler on the same browser digs their own. */
export function wormTinKey(userId: string) {
  return `stillwater.worms.${userId}.v1`;
}
/** Worms dug on a day's first visit: the tin is topped up to this many. */
export const WORM_TIN_DAILY = 3;
/** After a night that ended in rain the worms come up on the wet grass, and the tin is topped up to this many. */
export const WORM_TIN_WET = 5;

/** How many worms the tin is topped up to on the day of `now`. */
export function wormsDug(now: Date) {
  return rainedYesterday(now) ? WORM_TIN_WET : WORM_TIN_DAILY;
}

const wormsIn = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(WORM_TIN_WET, Math.max(0, Math.floor(n))) : null);

/**
 * The tin as kept: its worms, the day it was last topped up, and the day a worm last went in, which is later when one was bought on a visit past midnight.
 * That keeps the whole tin fresh in summer, the older worms too, rather than letting a worm just paid for die.
 */
type Tin = { worms: number; day: string; kept: string };

function readTin(userId: string): Tin | null {
  return readAngler(wormTinKey(userId), (raw) => {
    const tin = raw as { worms?: unknown; day?: unknown; kept?: unknown } | null;
    const worms = wormsIn(tin?.worms);
    const day = typeof tin?.day === "string" ? tin.day : "";
    return worms === null ? null : { worms, day, kept: typeof tin?.kept === "string" ? tin.kept : day };
  });
}

/**
 * What the tin holds now: as last seen, topped up to the day's dug worms on the first visit of a day.
 * In summer's heat the worms that went in on an earlier day have died by then, judged by the season when the angler comes back,
 * so the tin holds only the day's dig; `died` is how many fewer that leaves than the tin held.
 * With a place in the shack's cool worm bin (`binned`), yesterday's worms are still alive, and die the day after.
 */
export function loadTin(userId: string, now = new Date(), season?: LakeSeason, binned = false): { worms: number; died: number } {
  const today = localDate(now);
  const tin = readTin(userId);
  if (tin && tin.day === today) return { worms: tin.worms, died: 0 };
  const dug = wormsDug(now);
  const held = tin?.worms ?? 0;
  const summer = season === "summer";
  const binKept = summer && binned && tin?.kept === localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12));
  const worms = summer && tin?.kept !== today && !binKept ? dug : Math.max(dug, held);
  // Yesterday's worms left over past the day's dig stay yesterday's, so the bin keeps them only the one day.
  writeAngler(wormTinKey(userId), { worms, day: today, kept: binKept && held > dug ? tin!.kept : today });
  return { worms, died: Math.max(0, held - worms) };
}

/** Keeps what the tin holds, under the day it was last topped up, so a visit running past midnight doesn't spend the next day's worms. */
export function saveTin(userId: string, worms: number, now = new Date()) {
  const tin = readTin(userId);
  const today = localDate(now);
  writeAngler(wormTinKey(userId), { worms, day: tin?.day ?? today, kept: tin && worms <= tin.worms ? tin.kept : today });
}
