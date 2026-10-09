// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, claimDailyRequest, getDailyRequests, type DailyBoard } from "../api";
import { DailyRequestsPanel } from "./DailyRequestsPanel";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, getDailyRequests: vi.fn(), claimDailyRequest: vi.fn() };
});

const getMock = vi.mocked(getDailyRequests);
const claimMock = vi.mocked(claimDailyRequest);

const board: DailyBoard = {
  day: "2026-03-14",
  requests: [
    { id: "shiner-dock", speciesId: "golden-shiner", spot: "dock", count: 3, reward: 15, progress: 3, claimed: false },
    { id: "perch-reeds", speciesId: "perch", spot: "reeds", count: 2, reward: 18, progress: 1, claimed: false },
    { id: "carp-heavy", speciesId: "carp", minWeight: 8, count: 1, reward: 40, progress: 1, claimed: true },
  ],
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const onClaimed = vi.fn(async () => {});

async function mount(catchKey?: string) {
  if (!container) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => root!.render(<DailyRequestsPanel catchKey={catchKey} onClaimed={onClaimed} />));
}

function warning() {
  return container!.querySelector(".warn");
}

function button(text: string) {
  return [...container!.querySelectorAll("button")].find((candidate) => candidate.textContent === text);
}

function rows() {
  return [...container!.querySelectorAll("li")].map((row) => ({
    text: row.textContent,
    button: row.querySelector("button"),
  }));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  getMock.mockResolvedValue(board);
  claimMock.mockResolvedValue({ reward: 15 });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DailyRequestsPanel", () => {
  it("lists each request with progress and reward, enabling Claim only when complete and unclaimed", async () => {
    await mount("catch-1");

    const [shiners, perch, carp] = rows();
    expect(shiners!.text).toBe("3 × golden shiner at the Dock3/3+15 ptsClaim");
    expect(shiners!.button?.disabled).toBe(false);
    expect(perch!.text).toBe("2 × yellow perch at the Reeds1/2+18 ptsClaim");
    expect(perch!.button?.disabled).toBe(true);
    expect(carp!.text).toBe("A common carp over 8 lb1/1+40 ptsClaimed");
    expect(carp!.button).toBeNull();
  });

  it("claims for the day the board was read, marks the row claimed and refreshes points", async () => {
    await mount("catch-1");

    await act(async () => rows()[0]!.button!.click());

    expect(claimMock).toHaveBeenCalledWith("shiner-dock", "2026-03-14");
    expect(onClaimed).toHaveBeenCalledTimes(1);
    expect(rows()[0]!.text).toContain("Claimed");
    expect(rows()[0]!.button).toBeNull();
  });

  it("keeps the row claimable and shows why when the claim fails", async () => {
    claimMock.mockRejectedValue(new ApiError("request incomplete", 409));
    await mount("catch-1");

    await act(async () => rows()[0]!.button!.click());

    expect(warning()?.textContent).toBe("request incomplete");
    expect(warning()?.getAttribute("role")).toBe("alert");
    expect(rows()[0]!.button?.disabled).toBe(false);
    expect(onClaimed).not.toHaveBeenCalled();
  });

  it("settles a row already claimed in another tab and refreshes points", async () => {
    claimMock.mockRejectedValue(new ApiError("request already claimed", 409));
    await mount("catch-1");

    await act(async () => rows()[0]!.button!.click());

    expect(rows()[0]!.text).toContain("Claimed");
    expect(rows()[0]!.button).toBeNull();
    expect(warning()).toBeNull();
    expect(onClaimed).toHaveBeenCalledTimes(1);
  });

  it("keeps a paid claim marked claimed when only the points refresh fails", async () => {
    onClaimed.mockRejectedValueOnce(new Error("Failed to fetch"));
    await mount("catch-1");

    await act(async () => rows()[0]!.button!.click());

    expect(rows()[0]!.text).toContain("Claimed");
    expect(warning()?.textContent).toBe("Claimed, but your points could not be refreshed.");
  });

  it("names each Claim button for its request and announces a row once it is claimed", async () => {
    await mount("catch-1");

    expect(rows()[0]!.button?.getAttribute("aria-label")).toBe("Claim 3 × golden shiner at the Dock");
    expect([...container!.querySelectorAll("li")].map((row) => row.getAttribute("aria-live"))).toEqual(["polite", "polite", "polite"]);
  });

  it("leaves the next day's board alone when an earlier day's claim lands late", async () => {
    await mount("catch-1");
    let finish!: () => void;
    claimMock.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve({ reward: 15 }); }));
    await act(async () => rows()[0]!.button!.click());
    getMock.mockResolvedValue({ ...board, day: "2026-03-15" });
    await mount("catch-2");
    await act(async () => finish());
    expect(rows()[0]!.text).not.toContain("Claimed");
    expect(rows()[0]!.button).not.toBeNull();
  });

  it("reads the new day's board when the tab comes back after midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 2, 14, 23, 50) });
    await mount("catch-1");
    expect(getMock).toHaveBeenLastCalledWith("2026-03-14");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(getMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(2026, 2, 15, 0, 5));
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getMock).toHaveBeenLastCalledWith("2026-03-15");
    vi.useRealTimers();
  });

  it("reloads at once when a board asked for before midnight arrives after it", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 2, 14, 23, 59, 59) });
    let answer!: () => void;
    getMock.mockImplementationOnce(() => new Promise((resolve) => { answer = () => resolve(board); }));
    await mount("catch-1");
    vi.setSystemTime(new Date(2026, 2, 15, 0, 0, 1));
    await act(async () => answer());
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getMock).toHaveBeenLastCalledWith("2026-03-15");
    vi.useRealTimers();
  });

  it("offers to read the board again when a refresh fails over a board already shown", async () => {
    await mount("catch-1");
    getMock.mockRejectedValueOnce(new Error("offline"));
    await mount("catch-2");
    expect(button("Read the board again")).toBeDefined();
    expect(rows().length).toBeGreaterThan(0);
  });

  it("keeps a paid claim claimed when a board read before the claim arrives after it", async () => {
    await mount("catch-1");
    let answer!: () => void;
    getMock.mockImplementationOnce(() => new Promise((resolve) => { answer = () => resolve(board); }));
    await mount("catch-2");
    await act(async () => rows()[0]!.button!.click());
    await act(async () => answer());
    expect(rows()[0]!.text).toContain("Claimed");
  });

  it("reloads the board after a catch is saved", async () => {
    await mount("catch-1");
    await mount("catch-1");
    expect(getMock).toHaveBeenCalledTimes(1);

    await mount("catch-2");
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("drops a load error once a later load succeeds", async () => {
    getMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    await mount("catch-1");
    expect(warning()?.textContent).toBe("Failed to fetch");

    await mount("catch-2");

    expect(rows()).toHaveLength(3);
    expect(warning()).toBeNull();
    expect(button("Read the board again")).toBeUndefined();
  });

  it("reads the board again on request after a failed load", async () => {
    getMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    await mount("catch-1");
    expect(rows()).toHaveLength(0);

    await act(async () => button("Read the board again")!.click());

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(3);
    expect(warning()).toBeNull();
  });
});

describe("shop overlay", () => {
  it("caps its height to the viewport and scrolls, so the board never lifts the upgrades off a short screen", () => {
    const css = readFileSync(`${import.meta.dirname}/../index.css`, "utf8");
    const block = /^\.shop-overlay \{([^}]*)\}/m.exec(css)?.[1];
    expect(block).toContain("max-height: calc(100dvh - 48px);");
    expect(block).toContain("overflow-y: auto;");
  });
});
