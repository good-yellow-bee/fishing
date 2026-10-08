import type { LakeHour, Sky, SpotId, StanceId } from "@stillwater/shared";
import type { FishSpecies } from "@stillwater/shared";

export type BeginCastRequest = {
  aimX: number; aimZ: number; stance: StanceId; anglerX: number; anglerZ: number; power: number; lure?: string;
};
export type CastAttempt = {
  attemptId: string; species: FishSpecies; weight: number; seed: number; sky: Sky; hour: LakeHour; hookAt: string; expiresAt: string; spot: SpotId;
};
export type FightTraceSample = { atMs: number; reeling: boolean; steering: -1 | 0 | 1; pumping: boolean };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init.headers } });
  const body = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body ? body.error ?? "Request failed" : "Request failed");
  return body as T;
}

export function beginCast(body: BeginCastRequest, signal?: AbortSignal) {
  return request<CastAttempt>("/api/casts", { method: "POST", body: JSON.stringify(body), signal });
}

export function hookCast(attemptId: string, signal?: AbortSignal) {
  return request<CastAttempt>(`/api/casts/${encodeURIComponent(attemptId)}/hook`, { method: "POST", body: "{}", signal });
}
