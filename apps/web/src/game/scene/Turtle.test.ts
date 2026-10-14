import { describe, expect, it } from "vitest";
import { baskingLogShape, turtleShell } from "./Turtle";
import { BASKING_LOG } from "./turtleMotion";

describe("turtleShell", () => {
  it("bakes the shell, rim and four feet into one shape in three colours", () => {
    const shell = turtleShell();
    const color = shell.getAttribute("color");
    const tones = new Set<string>();
    for (let i = 0; i < color.count; i += 1) tones.add(`${color.getX(i).toFixed(3)},${color.getY(i).toFixed(3)}`);
    expect(tones.size).toBe(3);
    shell.computeBoundingBox();
    expect(shell.boundingBox!.max.x).toBeGreaterThan(0.1);
  });
});

describe("basking log", () => {
  it("bakes the log and its branch into one shape", () => {
    const wood = baskingLogShape();
    wood.computeBoundingBox();
    expect(wood.boundingBox!.max.x).toBeCloseTo(BASKING_LOG.length / 2, 3);
    expect(wood.boundingBox!.max.y).toBeGreaterThan(0.19);
  });
});
