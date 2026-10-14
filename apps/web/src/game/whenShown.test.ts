// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BACK_BITE_MS, whenShown } from "./whenShown";

function page(state: "hidden" | "visible") {
  const doc = new EventTarget() as EventTarget & { visibilityState: DocumentVisibilityState };
  doc.visibilityState = state;
  return doc as unknown as Document & { visibilityState: DocumentVisibilityState };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("whenShown", () => {
  it("runs at once on a page that is showing", () => {
    const fn = vi.fn();
    whenShown(fn, page("visible"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("holds while hidden, then runs a beat after the page shows again", () => {
    vi.useFakeTimers();
    const doc = page("hidden");
    const fn = vi.fn();
    whenShown(fn, doc);
    vi.advanceTimersByTime(60_000);
    expect(fn).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(BACK_BITE_MS - 1);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("can be called off while held", () => {
    vi.useFakeTimers();
    const doc = page("hidden");
    const fn = vi.fn();
    const cancel = whenShown(fn, doc);
    cancel();
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(BACK_BITE_MS * 2);
    expect(fn).not.toHaveBeenCalled();
  });
});
