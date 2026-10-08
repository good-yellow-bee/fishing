// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatchSubmission } from "@stillwater/shared";
import { ApiError, getMe, recordCatch, type Me } from "../api";
import { pendingCatches, queueCatch, rejectedCatches } from "./pendingCatches";
import { RATE_LIMIT_RETRY_MS, useCatchSync } from "./useCatchSync";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, getMe: vi.fn(), recordCatch: vi.fn() };
});

const getMeMock = vi.mocked(getMe);
const recordMock = vi.mocked(recordCatch);
const first: CatchSubmission = { requestId: "1e0a0c08-7e6d-4ee2-8718-4a938773b7e1", speciesId: "golden-shiner", weight: 0.3, spot: "dock" };
const second: CatchSubmission = { ...first, requestId: "1e0a0c08-7e6d-4ee2-8718-4a938773b7e2" };
const saved = { id: "row", points: 3, speciesId: "golden-shiner", weight: 0.3 };

function me(userId: string): Me {
  return {
    user: { id: userId, email: `${userId}@stillwater.test`, name: userId },
    profile: { userId, displayName: userId, points: 0, lifetimePoints: 0, strength: 1, accuracy: 1, patience: 1 },
    level: 1,
    spots: { dock: true, reeds: false, point: false, dropoff: false },
    catches: [],
    speciesStats: [],
  } as Me;
}

// Node ships its own empty `localStorage` global, so borrow a real one.
const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let sync: ReturnType<typeof useCatchSync>;
const onMe = vi.fn();

function Harness({ userId }: { userId: string }) {
  sync = useCatchSync(userId, onMe);
  return null;
}

