// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
});
