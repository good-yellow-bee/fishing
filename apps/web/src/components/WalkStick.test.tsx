// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { walkStick } from "../game/scene/walkStick";
import { WalkStick } from "./WalkStick";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;

afterEach(() => {
  host?.remove();
  host = null;
});

function pointer(type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }) as MouseEvent & { pointerId: number };
  Object.defineProperty(event, "pointerId", { value: 1 });
  return event;
}

describe("WalkStick", () => {
  it("walks the way the knob is dragged and stops on release", () => {
    host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<WalkStick />));
    const stick = host.querySelector<HTMLDivElement>(".walk-stick")!;
    stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    act(() => void stick.dispatchEvent(pointer("pointerdown", 50, 10)));
    expect(walkStick.y).toBeCloseTo(1, 6);
    expect(walkStick.x).toBeCloseTo(0, 6);
    act(() => void stick.dispatchEvent(pointer("pointerup", 50, 10)));
    expect(walkStick).toEqual({ x: 0, y: 0 });
    act(() => void stick.dispatchEvent(pointer("pointerdown", 90, 50)));
    expect(walkStick.x).toBeCloseTo(1, 6);
    act(() => root.unmount());
    expect(walkStick).toEqual({ x: 0, y: 0 });
  });
});
