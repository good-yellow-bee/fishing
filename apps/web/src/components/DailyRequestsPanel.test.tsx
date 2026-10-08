// @vitest-environment jsdom
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

    expect(container!.querySelector(".warn")?.textContent).toBe("request incomplete");
    expect(rows()[0]!.button?.disabled).toBe(false);
    expect(onClaimed).not.toHaveBeenCalled();
  });

  it("reloads the board after a catch is saved", async () => {
    await mount("catch-1");
    await mount("catch-1");
    expect(getMock).toHaveBeenCalledTimes(1);

    await mount("catch-2");
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
