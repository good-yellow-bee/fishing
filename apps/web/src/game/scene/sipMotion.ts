/**
 * A sip from the thermos cup: while the float sits and nothing is nibbling,
 * the angler on the dock now and then lifts the cup with the free hand, holds
 * it at the mouth a moment, and sets it back. Pure functions of how long the
 * float has sat.
 */
export const SIP_FIRST_SEC = 12;
export const SIP_EVERY_SEC = 28;
export const SIP_LIFT_SEC = 0.8;
export const SIP_HOLD_SEC = 1.4;
export const SIP_LOWER_SEC = 0.9;
export const SIP_SEC = SIP_LIFT_SEC + SIP_HOLD_SEC + SIP_LOWER_SEC;
/** Above this the cup shows in the hand rather than on the planks. */
export const SIP_IN_HAND = 0.3;

/** Shared with the thermos, so the cup leaves the planks while it is in the angler's hand. */
export const sipView = { holding: false };

function smooth(u: number) {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

/** How far the arm has come up to the mouth, 0..1, `age` seconds after the float sat. */
export function sipWeight(age: number) {
  if (age < SIP_FIRST_SEC) return 0;
  const into = (age - SIP_FIRST_SEC) % SIP_EVERY_SEC;
  if (into < SIP_LIFT_SEC) return smooth(into / SIP_LIFT_SEC);
  if (into < SIP_LIFT_SEC + SIP_HOLD_SEC) return 1;
  if (into < SIP_SEC) return 1 - smooth((into - SIP_LIFT_SEC - SIP_HOLD_SEC) / SIP_LOWER_SEC);
  return 0;
}
