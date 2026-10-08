import { SPOT_IDS, type CatchSubmission } from "@stillwater/shared";
import { ApiError } from "../api";

function key(userId: string) {
  return `stillwater.pending-catches.${userId}`;
}

function isSubmission(value: unknown): value is CatchSubmission {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.requestId === "string" && row.requestId.length <= 80 &&
    typeof row.speciesId === "string" && typeof row.weight === "number" && Number.isFinite(row.weight) &&
    SPOT_IDS.some((spot) => spot === row.spot) && (row.clean === undefined || typeof row.clean === "boolean");
}

export function pendingCatches(userId: string): CatchSubmission[] {
  const raw = localStorage.getItem(key(userId));
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || !rows.every(isSubmission)) throw new Error("The pending catches could not be read.");
  return rows;
}

export function queueCatch(userId: string, catchRequest: CatchSubmission) {
  const rows = pendingCatches(userId);
  if (rows.some((row) => row.requestId === catchRequest.requestId)) return;
  localStorage.setItem(key(userId), JSON.stringify([...rows, catchRequest]));
}

export function rejectedCatches(userId: string): CatchSubmission[] {
  const raw = localStorage.getItem(`${key(userId)}.rejected`);
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || !rows.every(isSubmission)) throw new Error("The rejected catches could not be read.");
  return rows;
}

export function clearRejectedCatches(userId: string) {
  localStorage.removeItem(`${key(userId)}.rejected`);
}

/** A 400 or 409 means the server will never take this catch, so retrying it would block every later one. */
export function isPermanentRejection(error: unknown) {
  return error instanceof ApiError && (error.status === 400 || error.status === 409);
}

export function rejectCatch(userId: string, row: CatchSubmission) {
  const rejected = rejectedCatches(userId);
  if (!rejected.some((item) => item.requestId === row.requestId)) {
    localStorage.setItem(`${key(userId)}.rejected`, JSON.stringify([...rejected, row]));
  }
}

export async function syncCatches(userId: string, post: (row: CatchSubmission) => Promise<unknown>) {
  for (;;) {
    const row = pendingCatches(userId)[0];
    if (!row) return;
    try {
      await post(row);
    } catch (error) {
      if (!isPermanentRejection(error)) throw error;
      rejectCatch(userId, row);
    }
    const remaining = pendingCatches(userId).filter((item) => item.requestId !== row.requestId);
    localStorage.setItem(key(userId), JSON.stringify(remaining));
  }
}
