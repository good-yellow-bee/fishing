import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { claimDailyRequest, dayQuery, getDailyRequests } from "./api";

let zone: string | undefined;
beforeAll(() => {
  zone = process.env.TZ;
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});
afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({ day: "", requests: [] })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("daily requests client", () => {
  it("sends the local day with the instants of its midnight and the next", async () => {
    const fetchMock = stubFetch();

    await getDailyRequests("2026-10-08");
    await claimDailyRequest("shiner-dock", "2026-11-02");
    // Clocks fall back during November 1, so that local day runs 25 hours.
    await claimDailyRequest("shiner-dock", "2026-11-01");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/daily-requests?day=2026-10-08&from=2026-10-08T04%3A00%3A00.000Z&to=2026-10-09T04%3A00%3A00.000Z",
      "/api/daily-requests/shiner-dock/claim?day=2026-11-02&from=2026-11-02T05%3A00%3A00.000Z&to=2026-11-03T05%3A00%3A00.000Z",
      "/api/daily-requests/shiner-dock/claim?day=2026-11-01&from=2026-11-01T04%3A00%3A00.000Z&to=2026-11-02T05%3A00%3A00.000Z",
    ]);
  });

  it("uses the first instant of a day whose midnight is skipped", () => {
    process.env.TZ = "America/Santiago";
    try {
      const query = new URLSearchParams(dayQuery("2026-09-06"));
      expect(query.get("from")).toBe("2026-09-06T04:00:00.000Z");
      expect(query.get("to")).toBe("2026-09-07T03:00:00.000Z");
    } finally {
      process.env.TZ = "America/New_York";
    }
  });
});
