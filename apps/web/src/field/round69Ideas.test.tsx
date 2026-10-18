import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Logbook } from "@stillwater/shared";
import { NEWS_ID, NEWS_ITEMS } from "../game/whatsNew";
import { PL } from "../i18n/pl";
import { MergeWater } from "./MergeWater";

vi.mock("./LogbookState", () => {
  const book: Logbook = {
    spots: [
      { id: "own-lake", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" },
      { id: "east", name: "East Pond", waterType: "pond", notes: "", bestConditions: "" },
    ] as Logbook["spots"],
    trips: [
      { id: "t1", date: "2026-10-01", spotId: "own-lake", title: "", note: "" },
      { id: "t2", date: "2026-10-05", spotId: "east", title: "", note: "" },
    ] as Logbook["trips"],
    catches: [
      { id: "c1", species: "Zander", measure: { kind: "length", inches: 20 }, lure: "Jig", spotId: "own-lake", tripId: "t1", caughtAt: "2026-10-01T08:00:00.000Z", note: "", weather: null },
      { id: "c2", species: "Zander", measure: { kind: "length", inches: 20 }, lure: "Jig", spotId: "east", tripId: "t2", caughtAt: "2026-10-05T08:00:00.000Z", note: "", weather: null },
    ],
  };
  return { useLogbook: () => ({ book, storedBook: book, changeBook: () => true }) };
});
vi.mock("./gear/TackleState", () => ({ useTackleIfAny: () => null }));

beforeEach(() => vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }));
afterEach(() => vi.unstubAllGlobals());

describe("round 69 ideas", () => {
  it("says what the kept water holds after a merge", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/spots/east?merge=own-lake"]}>
        <MergeWater spotId="east" />
      </MemoryRouter>,
    );
    expect(html).toContain("Moves 1 outing and 1 fish. Own Lake then holds 2 fish and 2 outings.");
  });

  it("has news for it, in Polish too", () => {
    expect(NEWS_ID).toBe("2026-10-18-field23");
    expect(PL[NEWS_ITEMS[0]!]).toBeTruthy();
  });
});
