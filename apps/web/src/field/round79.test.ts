import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { findCatches } from "./CatchSearch";
import { exactTerm } from "./findLinks";
import { OWN_HEIGHT, OWN_WIDTH, labelShifts } from "./map/ownSheet";

const fish = (id: string, lure: string) =>
  ({ id, species: "Zander", lure, spotId: "home", tripId: null, caughtAt: "2026-10-01T09:00:00.000Z", measure: { kind: "length", inches: 20 }, notes: "" }) as unknown as CatchEntry;

describe("round 79: a lure opens every spelling Gear counted it under", () => {
  const book = { spots: [], trips: [], catches: [fish("a", "Spinnerbait"), fish("b", "Spinnerbaits"), fish("c", "Jig")] } as unknown as Logbook;

  it("finds both twins from either name", () => {
    expect(findCatches(book, exactTerm("lure", "Spinnerbait"), t).map((entry) => entry.id).sort()).toEqual(["a", "b"]);
    expect(findCatches(book, exactTerm("lure", "Spinnerbaits"), t).map((entry) => entry.id).sort()).toEqual(["a", "b"]);
  });
});

describe("round 79: own-sheet labels keep off other dots and on the sheet", () => {
  const px = 0.36;
  // A cluster near the right edge, one near the foot, one in a corner: as a 360px phone draws them.
  const points = [
    { x: 960, y: 40 },
    { x: 975, y: 60 },
    { x: 990, y: 580 },
    { x: 20, y: 590 },
    { x: 500, y: 300 },
    { x: 520, y: 310 },
  ];
  const labelWidth = 126;

  it("puts no label over another dot or past an edge", () => {
    const shifts = labelShifts(points, px, { labelWidth });
    const boxes = shifts.flatMap((shift, i) => {
      if (shift === 3) return [];
      const point = points[i]!;
      const at = { x: point.x * px, y: point.y * px };
      const low = point.y > OWN_HEIGHT * 0.7;
      const top = shift === 0 || shift === 4 ? -8 : (shift === 1) === low ? -56 : 40;
      const east = point.x > OWN_WIDTH * 0.5 !== (shift === 4);
      const x0 = east ? at.x - 4 - labelWidth : at.x + 4;
      return [{ i, x0, y0: at.y + top, x1: x0 + labelWidth, y1: at.y + top + 44 }];
    });
    for (const box of boxes) {
      expect(box.x0).toBeGreaterThanOrEqual(0);
      expect(box.y0).toBeGreaterThanOrEqual(0);
      expect(box.x1).toBeLessThanOrEqual(OWN_WIDTH * px);
      expect(box.y1).toBeLessThanOrEqual(OWN_HEIGHT * px);
      for (const [j, point] of points.entries()) {
        if (j === box.i) continue;
        const dot = { x: point.x * px, y: point.y * px };
        expect(dot.x + 7 <= box.x0 || dot.x - 7 >= box.x1 || dot.y + 7 <= box.y0 || dot.y - 7 >= box.y1).toBe(true);
      }
      for (const other of boxes) {
        if (other.i === box.i) continue;
        expect(other.x1 <= box.x0 || other.x0 >= box.x1 || other.y1 <= box.y0 || other.y0 >= box.y1).toBe(true);
      }
    }
    // Most still get a label.
    expect(boxes.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps an own pin's label off the sample waters' dots and their labels", () => {
    const taken = [{ x: 540, y: 300 }];
    expect(labelShifts([{ x: 500, y: 300 }], 0.9, { width: 1000, height: 720, taken })).not.toContain(0);
  });
});

describe("round 79: the map's water list wraps a long name in its column", () => {
  const css = readFileSync(`${import.meta.dirname}/map/spot-map.css`, "utf8");

  it("lets each column shrink and break", () => {
    expect(css).toMatch(/\.map-index li > \* \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
    expect(css).not.toMatch(/\.map-index li \{[^}]*grid-template-columns:[^;}]*(?<!minmax\(0, )\b1fr/);
  });
});
