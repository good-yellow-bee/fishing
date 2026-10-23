// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Walkthrough } from "./Walkthrough";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("the first-cast coach's room on the scene", () => {
  it("keeps the coach's height on the scene while it shows, for an opened wait hint to stop under", async () => {
    const resized: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const surface = createRef<HTMLDivElement>();
    const box = document.createElement("div");
    document.body.append(box);
    const root = createRoot(box);
    await act(async () => {
      root.render(
        <>
          <div ref={surface} />
          <Walkthrough userId="u-room" caughtTotal={0} fishing phase="waiting" nibble={false} outcome={null} surfaceRef={surface} />
        </>,
      );
    });
    Object.defineProperty(box.querySelector(".walkthrough")!, "offsetHeight", { value: 94 });
    for (const callback of resized) callback();
    expect(surface.current!.style.getPropertyValue("--coach-h")).toBe("94px");

    await act(async () => box.querySelector<HTMLButtonElement>(".walkthrough-skip")!.click());
    expect(surface.current!.style.getPropertyValue("--coach-h")).toBe("");
    await act(async () => root.unmount());
  });
});
