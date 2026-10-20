// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldShell } from "./FieldShell";
import { LogbookProvider } from "./LogbookState";

const css = readFileSync(`${import.meta.dirname}/field.css`, "utf8");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("the phone's sticky top bar", () => {
  it("keeps the page's scroll padding at the bar's height while the shell is up, and drops it after", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return { height: this.classList.contains("field-mobile-bar") ? 146.4 : 0 } as DOMRect;
    });
    const box = document.createElement("div");
    document.body.append(box);
    const root = createRoot(box);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/catches"]}>
          <LogbookProvider>
            <FieldShell>
              <h1>Catches</h1>
            </FieldShell>
          </LogbookProvider>
        </MemoryRouter>,
      );
    });
    expect(document.documentElement.style.getPropertyValue("--field-bar-h")).toBe("147px");
    await act(async () => root.unmount());
    expect(document.documentElement.style.getPropertyValue("--field-bar-h")).toBe("");
  });

  it("is what a field tabbed to or a heading jumped to stops below", () => {
    expect(/\nhtml:has\(\.field-mobile-bar\) \{([^}]*)\}/.exec(css)?.[1]).toContain("scroll-padding-top: var(--field-bar-h, 0px);");
    expect(/\n\.month-head\[id\] \{([^}]*)\}/.exec(css)?.[1]).toContain("scroll-margin-top: 8px;");
  });
});

describe("the phone's bars at the bottom", () => {
  it("scrolls a field tabbed to that they partly cover clear of them, and leaves other focus alone", async () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.id === "low") return { top: 731, bottom: 811 } as DOMRect;
      if (this.id === "below") return { top: 900, bottom: 940 } as DOMRect;
      return { top: 400, bottom: 440 } as DOMRect;
    });
    vi.stubGlobal("innerHeight", 844);
    document.documentElement.style.scrollPaddingBottom = "56px";
    const scrolled: [string, ScrollIntoViewOptions | boolean | undefined][] = [];
    Element.prototype.scrollIntoView = function (this: Element, how?: ScrollIntoViewOptions | boolean) {
      scrolled.push([this.id, how]);
    };
    const box = document.createElement("div");
    document.body.append(box);
    const root = createRoot(box);
    try {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={["/trips/new"]}>
            <LogbookProvider>
              <FieldShell>
                <input id="high" />
                <textarea id="low" />
                <input id="below" />
              </FieldShell>
            </LogbookProvider>
          </MemoryRouter>,
        );
      });
      const tabTo = (id: string) => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
        document.getElementById(id)!.focus();
      };
      tabTo("high");
      document.getElementById("low")!.focus({ preventScroll: true });
      tabTo("below");
      tabTo("low");
      expect(scrolled).toEqual([["low", { block: "nearest" }]]);
    } finally {
      await act(async () => root.unmount());
      delete (Element.prototype as Partial<Element>).scrollIntoView;
      document.documentElement.style.scrollPaddingBottom = "";
      vi.unstubAllGlobals();
    }
  });
});

describe("arriving in the field log from the lake", () => {
  it("focuses the page's heading after a link in, and leaves a page load alone", async () => {
    const { Link, Route, Routes } = await import("react-router-dom");
    const shell = (
      <LogbookProvider>
        <FieldShell>
          <h1>Catches</h1>
        </FieldShell>
      </LogbookProvider>
    );
    const box = document.createElement("div");
    document.body.append(box);
    const root = createRoot(box);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/play"]}>
          <Routes>
            <Route path="/play" element={<Link to="/catches">Field log</Link>} />
            <Route path="/catches" element={shell} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await act(async () => box.querySelector("a")!.click());
    expect(document.activeElement?.textContent).toBe("Catches");
    await act(async () => root.unmount());

    const again = createRoot(box);
    await act(async () => {
      again.render(<MemoryRouter initialEntries={["/catches"]}>{shell}</MemoryRouter>);
    });
    expect(document.activeElement).toBe(document.body);
    await act(async () => again.unmount());
  });
});
