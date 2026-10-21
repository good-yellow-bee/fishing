import { SPOT_IDS, daysBetween, localDate, type SpotId } from "@stillwater/shared";
import { readAngler, writeAngler } from "./anglerStore";

/** Kept per angler apart from the swim, which is gone two days after its last handful while a run of days can outlast it. */
export function prebaitKey(userId: string) {
  return `stillwater.prebait.${userId}.v1`;
}
/** A bank groundbaited this many days running, counting today, is a regular feeding spot: its feeders expect the day's first handful. */
export const PREBAIT_DAYS = 3;

/** The bank groundbaited last, the local day it was, how many days running it has been, and the day a fresh swim there last came built. Baiting another bank starts a new run there. */
export type PrebaitRun = { spot: SpotId; day: string; days: number; built?: string };

export function loadPrebait(userId: string): PrebaitRun | null {
  return readAngler(prebaitKey(userId), (raw) => {
    const run = raw as Partial<PrebaitRun> | null;
    return run && (SPOT_IDS as readonly unknown[]).includes(run.spot) && typeof run.day === "string" && Number.isInteger(run.days) && run.days! >= 1
      ? { spot: run.spot!, day: run.day, days: run.days!, ...(typeof run.built === "string" ? { built: run.built } : {}) }
      : null;
  });
}

export function savePrebait(userId: string, run: PrebaitRun) {
  writeAngler(prebaitKey(userId), run);
}

/** The run once a handful goes in at `spot`, whether it is the day's first there, and whether the bank is a regular feeding spot whose fresh swim has not yet come built today. */
export function baitDay(run: PrebaitRun | null, spot: SpotId, now: Date): { next: PrebaitRun; newDay: boolean; regular: boolean } {
  const today = localDate(now);
  if (run?.spot === spot && run.day === today) return { next: run, newDay: false, regular: run.days >= PREBAIT_DAYS && run.built !== today };
  const days = run?.spot === spot && daysBetween(run.day, today) === 1 ? run.days + 1 : 1;
  return { next: { spot, day: today, days }, newDay: true, regular: days >= PREBAIT_DAYS };
}
