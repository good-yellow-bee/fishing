import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pendingCatches, queueCatch, rejectedCatches, syncCatches } from "./pendingCatches";
import { ApiError } from "../api";

const caught = { requestId: "1e0a0c08-7e6d-4ee2-8718-4a938773b7e1", speciesId: "golden-shiner", weight: 0.3, spot: "dock" as const };
const browser = new JSDOM("", { url: "http://localhost" });
beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => browser.window.close());

describe("pending catch submissions", () => {
  it("retains a failed request and retries the same id before removing it", async () => {
    queueCatch("angler", caught);
    await expect(syncCatches("angler", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(pendingCatches("angler")).toEqual([caught]);
    const sent: unknown[] = [];
    await syncCatches("angler", async (row) => { sent.push(row); });
    expect(sent).toEqual([caught]);
    expect(pendingCatches("angler")).toEqual([]);
  });

  it("separates accounts and deduplicates the same catch", async () => {
    queueCatch("angler", caught);
    queueCatch("angler", caught);
    expect(pendingCatches("other-angler")).toEqual([]);
    expect(pendingCatches("angler")).toHaveLength(1);
  });

  it("keeps catches added while another submission is in flight", async () => {
    queueCatch("angler", caught);
    const next = { ...caught, requestId: "1e0a0c08-7e6d-4ee2-8718-4a938773b7e2" };
    const sent: string[] = [];
    await syncCatches("angler", async (row) => {
      sent.push(row.requestId);
      if (row.requestId === caught.requestId) queueCatch("angler", next);
    });
    expect(sent).toEqual([caught.requestId, next.requestId]);
    expect(pendingCatches("angler")).toEqual([]);
  });

  it("keeps the clean flag and still syncs rows queued before it existed", async () => {
    const clean = { ...caught, requestId: "1e0a0c08-7e6d-4ee2-8718-4a938773b7e2", clean: true };
    localStorage.setItem("stillwater.pending-catches.angler", JSON.stringify([caught]));
    queueCatch("angler", clean);
    const sent: unknown[] = [];
    await syncCatches("angler", async (row) => { sent.push(row); });
    expect(sent).toEqual([caught, clean]);
    expect(sent[0]).not.toHaveProperty("clean");
  });

  it("refuses a stored clean flag that is not a boolean", () => {
    localStorage.setItem("stillwater.pending-catches.angler", JSON.stringify([{ ...caught, clean: "yes" }]));
    expect(() => pendingCatches("angler")).toThrow("could not be read");
  });

  it("surfaces corrupt storage without replacing it", () => {
    localStorage.setItem("stillwater.pending-catches.angler", "[{}]");
    expect(() => pendingCatches("angler")).toThrow("could not be read");
    expect(localStorage.getItem("stillwater.pending-catches.angler")).toBe("[{}]");
  });

  it("retains permanent rejections separately without blocking later catches", async () => {
    queueCatch("angler", caught);
    const next = { ...caught, requestId: "1e0a0c08-7e6d-4ee2-8718-4a938773b7e2" };
    queueCatch("angler", next);
    const sent: string[] = [];
    await syncCatches("angler", async (row) => {
      sent.push(row.requestId);
      if (row.requestId === caught.requestId) throw new ApiError("invalid catch", 400);
    });
    expect(sent).toEqual([caught.requestId, next.requestId]);
    expect(pendingCatches("angler")).toEqual([]);
    expect(rejectedCatches("angler")).toEqual([caught]);
  });

  it("keeps authentication and server failures queued", async () => {
    queueCatch("angler", caught);
    for (const status of [401, 429, 500]) {
      await expect(syncCatches("angler", async () => { throw new ApiError("try again", status); })).rejects.toThrow("try again");
      expect(pendingCatches("angler")).toEqual([caught]);
    }
  });
});
