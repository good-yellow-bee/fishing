// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PowerMeter } from "./PowerMeter";
import type { ScenePhase } from "./types";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let frames: FrameRequestCallback[] = [];

function frame() {
  const next = frames;
  frames = [];
  act(() => next.forEach((callback) => callback(0)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  frames = [];
  vi.unstubAllGlobals();
});

describe("PowerMeter", () => {
  it("leaves a faint mark where the last cast stopped, for aiming the next one", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    const power = { current: 0 };
    const lastCast: { current: number | null } = { current: null };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const show = (phase: ScenePhase) =>
      act(() => root!.render(<PowerMeter phase={phase} powerRef={power} lastCastRef={lastCast} accuracy={1} />));
    const ghost = () => container!.querySelector<HTMLElement>(".last-cast");

    show("idle");
    expect(ghost()).toBeNull();
    show("casting");
    power.current = 0.62;
    frame();
    lastCast.current = 0.62;
    power.current = 0;
    show("idle");
    expect(ghost()!.style.left).toBe("62%");
    show("casting");
    expect(ghost()!.style.left).toBe("62%");
  });
});
