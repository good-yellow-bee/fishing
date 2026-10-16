import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { localDate, sampleLogbook, shiftDate } from "@stillwater/shared";
import { formatDay } from "../format";
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

  it("says how many of the outing's fish each piece took, plural on the list or not", () => {
    const fish = (id: string, lure: string) => ({ ...sampleLogbook(new Date(2026, 9, 1)).catches[0]!, id, lure });
    const page = JSDOM.fragment(
      renderToStaticMarkup(
        <TackleProvider>
          <TackleList tripId="trip-duck" caught={[fish("a", "Popper"), fish("b", "Nightcrawler"), fish("c", "nightcrawler")]} />
        </TackleProvider>,
      ),
    );
    const took = [...page.querySelectorAll(".tackle-row")].map((row) => row.querySelector(".tackle-caught")?.textContent ?? null);
    expect(took).toEqual(["1 fish", "2 fish", null, null, null]);
  });

  it("offers only the suggested lures that are not on the list yet", () => {
    const page = JSDOM.fragment(
      renderToStaticMarkup(
        <TackleProvider>
          <TackleList tripId="trip-duck" suggest={["popper", "Spinnerbait"]} />
        </TackleProvider>,
      ),
    );
    expect([...page.querySelectorAll(".tackle-suggest button")].map((button) => button.textContent)).toEqual(["+ Spinnerbait"]);
  });

  it("offers nothing when every suggestion is packed or listed", () => {
    const page = JSDOM.fragment(
      renderToStaticMarkup(
        <TackleProvider>
          <TackleList tripId="trip-duck" suggest={["Popper"]} />
        </TackleProvider>,
      ),
    );
    expect(page.querySelector(".tackle-suggest")).toBeNull();
  });

  it("offers an empty list the bag of the last outing on or before its day", () => {
    const now = new Date();
    const trips = [...sampleLogbook(now).trips, { ...sampleLogbook(now).trips[0]!, id: "trip-new", date: shiftDate(now, 1), title: "Tomorrow" }];
    const page = JSDOM.fragment(
      renderToStaticMarkup(
        <TackleProvider>
          <TackleList tripId="trip-new" trips={trips} />
          <TackleList tripId="trip-duck" trips={trips} />
        </TackleProvider>,
      ),
    );
    expect([...page.querySelectorAll(".empty button")].map((button) => button.textContent)).toEqual([`Copy the list from Dawn patrol, ${formatDay(localDate(now))}`]);
  });
});
