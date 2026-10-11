import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TackleList } from "./TackleList";
import { TackleProvider } from "./TackleState";

// Newer Node ships its own empty `localStorage` global, so borrow a real one.
const browser = new JSDOM("", { url: "http://localhost" });

describe("tackle list", () => {
  beforeAll(() => vi.stubGlobal("localStorage", browser.window.localStorage));
  afterAll(() => vi.unstubAllGlobals());

  it("tags each lure with its class and leaves tools untagged", () => {
    const page = JSDOM.fragment(
      renderToStaticMarkup(
        <TackleProvider>
          <TackleList tripId="trip-duck" />
        </TackleProvider>,
      ),
    );
    const rows = [...page.querySelectorAll(".tackle-row")].map((row) => [
      row.querySelector("span")?.textContent,
      row.querySelector(".lure-tag")?.textContent ?? null,
    ]);
    expect(rows).toEqual([
      ["Popper", "Topwater"],
      ["Nightcrawlers", "Live bait"],
      ["Size 8 hooks", "Float rig"],
      ["Pencil bobbers", "Float rig"],
      ["Hemostats", null],
    ]);
  });
});
