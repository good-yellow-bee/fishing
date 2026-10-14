import { LAKE_CENTER_Z, LAKE_RX, type LakeHour, type LakeSeason } from "@stillwater/shared";
import type { Splash } from "./duckFlush";

/**
 * A beaver at dusk: now and then it swims across the middle of the lake towing
 * a leafy branch, a V of wake spreading behind it. A cast landing close makes
 * it slap its tail and dive, and it stays down until its next crossing.
 */
export const BEAVER_GAP_SEC = 80;
/** Seconds into each gap before it sets off, and how long a crossing takes. */
export const BEAVER_START_SEC = 10;
export const BEAVER_CROSS_SEC = 44;
/** Surfacing at the start and slipping under at the end. */
export const BEAVER_SURFACE_SEC = 1.2;
/** Half the crossing's span, metres, and the line it holds across the middle of the lake. */
const HALF_SPAN = LAKE_RX * 0.78;
export const BEAVER_LINE_Z = LAKE_CENTER_Z - 3;
const DRIFT_Z = 2;
const BOW_Z = 1.6;
export const BEAVER_SCARE_RADIUS = 5;
export const BEAVER_SPLASH_FRESH_SEC = 0.6;
/** The slap: tail up, then down on the water; then the dive. */
export const BEAVER_SLAP_SEC = 0.55;
export const BEAVER_DIVE_SEC = 0.6;
/** How long the spray ring takes to spread after the slap. */
export const BEAVER_RING_SEC = 1.4;

export type BeaverState = { mode: "swimming" } | { mode: "slapped"; since: number; slot: number; x: number; z: number; yaw: number };

export type BeaverPose = {
  x: number;
  z: number;
  yaw: number;
  /** 0 swimming at the top, 1 out of sight. */
  under: number;
  /** 0 tail flat behind, 1 raised for the slap. */
  tail: number;
  /** The slap's ring and spray spreading, 0..1; -1 when there is none. */
  splash: number;
  /** Swimming along, so the wake shows. */
  moving: boolean;
};

export function beaverOut(hour: LakeHour, season: LakeSeason) {
  return hour === "dusk" && season !== "winter";
}

function unit(slot: number, salt: number) {
  const s = Math.sin(slot * 39.7 + salt * 11.3) * 43758.5453;
  return s - Math.floor(s);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Which crossing `time` falls in, and how far into it, in seconds (negative before it sets off, past BEAVER_CROSS_SEC after). */
export function beaverSlot(time: number) {
  const slot = Math.floor(time / BEAVER_GAP_SEC);
  return { slot, into: time - slot * BEAVER_GAP_SEC - BEAVER_START_SEC };
}

/** Where along crossing `slot` it is at `into` seconds, and which way it is heading. Alternate crossings run the other way. */
export function beaverRoute(slot: number, into: number) {
  const dir = slot % 2 === 0 ? 1 : -1;
  const u = clamp01(into / BEAVER_CROSS_SEC);
  const x = dir * (-1 + 2 * u) * HALF_SPAN;
  const z = BEAVER_LINE_Z + (unit(slot, 1) * 2 - 1) * DRIFT_Z + Math.sin(u * Math.PI) * BOW_Z;
  const dx = (dir * 2 * HALF_SPAN) / BEAVER_CROSS_SEC;
  const dz = (Math.cos(u * Math.PI) * Math.PI * BOW_Z) / BEAVER_CROSS_SEC;
  return { x, z, yaw: Math.atan2(dx, dz) };
}

/** A fresh splash close by makes it slap and dive; it is back for the next crossing. */
export function stepBeaver(state: BeaverState, time: number, splash: Splash): BeaverState {
  const { slot, into } = beaverSlot(time);
  if (state.mode === "slapped") return slot !== state.slot ? { mode: "swimming" } : state;
  if (into < 0 || into > BEAVER_CROSS_SEC) return state;
  const fresh = time - splash.at >= 0 && time - splash.at < BEAVER_SPLASH_FRESH_SEC;
  const at = beaverRoute(slot, into);
  if (fresh && Math.hypot(at.x - splash.x, at.z - splash.z) < BEAVER_SCARE_RADIUS) {
    return { mode: "slapped", since: time, slot, x: at.x, z: at.z, yaw: at.yaw };
  }
  return state;
}

/** Its pose at `time`, or null while it is out of sight between crossings. */
export function beaverPose(time: number, state: BeaverState = { mode: "swimming" }): BeaverPose | null {
  if (state.mode === "slapped") {
    const since = time - state.since;
    const splash = since >= BEAVER_SLAP_SEC * 0.7 && since < BEAVER_SLAP_SEC * 0.7 + BEAVER_RING_SEC ? (since - BEAVER_SLAP_SEC * 0.7) / BEAVER_RING_SEC : -1;
    if (since >= BEAVER_SLAP_SEC + BEAVER_DIVE_SEC) {
      return splash < 0 ? null : { x: state.x, z: state.z, yaw: state.yaw, under: 1, tail: 0, splash, moving: false };
    }
    // Tail swings up through most of the slap, then cracks down flat.
    const k = since / BEAVER_SLAP_SEC;
    const tail = since < BEAVER_SLAP_SEC ? (k < 0.7 ? Math.sin((k / 0.7) * (Math.PI / 2)) : 1 - (k - 0.7) / 0.3) : 0;
    const under = since < BEAVER_SLAP_SEC ? 0 : clamp01((since - BEAVER_SLAP_SEC) / BEAVER_DIVE_SEC);
    return { x: state.x, z: state.z, yaw: state.yaw, under, tail, splash, moving: false };
  }
  const { slot, into } = beaverSlot(time);
  if (into < 0 || into > BEAVER_CROSS_SEC) return null;
  const { x, z, yaw } = beaverRoute(slot, into);
  const rise = clamp01(into / BEAVER_SURFACE_SEC);
  const sink = clamp01((BEAVER_CROSS_SEC - into) / BEAVER_SURFACE_SEC);
  const under = 1 - Math.min(rise, sink);
  return { x, z, yaw, under, tail: 0, splash: -1, moving: under < 0.5 };
}
