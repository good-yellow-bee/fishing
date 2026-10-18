import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";

/**
 * Someone out for a paddle: a canoe goes slowly along the far shore one way, turns, and comes back,
 * the paddler dipping the blade on one side for a few strokes and then switching sides. Pure in time.
 */

/** Seconds for the canoe to go along the far shore and back. */
export const CANOE_LAP_SEC = 180;
/** How far out along the lake's ellipse the route runs, as a share of the shore's reach: well out past the swans and the drop-off. */
const ROUTE_REACH = 0.88;
/** The route's ends, as angles round the lake's middle; both lie on the far (north) side. */
const ROUTE_FROM = -2.25;
const ROUTE_TO = -0.85;
/** Seconds a stroke takes, and strokes on one side before the paddler switches. */
export const STROKE_SEC = 1.8;
const STROKES_A_SIDE = 6;

/** Out on dry, open-water days from spring to fall; the lake is frozen in winter. */
export function canoeOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season !== "winter" && sky !== "rain" && sky !== "fog";
}

/** A point on the far-shore route, 0 at its west end and 1 at its east end. */
export function canoeRoute(u: number) {
  const angle = ROUTE_FROM + (ROUTE_TO - ROUTE_FROM) * u;
  return { x: LAKE_RX * ROUTE_REACH * Math.cos(angle), z: LAKE_CENTER_Z + LAKE_RZ * ROUTE_REACH * Math.sin(angle) };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return k * k * (3 - 2 * k);
}

export type CanoePose = {
  x: number;
  z: number;
  /** Which way the bow points; the bow is the model's +z. */
  yaw: number;
  /** Where the paddle is through its stroke: -1 reached forward, 1 pulled back. */
  stroke: number;
  /** Which side the blade is in the water on: 1 the paddler's right, -1 the left. */
  side: 1 | -1;
};

/**
 * The canoe `time` seconds in. It eases to a stop at each end of the route, swings round to face
 * the other way while it is slow, and sets off back.
 */
export function canoeAt(time: number): CanoePose {
  const phase = (2 * Math.PI * time) / CANOE_LAP_SEC;
  const u = 0.5 - 0.5 * Math.cos(phase);
  const here = canoeRoute(u);
  const ahead = canoeRoute(Math.min(1, u + 0.01));
  const behind = canoeRoute(Math.max(0, u - 0.01));
  const eastward = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  // Eastbound while sin(phase) > 0. Turn round only while slow, near the ends.
  const back = smoothstep(0.12, -0.12, Math.sin(phase));
  const yaw = eastward + Math.PI * back;
  const strokes = time / STROKE_SEC;
  const side = Math.floor(strokes / STROKES_A_SIDE) % 2 === 0 ? 1 : -1;
  return { x: here.x, z: here.z, yaw, stroke: -Math.cos(2 * Math.PI * strokes), side };
}
