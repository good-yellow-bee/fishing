// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffectsNotice } from "./effectsNotice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function Notice({ at, busy }: { at: number; busy: boolean }) {
  return useEffectsNotice(at, busy, 5000) ? <p>notice</p> : null;
}

const shown = () => host.textContent === "notice";
const render = (at: number, busy: boolean) => act(() => root.render(<Notice at={at} busy={busy} />));

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("the effects notice", () => {
  it("shows for five seconds after a step-down", () => {
    render(0, false);
    expect(shown()).toBe(false);
    render(100, false);
    expect(shown()).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(shown()).toBe(false);
  });

  it("waits for a fight to end instead of covering the fight card, then shows once", () => {
    render(100, true);
    expect(shown()).toBe(false);
    render(100, false);
    expect(shown()).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    render(100, true);
    render(100, false);
    expect(shown()).toBe(false);
  });

  it("steps aside when a bite comes while it shows, and does not come back for the same step-down", () => {
    render(100, false);
    expect(shown()).toBe(true);
    render(100, true);
    expect(shown()).toBe(false);
    render(100, false);
    expect(shown()).toBe(false);
    render(200, false);
    expect(shown()).toBe(true);
  });
});
