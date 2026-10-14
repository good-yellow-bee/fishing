/**
 * A controller plays through the same inputs as the keyboard and mouse: buttons become key presses on
 * the window and the right stick drives an on-screen cursor that sends pointer moves, so the aim, cast,
 * strike, reel and walk code needs no second path.
 *
 * Standard mapping: A (0) and the right trigger (7) are Space, B (1) is Escape, Y (3) opens the shop (E),
 * Back (8) is photo mode (H), the bumpers (4, 5) change the lure (Q, R), the left stick walks (W A S D)
 * and the right stick aims.
 */

export type PadInput = { buttons: readonly { pressed: boolean; value: number }[]; axes: readonly number[] };

/** Which keys the pad is holding down this frame. */
export type PadKeys = ReadonlySet<PadKey>;
export type PadKey = "Space" | "Escape" | "KeyE" | "KeyH" | "KeyQ" | "KeyR" | "KeyW" | "KeyA" | "KeyS" | "KeyD";

/** A stick must lean this far before it walks, so a resting stick never drifts the angler. */
export const WALK_DEADZONE = 0.4;
/** The aim stick's dead zone, smaller so fine aim is possible. */
export const AIM_DEADZONE = 0.15;
/** Cursor pixels per second at full lean. */
export const CURSOR_SPEED = 900;

const KEY_NAMES: Record<PadKey, string> = { Space: " ", Escape: "Escape", KeyE: "e", KeyH: "h", KeyQ: "q", KeyR: "r", KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d" };

function held(pad: PadInput, index: number, threshold = 0.5) {
  const button = pad.buttons[index];
  return button !== undefined && (button.pressed || button.value > threshold);
}

export function padKeys(pad: PadInput): PadKeys {
  const keys = new Set<PadKey>();
  if (held(pad, 0) || held(pad, 7)) keys.add("Space");
  if (held(pad, 1)) keys.add("Escape");
  if (held(pad, 3)) keys.add("KeyE");
  if (held(pad, 8)) keys.add("KeyH");
  if (held(pad, 4)) keys.add("KeyQ");
  if (held(pad, 5)) keys.add("KeyR");
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  if (y < -WALK_DEADZONE) keys.add("KeyW");
  if (y > WALK_DEADZONE) keys.add("KeyS");
  if (x < -WALK_DEADZONE) keys.add("KeyA");
  if (x > WALK_DEADZONE) keys.add("KeyD");
  return keys;
}

export type KeyChange = { type: "keydown" | "keyup"; code: PadKey; key: string };

/** Presses and releases between two frames, releases first so a swap never holds both. */
export function keyChanges(before: PadKeys, now: PadKeys): KeyChange[] {
  const changes: KeyChange[] = [];
  for (const code of before) if (!now.has(code)) changes.push({ type: "keyup", code, key: KEY_NAMES[code] });
  for (const code of now) if (!before.has(code)) changes.push({ type: "keydown", code, key: KEY_NAMES[code] });
  return changes;
}

/** The right stick's lean past its dead zone, rescaled so the edge of the zone is zero. */
export function aimLean(pad: PadInput): { x: number; y: number } {
  const lean = (value: number) => {
    const size = Math.abs(value);
    if (size <= AIM_DEADZONE) return 0;
    return Math.sign(value) * ((size - AIM_DEADZONE) / (1 - AIM_DEADZONE));
  };
  return { x: lean(pad.axes[2] ?? 0), y: lean(pad.axes[3] ?? 0) };
}

/** Moves the cursor by the lean over `dt` seconds, kept inside the box. Squared lean gives slow fine aim. */
export function moveCursor(
  at: { x: number; y: number },
  lean: { x: number; y: number },
  dt: number,
  box: { width: number; height: number },
) {
  const step = (value: number) => Math.sign(value) * value * value * CURSOR_SPEED * dt;
  return {
    x: Math.min(box.width - 1, Math.max(0, at.x + step(lean.x))),
    y: Math.min(box.height - 1, Math.max(0, at.y + step(lean.y))),
  };
}
