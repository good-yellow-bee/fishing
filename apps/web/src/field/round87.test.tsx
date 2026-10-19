import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { setLang } from "../i18n";
import { PL } from "../i18n/pl";
import { MonthBars } from "./MonthBars";
import { foldName, twinName } from "./spotOrder";

const fish = (id: string, month: number) =>
  ({ id, species: "Zander", lure: "Jig", spotId: "home", tripId: null, caughtAt: new Date(2026, month - 1, 10, 9).toISOString(), measure: { kind: "length", inches: 20 }, note: "", weather: null }) as unknown as CatchEntry;

afterEach(() => setLang("en"));

describe("round 87: waters a search can't tell apart are twins", () => {
  it("folds accents, ł, case and spaces as the search does", () => {
    expect(twinName("Śniardwy", "sniardwy ")).toBe(true);
    expect(twinName("Jezioro Łańskie", "jezioro  lanskie")).toBe(true);
    expect(twinName("Pine Lake", "Pine Pond")).toBe(false);
    expect(foldName(" Wisła ")).toBe("wisla");
  });
});

describe("round 87: a month inside a Polish sentence", () => {
  it("is written in lower case, while its bar keeps the capital", () => {
    setLang("pl");
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MonthBars catches={[fish("a", 9), fish("b", 9), fish("c", 9), fish("d", 5)]} />
      </MemoryRouter>,
    );
    expect(html).toContain("Najlepszy miesiąc: wrzesień (3 z 4)");
    expect(html).toContain(">Wrzesień<");
  });
});

describe("round 87: the Waters head says two different things in Polish", () => {
  it("names the log above the page's title", () => {
    expect(PL["Waters|page eyebrow"]).toBe("Dziennik połowów");
    expect(PL["Spots"]).not.toBe("Dziennik połowów");
  });
});
