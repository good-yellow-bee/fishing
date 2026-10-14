import { describe, expect, it } from "vitest";
import { turtleShell } from "./Turtle";

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
