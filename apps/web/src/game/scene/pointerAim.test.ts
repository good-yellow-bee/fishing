// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { aimInputs, listenForWaterAim, sameAim } from "./pointerAim";

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
});

describe("water aim event order", () => {
  it("uses the first press coordinates before starting a cast without a prior move", () => {
    const surface = document.createElement("div");
    const canvas = document.createElement("canvas");
    surface.append(canvas);
    document.body.append(surface);
    let aimedX: number | null = null;
    let castX: number | null = null;
    surface.addEventListener("pointerdown", () => { castX = aimedX; });
    cleanups.push(listenForWaterAim(window, (event) => { aimedX = event.clientX; }));

    canvas.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 142 }));

    expect(castX).toBe(142);
  });

  it("updates mouse aim on moves and replaces it with the press location", () => {
    let aimedX = 0;
    cleanups.push(listenForWaterAim(window, (event) => { aimedX = event.clientX; }));
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 12 }));
    expect(aimedX).toBe(12);
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 27 }));
    expect(aimedX).toBe(27);
  });

  it("updates release aim before an already-registered release handler", () => {
    let aimedX = 0;
    let releasedX = 0;
    const release = () => { releasedX = aimedX; };
    window.addEventListener("pointerup", release);
    cleanups.push(() => window.removeEventListener("pointerup", release));
    cleanups.push(listenForWaterAim(window, (event) => { aimedX = event.clientX; }));
    document.body.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 63 }));
    expect(releasedX).toBe(63);
  });

  it("removes every listener on cleanup", () => {
    let calls = 0;
    const stop = listenForWaterAim(window, () => { calls += 1; });
    stop();
    for (const type of ["pointermove", "pointerdown", "pointerup"]) {
      document.body.dispatchEvent(new Event(type, { bubbles: true }));
    }
    expect(calls).toBe(0);
  });
});

describe("aim inputs", () => {
  const camera = (x: number) => ({ matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 2, 5, 1] } });
  it("match only while nothing the aim reads has moved", () => {
    const before = aimInputs({ x: 0.1, y: -0.2 }, camera(0), 0, 6.8, "ashore", 2);
    expect(sameAim(aimInputs({ x: 0.1, y: -0.2 }, camera(0), 0, 6.8, "ashore", 2), before)).toBe(true);
    expect(sameAim(aimInputs({ x: 0.11, y: -0.2 }, camera(0), 0, 6.8, "ashore", 2), before)).toBe(false);
    expect(sameAim(aimInputs({ x: 0.1, y: -0.2 }, camera(0.01), 0, 6.8, "ashore", 2), before)).toBe(false);
    expect(sameAim(aimInputs({ x: 0.1, y: -0.2 }, camera(0), 0.2, 6.8, "ashore", 2), before)).toBe(false);
    expect(sameAim(aimInputs({ x: 0.1, y: -0.2 }, camera(0), 0, 6.8, "anchored", 2), before)).toBe(false);
    expect(sameAim(aimInputs({ x: 0.1, y: -0.2 }, camera(0), 0, 6.8, "ashore", 3), before)).toBe(false);
    expect(sameAim(before, [])).toBe(false);
  });
});
