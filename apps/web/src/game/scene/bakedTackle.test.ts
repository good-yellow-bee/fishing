import { describe, expect, it } from "vitest";
import { reelShapes } from "./Reel";
import { thermosShapes } from "./Thermos";
import { CUP_HEIGHT } from "./steamWisp";

describe("baked tackle", () => {
  it("bakes the thermos flask and cup with colours, the cup standing on its base", () => {
    const { flask, cup } = thermosShapes();
    for (const shape of [flask, cup]) expect(shape.getAttribute("color")).toBeDefined();
    flask.computeBoundingBox();
    cup.computeBoundingBox();
    expect(flask.boundingBox!.max.y).toBeCloseTo(0.2925, 3);
    expect(cup.boundingBox!.min.y).toBeCloseTo(0, 5);
    expect(cup.boundingBox!.max.y).toBeCloseTo(CUP_HEIGHT, 5);
  });

  it("bakes the reel spool and crank around their own axles", () => {
    const { drum, crank } = reelShapes();
    drum.computeBoundingBox();
    crank.computeBoundingBox();
    expect(drum.boundingBox!.max.x).toBeCloseTo(0.027, 3);
    expect(crank.boundingBox!.max.y).toBeCloseTo(0.182, 3);
    expect(crank.getAttribute("color").count).toBe(crank.getAttribute("position").count);
  });
});
