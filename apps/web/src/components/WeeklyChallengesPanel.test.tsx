// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimWeeklyChallenge, getWeeklyChallenges, type WeeklyBoard } from "../api";
import { WeeklyChallengesPanel } from "./WeeklyChallengesPanel";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, getWeeklyChallenges: vi.fn(), claimWeeklyChallenge: vi.fn() };
});

const board: WeeklyBoard = {
  week: "2026-10-19",
  weekFish: "pike",
  challenges: [
    { id: "week-fish", kind: "weeklyFish", goal: 5, reward: 90, progress: 2, claimed: false },
    { id: "week-trophy", kind: "trophy", goal: 1, reward: 120, progress: 1, claimed: false },
    { id: "week-clean", kind: "clean", goal: 10, reward: 60, progress: 10, claimed: true },
  ],
  rumor: { legendId: "ghost-pike", spot: "reeds", hour: "dusk", preyId: "perch", clues: [true, false, true] },
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const onClaimed = vi.fn(async () => {});

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(getWeeklyChallenges).mockResolvedValue(board);
  vi.mocked(claimWeeklyChallenge).mockResolvedValue({ reward: 120 });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("WeeklyChallengesPanel", () => {
  it("lists the week's goals with progress, and claims a finished one", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<WeeklyChallengesPanel catchKey="c1" onClaimed={onClaimed} />));
    const rows = [...container.querySelectorAll(".weekly-challenges > ul > li")];
    expect(rows.map((row) => row.querySelector(".daily-request-label")?.textContent)).toEqual(["5 × northern pike, the week's fish", "A trophy of any kind", "10 fish in clean fights"]);
    expect(rows[0]!.querySelector("button")!.disabled).toBe(true);
    expect(rows[2]!.textContent).toContain("Claimed");
    await act(async () => rows[1]!.querySelector("button")!.click());
    expect(claimWeeklyChallenge).toHaveBeenCalledWith("week-trophy", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(onClaimed).toHaveBeenCalled();
    expect(container.querySelectorAll(".weekly-challenges > ul > li")[1]!.textContent).toContain("Claimed");
    const clues = [...container.querySelectorAll(".legend-rumor li")].map((row) => row.textContent);
    expect(clues).toEqual(["A yellow perch at the ReedsFound", "A fish at the Reeds at duskNot yet", "A trophy of any kindFound"]);
    expect(container.querySelector(".legend-rumor")!.textContent).not.toContain("All three found");
  });
});
