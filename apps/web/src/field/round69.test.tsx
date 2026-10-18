import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate, type Trip } from "@stillwater/shared";
import { setLang } from "../i18n";
import { TripMonthHead } from "./TripMonthHead";
import { leaveDeleted, leftBackTo } from "./leaveDeleted";

const trip = (id: string, date: string): Trip => ({ id, date, spotId: "own-lake", title: "", note: "" }) as Trip;

describe("round 69: a month's outings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 10));
  });
  afterEach(() => {
    vi.useRealTimers();
    setLang("en");
  });

  it("counts an outing still to come, and today's before its first fish, as planned", () => {
    const today = localDate(new Date());
    const trips = [trip("a", "2026-10-07"), trip("b", "2026-10-10"), trip("c", today), trip("d", "2026-10-24")];
    const fish = (id: string) => (id === "a" ? 2 : 0);
    expect(renderToStaticMarkup(<TripMonthHead month="2026-10" trips={trips} fishOn={fish} />)).toContain("2 outings · 2 planned · 2 fish");
  });

  it("names a month of plans only by its plans", () => {
    const html = renderToStaticMarkup(<TripMonthHead month="2026-10" trips={[trip("d", "2026-10-24")]} fishOn={() => 0} />);
    expect(html).toContain("1 planned");
    expect(html).not.toContain("outing");
    setLang("pl");
    expect(renderToStaticMarkup(<TripMonthHead month="2026-10" trips={[trip("d", "2026-10-24"), trip("e", "2026-10-25")]} fishOn={() => 0} />)).toContain("2 zaplanowane");
  });

  it("counts today's outing once it has a fish", () => {
    const today = localDate(new Date());
    expect(renderToStaticMarkup(<TripMonthHead month="2026-10" trips={[trip("c", today)]} fishOn={() => 1} />)).toContain("1 outing · 1 fish");
  });
});

describe("round 69: leaving a deleted page", () => {
  beforeEach(() => vi.stubGlobal("window", { location: { pathname: "/spots/pine", search: "" } }));
  afterEach(() => vi.unstubAllGlobals());

  it("takes the gone page's place when it wasn't opened from a list", () => {
    const navigate = vi.fn();
    leaveDeleted(navigate, null, "/spots");
    expect(navigate).toHaveBeenCalledWith("/spots", { replace: true });
    expect(leftBackTo("/spots/pine")).toBe(false);
  });
});
