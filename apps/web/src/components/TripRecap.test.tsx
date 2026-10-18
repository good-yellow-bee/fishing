// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TripRecap } from "./TripRecap";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
});

function render(leftover: boolean, filed: { id: string; title: string } | null = null) {
  const onClose = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      <MemoryRouter>
        <TripRecap draft={{ id: "s1", date: "2026-10-18", sky: "clear", fish: [] }} leftover={leftover} filed={filed} onFile={() => {}} onClose={onClose} />
      </MemoryRouter>,
    ),
  );
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  return onClose;
}

describe("the trip recap by keyboard", () => {
  it("closes on Escape to keep fishing on today's trip", () => {
    expect(render(false)).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape once a trip is written in the book", () => {
    expect(render(true, { id: "t1", title: "Morning" })).toHaveBeenCalledTimes(1);
  });

  it("does not let an old trip go on Escape", () => {
    expect(render(true)).not.toHaveBeenCalled();
  });
});
