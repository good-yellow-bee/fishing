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

describe("the phone's fixed tab bar", () => {
  it("scrolls a field it partly covers clear when the field takes focus, and leaves one above it alone", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("field-tab")) return { top: 797, bottom: 844, height: 47 } as DOMRect;
      if (this.id === "low") return { top: 731, bottom: 811, height: 80 } as DOMRect;
      return { top: 400, bottom: 440, height: 40 } as DOMRect;
    });
    const scrolled: string[] = [];
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled.push(this.id);
    };
    const box = document.createElement("div");
    document.body.append(box);
    const root = createRoot(box);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/trips/new"]}>
          <LogbookProvider>
            <FieldShell>
              <input id="high" />
              <textarea id="low" />
            </FieldShell>
          </LogbookProvider>
        </MemoryRouter>,
      );
    });
    document.getElementById("high")!.focus();
    document.getElementById("low")!.focus();
    expect(scrolled).toEqual(["low"]);
    await act(async () => root.unmount());
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  });
});
