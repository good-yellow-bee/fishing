import { describe, expect, it } from "vitest";
import { LINE_SNAP, LINE_WAIT, nextLine } from "./lineWeight";

describe("the line on the reel", () => {
  it("goes round from light to heavy and back", () => {
    expect(nextLine("light")).toBe("standard");
    expect(nextLine("standard")).toBe("heavy");
    expect(nextLine("heavy")).toBe("wire");
    expect(nextLine("wire")).toBe("light");
  });

  it("trades bites for strength: light bites sooner and snaps sooner, heavy the other way", () => {
    expect(LINE_WAIT.light).toBeLessThan(1);
    expect(LINE_SNAP.light).toBeLessThan(1);
    expect(LINE_WAIT.heavy).toBeGreaterThan(1);
    expect(LINE_SNAP.heavy).toBeGreaterThan(1);
    expect([LINE_WAIT.standard, LINE_SNAP.standard]).toEqual([1, 1]);
  });

  it("puts a wire leader on standard line: it holds as standard, but the fish see it", () => {
    expect(LINE_SNAP.wire).toBe(1);
    expect(LINE_WAIT.wire).toBeGreaterThan(LINE_WAIT.heavy);
  });
});
