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
const onRefreshError = vi.fn();

function Harness({ userId }: { userId: string }) {
  sync = useCatchSync(userId, onMe, onRefreshError);
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

  it("reports a failed direct save so the caller can retry", async () => {
    await mount();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(browser.window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    recordMock.mockRejectedValueOnce(new Error("offline"));
    await act(async () => expect(await sync.saveCatch(first)).toBe(false));
    expect(sync.error).toBe("offline");
    await act(async () => { await sync.sync(); });
    expect(sync.error).toBe("offline");
    await act(async () => expect(await sync.saveCatch(first)).toBe(true));
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
});
