// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { takeLook } from "./scene/photoLook";
import { useGamepad } from "./useGamepad";

let root: Root;
let container: HTMLDivElement;
let frames: FrameRequestCallback[] = [];
let seen: ReturnType<typeof useGamepad> | null = null;

function Probe() {
  seen = useGamepad();
  return null;
}

function step(now: number) {
  const due = frames;
  frames = [];
  act(() => due.forEach((frame) => frame(now)));
}

const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal("cancelAnimationFrame", () => (frames = []));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  frames = [];
  pad.buttons[0] = { pressed: false, value: 0 };
  pad.axes = [0, 0, 0, 0];
  takeLook();
});

describe("useGamepad", () => {
  it("reports a connected pad and replays A as Space on the window", () => {
    let pads: unknown[] = [];
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    const keys: string[] = [];
    const listen = (event: KeyboardEvent) => keys.push(`${event.type}:${event.code}`);
    window.addEventListener("keydown", listen);
    window.addEventListener("keyup", listen);
    act(() => root.render(<Probe />));
    step(16);
    expect(seen?.connected).toBe(false);
    pads = [pad];
    pad.buttons[0] = { pressed: true, value: 1 };
    step(32);
    expect(seen?.connected).toBe(true);
    pad.buttons[0] = { pressed: false, value: 0 };
    step(48);
    expect(keys).toEqual(["keydown:Space", "keyup:Space"]);
    window.removeEventListener("keydown", listen);
    window.removeEventListener("keyup", listen);
  });

  it("turns and zooms the view with the sticks in photo mode, and moves no cursor", () => {
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    function Looker() {
      seen = useGamepad(true, true);
      return null;
    }
    act(() => root.render(<Looker />));
    step(16);
    takeLook();
    pad.axes = [0, 1, 1, 0];
    step(116);
    const look = takeLook();
    expect(look.yaw).toBeLessThan(0);
    expect(look.zoom).toBeGreaterThan(1);
    expect(seen?.cursor).toBeNull();
  });

  it("aims with the arrow keys when there is no controller, and leaves them alone when told to", () => {
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [] });
    let aim = true;
    function Aimer() {
      seen = useGamepad(true, false, aim);
      return null;
    }
    const moves: number[] = [];
    const listen = (event: PointerEvent) => moves.push(event.clientX);
    window.addEventListener("pointermove", listen);
    act(() => root.render(<Aimer />));
    step(16);
    const press = new KeyboardEvent("keydown", { code: "ArrowRight", key: "ArrowRight", bubbles: true, cancelable: true });
    window.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    step(116);
    expect(seen?.cursor?.x).toBeGreaterThan(window.innerWidth / 2);
    expect(moves.length).toBe(1);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight", key: "ArrowRight", bubbles: true }));
    step(216);
    expect(moves.length).toBe(1);
    // In a fight the arrows steer instead: no cursor move, and the key is left for the game.
    aim = false;
    act(() => root.render(<Aimer />));
    const steer = new KeyboardEvent("keydown", { code: "ArrowLeft", key: "ArrowLeft", bubbles: true, cancelable: true });
    window.dispatchEvent(steer);
    expect(steer.defaultPrevented).toBe(false);
    step(316);
    expect(moves.length).toBe(1);
    window.removeEventListener("pointermove", listen);
  });
});
