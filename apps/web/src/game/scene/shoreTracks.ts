import { fishById, spotAt, SPOT_LABELS, TRACK_WINDOW_MS, type LodgeTrack, type SpotId } from "@stillwater/shared";

/** Open water in front of each bank, and how far tracks spread around it. */
const TRACK_WATER: Record<SpotId, { x: number; z: number; spread: number }> = {
  dock: { x: 3, z: 2, spread: 2.6 },
  reeds: { x: -12.5, z: 3, spread: 2.4 },
  point: { x: -5.2, z: 4, spread: 1.1 },
  dropoff: { x: 6, z: -7, spread: 4 },
  inlet: { x: -17, z: -7, spread: 2 },
};

/** Seconds for one ring to open out and fade. */
export const TRACK_PULSE_SEC = 3.4;
export const TRACK_RING_MAX = 0.9;
const TRACK_OPACITY = 0.36;

/** A stable 0..1 from the catch id, so a track keeps its place across polls. */
export function trackSeed(id: string, salt = 0) {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/** Where a catch's ring sits: somewhere on its bank's water, never on the shore or another bank's water. */
export function trackAnchor(track: Pick<LodgeTrack, "id" | "spot">) {
  const water = TRACK_WATER[track.spot];
  const angle = trackSeed(track.id, 1) * Math.PI * 2;
  const reach = Math.sqrt(trackSeed(track.id, 2)) * water.spread;
  const x = water.x + Math.cos(angle) * reach;
  const z = water.z + Math.sin(angle) * reach;
  return spotAt(x, z) === track.spot ? { x, z } : { x: water.x, z: water.z };
}

/** Strong while fresh, gone once the hour is up. */
export function trackOpacity(ageMs: number) {
  if (ageMs < 0) return TRACK_OPACITY;
  if (ageMs >= TRACK_WINDOW_MS) return 0;
  return TRACK_OPACITY * (1 - ageMs / TRACK_WINDOW_MS) ** 0.7;
}

/** 0..1 through the current ring, offset per track so a busy bank doesn't pulse in step. */
export function trackPulse(id: string, time: number) {
  const t = time / TRACK_PULSE_SEC + trackSeed(id, 3);
  return t - Math.floor(t);
}

export function trackAgeLabel(ageMs: number) {
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  return minutes < 1 ? "just now" : `${minutes} min ago`;
}

/** "Mara · pike · Reeds · 12 min ago" */
export function trackLabel(track: LodgeTrack, now: number) {
  const fish = fishById(track.speciesId)?.name.toLowerCase() ?? track.speciesId;
  return `${track.displayName} · ${fish} · ${SPOT_LABELS[track.spot]} · ${trackAgeLabel(now - Date.parse(track.createdAt))}`;
}
