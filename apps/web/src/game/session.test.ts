// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSession, parseSession, saveSession, sessionSummary, sessionTitle, startSession, withSessionFish, type SessionFish } from "./session";

const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());
beforeEach(() => vi.stubGlobal("localStorage", browser.window.localStorage));
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function fish(over: Partial<SessionFish> = {}): SessionFish {
  return { id: "c1", speciesId: "perch", speciesName: "Yellow perch", weight: 0.6, spot: "dock", hour: "dusk", first: false, clean: false, ...over };
}

describe("day on the water", () => {
  it("counts the outing: heaviest, new species, clean fights", () => {
    let draft = startSession(new Date(2026, 9, 11, 17, 30), "overcast");
    expect(draft.date).toBe("2026-10-11");
    draft = withSessionFish(draft, fish({ id: "a", first: true }));
    draft = withSessionFish(draft, fish({ id: "b", speciesId: "pike", speciesName: "Northern pike", weight: 6.2, spot: "reeds", clean: true }));
    draft = withSessionFish(draft, fish({ id: "c", weight: 0.4 }));
    expect(withSessionFish(draft, fish({ id: "a" }))).toBe(draft);

    const summary = sessionSummary(draft);
    expect(summary.count).toBe(3);
    expect(summary.heaviest?.id).toBe("b");
    expect(summary.firsts.map((entry) => entry.id)).toEqual(["a"]);
    expect(summary.clean).toBe(1);
    expect(summary.bank).toBe("dock");
  });

  it("titles the trip by its usual hour, bank and the sky", () => {
    const draft = withSessionFish(startSession(new Date(2026, 9, 11, 17), "overcast"), fish());
    expect(sessionTitle(draft)).toBe("Dusk at the dock · overcast");
    expect(sessionTitle(startSession(new Date(), "fog"))).toBe("A day on the lake · fog");
  });

  it("keeps the draft per angler and refuses a broken one", () => {
    const draft = withSessionFish(startSession(new Date(2026, 9, 11), "rain"), fish());
    saveSession("ash", draft);
    expect(loadSession("ash")).toEqual(draft);
    expect(loadSession("mara")).toBeNull();
    saveSession("ash", null);
    expect(loadSession("ash")).toBeNull();
    expect(parseSession("{nope")).toBeNull();
    expect(parseSession(JSON.stringify({ ...draft, fish: [{ ...fish(), spot: "moon" }] }))).toBeNull();
  });
});
