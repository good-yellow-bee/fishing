import { describe, expect, it } from "vitest";
import { aimLean, CURSOR_SPEED, keyChanges, moveCursor, padKeys, type PadInput } from "./gamepad";

function pad(pressed: number[] = [], axes: number[] = [0, 0, 0, 0], trigger = 0): PadInput {
  const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), value: i === 7 ? trigger : pressed.includes(i) ? 1 : 0 }));
  return { buttons, axes };
}

describe("gamepad", () => {
  it("maps A and the right trigger to Space, B to Escape, Y to the shop, Back to photo mode, the bumpers to the lure, X to the groundbait and the left trigger to a retie", () => {
    expect([...padKeys(pad([0]))]).toEqual(["Space"]);
    expect([...padKeys(pad([], undefined, 0.8))]).toEqual(["Space"]);
    expect([...padKeys(pad([], undefined, 0.3))]).toEqual([]);
    expect([...padKeys(pad([1]))]).toEqual(["Escape"]);
    expect([...padKeys(pad([3]))]).toEqual(["KeyE"]);
    expect([...padKeys(pad([8]))]).toEqual(["KeyH"]);
    expect([...padKeys(pad([4]))]).toEqual(["KeyQ"]);
    expect([...padKeys(pad([5]))]).toEqual(["KeyR"]);
    expect([...padKeys(pad([2]))]).toEqual(["KeyG"]);
    expect([...padKeys(pad([6]))]).toEqual(["KeyT"]);
  });

  it("walks with the left stick past its dead zone, diagonals included", () => {
    expect([...padKeys(pad([], [0.2, -0.3, 0, 0]))]).toEqual([]);
    expect(new Set(padKeys(pad([], [0.9, -0.9, 0, 0])))).toEqual(new Set(["KeyW", "KeyD"]));
    expect([...padKeys(pad([], [-1, 0, 0, 0]))]).toEqual(["KeyA"]);
    expect([...padKeys(pad([], [0, 1, 0, 0]))]).toEqual(["KeyS"]);
  });

  it("turns frame-to-frame changes into key presses and releases", () => {
    const changes = keyChanges(new Set(["Space", "KeyW"]), new Set(["KeyW", "KeyD"]));
    expect(changes).toEqual([
      { type: "keyup", code: "Space", key: " " },
      { type: "keydown", code: "KeyD", key: "d" },
    ]);
    expect(keyChanges(new Set(["KeyW"]), new Set(["KeyW"]))).toEqual([]);
  });

  it("aims with the right stick, still at rest and full speed at full lean", () => {
    expect(aimLean(pad([], [0, 0, 0.1, -0.12]))).toEqual({ x: 0, y: 0 });
    expect(aimLean(pad([], [0, 0, 1, -1]))).toEqual({ x: 1, y: -1 });
    const box = { width: 1280, height: 800 };
    expect(moveCursor({ x: 640, y: 400 }, { x: 1, y: 0 }, 0.1, box)).toEqual({ x: 640 + CURSOR_SPEED * 0.1, y: 400 });
    const fine = moveCursor({ x: 640, y: 400 }, { x: 0.2, y: 0 }, 0.1, box);
    expect(fine.x - 640).toBeCloseTo(CURSOR_SPEED * 0.1 * 0.04);
    expect(moveCursor({ x: 5, y: 795 }, { x: -1, y: 1 }, 1, box)).toEqual({ x: 0, y: 799 });
  });
});
