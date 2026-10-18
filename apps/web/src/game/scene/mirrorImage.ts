import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, inLake, type LakeHour, type Sky as WeatherSky } from "@stillwater/shared";

type Vec3 = readonly [number, number, number];
type Eye = { x: number; y: number; z: number };

/** Tree models stand this tall per unit of scale, their crown this wide, and the crown starts this far up. */
export const TREE_TALL = 1.25;
export const CROWN_RADIUS = 0.4;
export const CROWN_FROM = 0.35;
export const TRUNK_RADIUS = 0.06;

/** How clearly still water mirrors the bank under each sky: rain breaks it up, fog washes it out. */
const SKY_MIRROR: Record<WeatherSky, number> = { clear: 0.7, "partly-cloudy": 0.64, overcast: 0.52, fog: 0.14, rain: 0 };
/** The air is stillest at dawn and dusk; at night only the darkest shapes show. */
const HOUR_MIRROR: Record<LakeHour, number> = { dawn: 1.15, day: 0.85, dusk: 1.1, night: 0.3 };
/** Each meter a second of the day's drift takes this share off the mirror; a strong wind leaves almost none. */
export const MIRROR_WIND = 7;

/** Opacity of the bank's mirror image on the lake. */
export function bankMirrorStrength(hour: LakeHour, sky: WeatherSky, wind: { x: number; z: number }) {
  const calm = Math.max(0, 1 - Math.hypot(wind.x, wind.z) * MIRROR_WIND);
  return SKY_MIRROR[sky] * HOUR_MIRROR[hour] * calm;
}

/** Where the eye sees a point's mirror image on the water plane (y = 0). */
export function mirrorPoint(point: Vec3, eye: Eye) {
  const t = eye.y / (eye.y + point[1]);
  return { x: eye.x + (point[0] - eye.x) * t, z: eye.z + (point[2] - eye.z) * t, t };
}

export type MirrorBlob = {
  /** Centre of the mirrored crown on the water. */
  x: number;
  z: number;
  /** Half length along the line toward the eye, and half width across it, in meters. */
  along: number;
  across: number;
  /** Heading of the long axis in the x-z plane, radians from +x toward +z. */
  angle: number;
};

export type TreeMirror = { crown: MirrorBlob; trunk: { from: { x: number; z: number }; to: { x: number; z: number }; width: number } };

/** A tree's mirror image on the water as seen from the eye, or null when all of it would lie on the bank. */
export function treeMirror(base: Vec3, scale: number, eye: Eye): TreeMirror | null {
  if (eye.y <= 0) return null;
  const tall = TREE_TALL * scale;
  const at = (y: number) => mirrorPoint([base[0], y, base[2]], eye);
  const tip = at(tall);
  if (!inLake(tip.x, tip.z)) return null;
  const low = at(tall * CROWN_FROM);
  const mid = at(tall * (CROWN_FROM + 1) * 0.5);
  const foot = at(0);
  return {
    crown: {
      x: (low.x + tip.x) / 2,
      z: (low.z + tip.z) / 2,
      along: Math.hypot(tip.x - low.x, tip.z - low.z) / 2,
      across: CROWN_RADIUS * scale * mid.t,
      angle: Math.atan2(tip.z - low.z, tip.x - low.x),
    },
    trunk: { from: { x: foot.x, z: foot.z }, to: { x: low.x, z: low.z }, width: TRUNK_RADIUS * 2 * scale * low.t },
  };
}

/** A hill's mirror: the bulge from its near foot up to its top, or null when it lands off the lake. */
export function hillMirror(center: Vec3, radii: Vec3, eye: Eye): MirrorBlob | null {
  if (eye.y <= 0) return null;
  const top = mirrorPoint([center[0], center[1] + radii[1], center[2]], eye);
  if (!inLake(top.x, top.z)) return null;
  const foot = mirrorPoint([center[0], 0, center[2] + radii[2] * 0.6], eye);
  const mid = mirrorPoint([center[0], center[1], center[2]], eye);
  return {
    x: (foot.x + top.x) / 2,
    z: (foot.z + top.z) / 2,
    along: Math.hypot(top.x - foot.x, top.z - foot.z) / 2,
    across: radii[0] * mid.t,
    angle: Math.atan2(top.z - foot.z, top.x - foot.x),
  };
}

/** Pixels across the mirror canvas, which spans the lake's bounding box. */
export const MIRROR_PX = 256;
export const MIRROR_SPAN_X = LAKE_RX * 2;
export const MIRROR_SPAN_Z = LAKE_RZ * 2;
export const MIRROR_PY = Math.round((MIRROR_PX * MIRROR_SPAN_Z) / MIRROR_SPAN_X);

/** World x-z to the mirror canvas: the far (north) shore at the top, as the lake's uv lays it out. */
export function mirrorCanvasPoint(x: number, z: number) {
  return { px: (x / MIRROR_SPAN_X + 0.5) * MIRROR_PX, py: ((z - LAKE_CENTER_Z) / MIRROR_SPAN_Z + 0.5) * MIRROR_PY };
}

/** The eye moved far enough that the mirror should be painted again. */
export function mirrorStale(last: Eye | null, eye: Eye, meters = 1.2) {
  return !last || Math.hypot(last.x - eye.x, last.y - eye.y, last.z - eye.z) > meters;
}
