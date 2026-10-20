/** The camera's vertical field of view in degrees, as the scene was framed on a wide screen. */
export const BASE_FOV = 48;
/** Below this width-to-height the view widens, keeping the side-to-side view the base gives here. */
const NARROW_ASPECT = 0.8;
/** It never opens wider than this, past which the lake's edges start to stretch; most portrait phones reach it. */
export const MAX_FOV = 70;

const toRad = Math.PI / 180;

/** The vertical field of view for a screen `aspect` wide: the base on a wide screen (or one not yet measured), opened up on a tall phone so the lake doesn't shrink to a slot. */
export function fovFor(aspect: number) {
  if (!(aspect > 0) || aspect >= NARROW_ASPECT) return BASE_FOV;
  const wide = 2 * Math.atan((Math.tan((BASE_FOV / 2) * toRad) * NARROW_ASPECT) / aspect);
  return Math.min(MAX_FOV, wide / toRad);
}

/** While a fish is on, a phone held upright (narrower than this) can lift its view this share of its height. None now:
 * the phone's fight card sits at the top of the screen, above the fight (PA142), so the view stays as framed. */
const PHONE_ASPECT = 0.65;
export const FIGHT_LIFT = 0;

/** How far a screen `aspect` wide lifts its view while a fish is on: none on a wider screen (a tablet held upright, a desktop), where the card sits clear of the fight. */
export function fightLiftFor(aspect: number) {
  return aspect > 0 && aspect < PHONE_ASPECT ? FIGHT_LIFT : 0;
}