async function mount(userId = "angler") {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<Harness userId={userId} />));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("localStorage", browser.window.localStorage);
  localStorage.clear();
  getMeMock.mockResolvedValue(me("angler"));
  recordMock.mockResolvedValue(saved);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("useCatchSync", () => {
  it("queues a landed catch, posts it as its owner and refreshes points", async () => {
    await mount();
    await act(async () => expect(await sync.saveCatch(first)).toBe(true));
    expect(recordMock).toHaveBeenCalledWith(first);
    expect(pendingCatches("angler")).toEqual([]);
    expect(sync.pendingCount).toBe(0);
    expect(onMe).toHaveBeenCalledTimes(2);
  });

  it("posts directly when storage refuses the queue write", async () => {
    await mount();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(browser.window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await act(async () => expect(await sync.saveCatch(first)).toBe(true));
    expect(recordMock).toHaveBeenCalledWith(first);
    expect(sync.error).toBe("");
  });

  it("keeps retrying a catch storage refused until a direct save succeeds", async () => {
    await mount();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(browser.window.Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    recordMock.mockRejectedValueOnce(new Error("offline")).mockRejectedValueOnce(new Error("offline"));
    await act(async () => expect(await sync.saveCatch(first)).toBe(false));
    expect(sync.error).toBe("offline");
    expect(sync.pendingCount).toBe(1);
    await act(async () => { await sync.sync(); });
    expect(sync.error).toBe("offline");
    expect(sync.pendingCount).toBe(1);
    await act(async () => { await sync.sync(); });
    expect(recordMock.mock.calls.map(([row]) => row.requestId)).toEqual([first.requestId, first.requestId, first.requestId]);
    expect(sync.error).toBe("");
    expect(sync.pendingCount).toBe(0);
  });

  it("sends a refused catch along with the queued backlog when the connection returns", async () => {
    queueCatch("angler", first);
    recordMock.mockRejectedValue(new Error("offline"));
    await mount();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(browser.window.Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await act(async () => expect(await sync.saveCatch(second)).toBe(false));
    expect(sync.pendingCount).toBe(2);
    recordMock.mockResolvedValue(saved);
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await act(async () => { await Promise.resolve(); });
    const sent = recordMock.mock.calls.map(([row]) => row.requestId);
    expect(sent.slice(-2).sort()).toEqual([first.requestId, second.requestId].sort());
    expect(pendingCatches("angler")).toEqual([]);
    expect(sync.pendingCount).toBe(0);
    expect(sync.error).toBe("");
  });

  it("clears a stale error once another tab drained the queue", async () => {
    queueCatch("angler", first);
    recordMock.mockRejectedValueOnce(new Error("offline"));
    await mount();
    expect(sync.error).toBe("offline");
    localStorage.removeItem("stillwater.pending-catches.angler");
    await act(async () => { await sync.sync(); });
    expect(sync.error).toBe("");
    expect(sync.pendingCount).toBe(0);
  });

  it("shows a failed points refresh next to Retry and refreshes on retry", async () => {
    await mount();
    getMeMock.mockResolvedValueOnce(me("angler")).mockRejectedValueOnce(new Error("timeout"));
    await act(async () => { await sync.saveCatch(first); });
    expect(sync.error).toMatch(/Catch saved.*timeout/);
    onMe.mockClear();
    await act(async () => { await sync.sync(); });
    expect(onMe).toHaveBeenCalledTimes(1);
    expect(sync.error).toBe("");
  });

  it("keeps a backlog queued when another account is signed in", async () => {
    queueCatch("angler", first);
    getMeMock.mockResolvedValue(me("someone-else"));
    await mount();
    expect(recordMock).not.toHaveBeenCalled();
    expect(pendingCatches("angler")).toEqual([first]);
    expect(sync.pendingCount).toBe(1);
    expect(sync.error).toMatch(/another angler/i);
    expect(onMe).not.toHaveBeenCalled();
  });

  it("syncs a catch queued while the previous sync is still refreshing points", async () => {
    await mount();
    let release!: () => void;
    getMeMock
      .mockResolvedValueOnce(me("angler"))
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve(me("angler")); }));
    let firstSave!: Promise<boolean>;
    await act(async () => { firstSave = sync.saveCatch(first); });
    expect(recordMock).toHaveBeenCalledTimes(1);
    await act(async () => { await sync.saveCatch(second); });
    expect(recordMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
      await firstSave;
    });
    expect(recordMock.mock.calls.map(([row]) => row.requestId)).toEqual([first.requestId, second.requestId]);
    expect(pendingCatches("angler")).toEqual([]);
  });

  it("keeps a dismissed rejection dismissed after later syncs", async () => {
    await mount();
    recordMock.mockRejectedValueOnce(new ApiError("invalid catch", 400));
    await act(async () => { await sync.saveCatch(first); });
    expect(sync.rejectedCount).toBe(1);
    act(() => sync.dismissRejected());
    expect(rejectedCatches("angler")).toEqual([]);
    await act(async () => { await sync.saveCatch(second); });
    expect(sync.rejectedCount).toBe(0);
  });

  it("retries on its own once the rate-limit window passes", async () => {
    vi.useFakeTimers();
    await mount();
    recordMock.mockRejectedValueOnce(new ApiError("catch rate limit exceeded", 429));
    await act(async () => { await sync.saveCatch(first); });
    expect(pendingCatches("angler")).toEqual([first]);
    await act(async () => { await vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS - 1); });
    expect(recordMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(recordMock).toHaveBeenCalledTimes(2);
    expect(pendingCatches("angler")).toEqual([]);
  });

  function refuseQueueWrites(times = Infinity) {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let left = times;
    const real = browser.window.Storage.prototype.setItem;
    vi.spyOn(browser.window.Storage.prototype, "setItem").mockImplementation(function (this: Storage, name: string, value: string) {
      if (name === "stillwater.pending-catches.angler" && left > 0) {
        left -= 1;
        throw new DOMException("full", "QuotaExceededError");
      }
      return real.call(this, name, value);
    });
  }

  it("holds every refused catch until each one posts", async () => {
    await mount();
    refuseQueueWrites();
    recordMock.mockRejectedValue(new Error("offline"));
    await act(async () => { await sync.saveCatch(first); });
    await act(async () => { await sync.saveCatch(second); });
    expect(sync.pendingCount).toBe(2);
    recordMock.mockResolvedValue(saved);
    await act(async () => { await sync.sync(); });
    const sent = new Set(recordMock.mock.calls.slice(-2).map(([row]) => row.requestId));
    expect(sent).toEqual(new Set([first.requestId, second.requestId]));
    expect(sync.pendingCount).toBe(0);
  });

  it("keeps a catch refused while another direct post is in flight", async () => {
    await mount();
    refuseQueueWrites();
    let release!: () => void;
    recordMock.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve(saved); }));
    let firstSave!: Promise<boolean>;
    await act(async () => { firstSave = sync.saveCatch(first); });
    await act(async () => { await sync.saveCatch(second); });
    await act(async () => {
      release();
      await firstSave;
    });
    expect(recordMock.mock.calls.map(([row]) => row.requestId)).toEqual([first.requestId, second.requestId]);
    expect(sync.pendingCount).toBe(0);
  });

  it("files a refused catch the server rejects and keeps the queue moving", async () => {
    queueCatch("angler", second);
    recordMock.mockRejectedValue(new Error("offline"));
    await mount();
    refuseQueueWrites(1);
    await act(async () => { await sync.saveCatch(first); });
    recordMock.mockReset();
    recordMock.mockImplementation(async (row) => {
      if (row.requestId === first.requestId) throw new ApiError("line too light for this fish", 409);
      return saved;
    });
    await act(async () => { await sync.sync(); });
    expect(recordMock.mock.calls.map(([row]) => row.requestId)).toEqual([first.requestId, second.requestId]);
    expect(rejectedCatches("angler").map((row) => row.requestId)).toEqual([first.requestId]);
    expect(pendingCatches("angler")).toEqual([]);
    expect(sync.pendingCount).toBe(0);
    expect(sync.rejectedCount).toBe(1);
    expect(sync.error).toBe("");
  });

  it("never posts a held catch or switches profile for another signed-in angler", async () => {
    await mount();
    refuseQueueWrites();
    getMeMock.mockResolvedValue(me("someone-else"));
    await act(async () => { await sync.saveCatch(first); });
    await act(async () => { await sync.sync(); });
    expect(recordMock).not.toHaveBeenCalled();
    expect(onMe).not.toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ userId: "someone-else" }) }));
    expect(sync.error).toMatch(/another angler/i);
    expect(sync.pendingCount).toBe(1);
  });

  it("reports a failed save rather than a pending points refresh", async () => {
    await mount();
    getMeMock.mockResolvedValueOnce(me("angler")).mockRejectedValueOnce(new Error("timeout"));
    await act(async () => { await sync.saveCatch(first); });
    expect(sync.error).toMatch(/Catch saved/);
    refuseQueueWrites();
    recordMock.mockRejectedValueOnce(new Error("offline"));
    await act(async () => { await sync.saveCatch(second); });
    expect(sync.error).toBe("offline");
  });

  it("still posts a held catch when the queue cannot be read", async () => {
    localStorage.setItem("stillwater.pending-catches.angler", "[{}]");
    await mount();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await act(async () => { await sync.saveCatch(first); });
    expect(recordMock).toHaveBeenCalledWith(first);
    expect(sync.error).toMatch(/could not be read/);
  });

  it("counts a held catch once when a retry also queues it", async () => {
    await mount();
    refuseQueueWrites(1);
    recordMock.mockRejectedValue(new Error("offline"));
    await act(async () => { await sync.saveCatch(first); });
    await act(async () => { await sync.saveCatch(first); });
    expect(pendingCatches("angler")).toEqual([first]);
    expect(sync.pendingCount).toBe(1);
  });

  it("shows the catch as waiting while its first save is in flight", async () => {
    await mount();
    let release!: () => void;
    getMeMock.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve(me("angler")); }));
    let pending!: Promise<boolean>;
    await act(async () => { pending = sync.saveCatch(first); });
    expect(sync.pendingCount).toBe(1);
    await act(async () => {
      release();
      await pending;
    });
    expect(sync.pendingCount).toBe(0);
  });

  it("checks the account again before showing refreshed points", async () => {
    await mount();
    getMeMock.mockResolvedValueOnce(me("angler")).mockResolvedValueOnce(me("someone-else"));
    await act(async () => { await sync.saveCatch(first); });
    expect(recordMock).toHaveBeenCalledWith(first);
    expect(onMe).not.toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ userId: "someone-else" }) }));
    expect(sync.error).toMatch(/another angler/i);
  });

  it("refreshes points after a partial sync and still reports what failed", async () => {
    queueCatch("angler", first);
    queueCatch("angler", second);
    getMeMock.mockResolvedValueOnce(me("angler")).mockRejectedValueOnce(new Error("timeout"));
    recordMock.mockResolvedValueOnce(saved).mockRejectedValueOnce(new Error("offline"));
    await mount();
    expect(getMeMock).toHaveBeenCalledTimes(2);
    expect(pendingCatches("angler")).toEqual([second]);
    expect(sync.error).toBe("offline");
  });
});
