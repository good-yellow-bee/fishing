/** Seconds of forward whip before the lure leaves the tip. */
export const CAST_RELEASE_SEC = 0.16;

/** Rod follow-through is done shortly after this. */
export const CAST_ROD_SETTLE_SEC = 0.72;

const WAITING_ROD = 1.05;

export function castFlightSeconds(distance: number) {
  return Math.min(0.92, Math.max(0.46, 0.34 + distance * 0.052));
}

/** Horizontal progress. Leaves the rod quicker than it arrives. */
export function castAlong(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  return 1 - (1 - p) ** 1.35;
}

/** Height above the chord from the rod tip to the water. Zero at both ends. */
export function castLoft(progress: number, distance: number, power: number) {
  const p = Math.min(1, Math.max(0, progress));
  const height = Math.min(2.35, 0.55 + power * 0.95 + distance * 0.1);
  return Math.sin(Math.PI * p ** 0.68) * height;
}

export function loadedRodPitch(power: number, time: number) {
  return 0.35 - power * 1.15 + Math.sin(time * 18) * 0.012 * power;
}

export function thrownRodPitch(power: number, throwAge: number, fromPitch: number) {
  const forward = 1.58 + power * 0.28;
  if (throwAge <= CAST_RELEASE_SEC) {
    const u = Math.max(0, throwAge) / CAST_RELEASE_SEC;
    return fromPitch + (forward - fromPitch) * u * u;
  }
  const u = (throwAge - CAST_RELEASE_SEC) / (CAST_ROD_SETTLE_SEC - CAST_RELEASE_SEC);
  const damp = Math.exp(-3.4 * u);
  const wobble = Math.sin(u * Math.PI * 2.6) * 0.14 * damp;
  const settle = forward + (WAITING_ROD - forward) * (1 - Math.exp(-4.2 * u));
  return settle + wobble;
}

/** Extra body pitch: load back, then drive forward through the release. */
export function castBodyLean(power: number, charging: boolean, throwAge: number) {
  if (charging) return -0.16 * power;
  if (throwAge < 0) return 0;
  if (throwAge < CAST_RELEASE_SEC) {
    const u = throwAge / CAST_RELEASE_SEC;
    return -0.16 * power * (1 - u) + 0.2 * u * u;
  }
  return 0.2 * Math.exp(-5.5 * (throwAge - CAST_RELEASE_SEC));
}
