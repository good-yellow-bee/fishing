import { describe, expect, it } from "vitest";
import { WEEKLY_CHALLENGE_COUNT, weekDays, weekFishFor, weeklyChallengesFor, weeklyProgress, weekOf, type WeeklyChallenge } from "./weeklyChallenges.ts";

const goal = (kind: WeeklyChallenge["kind"], n: number): WeeklyChallenge => ({ id: kind, kind, goal: n, reward: 1 });

describe("weekly challenges", () => {
  it("names a week by its Monday and lists its seven days", () => {
    expect(weekOf("2026-10-21")).toBe("2026-10-19");
    expect(weekOf("2026-10-25")).toBe("2026-10-19");
    expect(weekOf("2026-10-26")).toBe("2026-10-26");
    expect(weekDays("2026-10-19")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
  });

  it("picks three different goals, the same for the whole week", () => {
    const week = weeklyChallengesFor("2026-10-19");
    expect(week).toHaveLength(WEEKLY_CHALLENGE_COUNT);
    expect(new Set(week.map((row) => row.id)).size).toBe(WEEKLY_CHALLENGE_COUNT);
    expect(weeklyChallengesFor("2026-10-19")).toEqual(week);
    expect(weeklyChallengesFor("2026-10-26")).not.toEqual(week);
  });

  it("counts the week's catches toward each kind of goal, up to the goal", () => {
    const fish = weekFishFor("2026-10-19").id;
    const catches = [
      { speciesId: fish, spot: "dock", weight: 0.1, clean: true },
      { speciesId: "perch", spot: "reeds", weight: 1.2, clean: false },
      { speciesId: "perch", spot: "reeds", weight: 0.5, clean: true },
    ];
    expect(weeklyProgress(goal("weeklyFish", 5), catches, "2026-10-19")).toBe(fish === "perch" ? 3 : 1);
    expect(weeklyProgress(goal("banks", 4), catches, "2026-10-19")).toBe(2);
    expect(weeklyProgress(goal("kinds", 6), catches, "2026-10-19")).toBe(fish === "perch" ? 1 : 2);
    expect(weeklyProgress(goal("trophy", 1), catches, "2026-10-19")).toBe(1);
    expect(weeklyProgress(goal("clean", 1), catches, "2026-10-19")).toBe(1);
  });

  it("asks a new angler only for the banks their level opens", () => {
    const monday = ["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"].find((day) => weeklyChallengesFor(day).some((row) => row.kind === "banks"))!;
    expect(weeklyChallengesFor(monday, 1).find((row) => row.kind === "banks")?.goal).toBe(3);
    expect(weeklyChallengesFor(monday, 20).find((row) => row.kind === "banks")?.goal).toBe(4);
  });
});
