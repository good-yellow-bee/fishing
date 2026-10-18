import { describe, expect, it } from "vitest";
import { nextKindMark } from "./milestones";

describe("a kind's next round number", () => {
  it("names it a few fish away, and not sooner", () => {
    expect(nextKindMark(6)).toBeNull();
    expect(nextKindMark(8)).toEqual({ left: 2, mark: 10 });
    expect(nextKindMark(22)).toEqual({ left: 3, mark: 25 });
    expect(nextKindMark(10)).toBeNull();
    expect(nextKindMark(999)).toEqual({ left: 1, mark: 1000 });
    expect(nextKindMark(1000)).toBeNull();
  });
});
