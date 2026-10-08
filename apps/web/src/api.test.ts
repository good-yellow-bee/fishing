import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { claimDailyRequest, getDailyRequests } from "./api";

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
  it("sends the local day with the UTC offset of that day's midnight", async () => {
    const fetchMock = stubFetch();

    await getDailyRequests("2026-10-08");
    await claimDailyRequest("shiner-dock", "2026-11-02");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/daily-requests?day=2026-10-08&offset=240",
      "/api/daily-requests/shiner-dock/claim?day=2026-11-02&offset=300",
    ]);
  });
});
