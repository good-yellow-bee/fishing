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

describe("the trip recap's stats", () => {
  it("hold only terms and answers, with the heaviest fish's kind as a second answer", () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const fish = { id: "c1", speciesId: "perch", speciesName: "Perch", weight: 0.8, spot: "dock" as const, hour: "day" as const, first: false, clean: true };
    act(() =>
      root!.render(
        <MemoryRouter>
          <TripRecap draft={{ id: "s1", date: "2026-10-18", sky: "clear", fish: [fish] }} leftover={false} filed={null} onFile={() => {}} onClose={() => {}} />
        </MemoryRouter>,
      ),
    );
    const groups = [...host.querySelectorAll(".trip-recap-stats > div")];
    expect(groups.flatMap((group) => [...group.children].map((child) => child.tagName)).every((tag) => tag === "DT" || tag === "DD")).toBe(true);
    expect(host.querySelector(".trip-recap-of")?.textContent).toBe("Perch");
  });
});
