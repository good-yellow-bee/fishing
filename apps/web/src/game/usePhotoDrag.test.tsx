// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { takeLook } from "./scene/photoLook";
import { usePhotoDrag } from "./usePhotoDrag";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;

afterEach(() => {
  host?.remove();
  host = null;
  takeLook();
});

function pointer(type: string, x: number, y: number, id = 1) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }) as MouseEvent & { pointerId: number };
  Object.defineProperty(event, "pointerId", { value: id });
  return event;
}

function mount(onTap: () => void) {
  function Pad() {
    const drag = usePhotoDrag();
    return <button type="button" {...drag.handlers} onClick={() => drag.tapped() && onTap()} />;
  }
  host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<Pad />));
  return host.querySelector("button")!;
}

describe("photo mode's drag", () => {
  it("turns the view on a drag and only a still press counts as a tap", () => {
    const onTap = vi.fn();
    const pad = mount(onTap);
    act(() => {
      pad.dispatchEvent(pointer("pointerdown", 100, 100));
      pad.dispatchEvent(pointer("pointermove", 160, 90));
      pad.dispatchEvent(pointer("pointerup", 160, 90));
      pad.click();
    });
    expect(onTap).not.toHaveBeenCalled();
    expect(takeLook().yaw).toBeLessThan(0);
    act(() => {
      pad.dispatchEvent(pointer("pointerdown", 100, 100));
      pad.dispatchEvent(pointer("pointermove", 102, 101));
      pad.dispatchEvent(pointer("pointerup", 102, 101));
      pad.click();
    });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("zooms on a pinch, and the pinch is no tap", () => {
    const onTap = vi.fn();
    const pad = mount(onTap);
    act(() => {
      pad.dispatchEvent(pointer("pointerdown", 100, 100, 1));
      pad.dispatchEvent(pointer("pointerdown", 200, 100, 2));
      pad.dispatchEvent(pointer("pointermove", 300, 100, 2));
      pad.dispatchEvent(pointer("pointerup", 300, 100, 2));
      pad.dispatchEvent(pointer("pointerup", 100, 100, 1));
      pad.click();
    });
    expect(takeLook().zoom).toBeCloseTo(0.5, 6);
    expect(onTap).not.toHaveBeenCalled();
  });
});
