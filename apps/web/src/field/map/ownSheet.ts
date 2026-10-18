import type { LngLat } from "./places";

export const OWN_WIDTH = 1000;
export const OWN_HEIGHT = 600;

export type Frame = { north: number; south: number; west: number; east: number };

/**
 * A frame around the angler's own pins, a little wider than they reach, shaped to the sheet so a degree east and a
 * degree north are drawn true to the ground (east-west degrees shrink away from the equator).
 */
export function fitFrame(points: readonly LngLat[]): Frame {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
  let latSpan = Math.max((Math.max(...lats) - Math.min(...lats)) * 1.4, 0.006);
  let lngSpan = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.4, 0.006);
  const squeeze = Math.max(0.05, Math.cos((midLat * Math.PI) / 180));
  const aspect = OWN_WIDTH / OWN_HEIGHT;
  if ((lngSpan * squeeze) / latSpan < aspect) lngSpan = (latSpan * aspect) / squeeze;
  else latSpan = (lngSpan * squeeze) / aspect;
  return { north: midLat + latSpan / 2, south: midLat - latSpan / 2, west: midLng - lngSpan / 2, east: midLng + lngSpan / 2 };
}

/** Where a point falls on the sheet. */
export function projectIn(frame: Frame, point: LngLat): { x: number; y: number } {
  return {
    x: ((point.lng - frame.west) / (frame.east - frame.west)) * OWN_WIDTH,
    y: ((frame.north - point.lat) / (frame.north - frame.south)) * OWN_HEIGHT,
  };
}

const STEPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];

/** Round-numbered lines across a span, no more than about five, and the places their labels need. */
export function gridLines(from: number, to: number): { values: number[]; digits: number } {
  const step = STEPS.find((one) => (to - from) / one <= 5) ?? 20;
  const digits = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  const values: number[] = [];
  for (let value = Math.ceil(from / step + 1e-9) * step; value < to - 1e-9; value += step) values.push(Number(value.toFixed(digits)));
  return { values, digits };
}

/** A label's room on screen, in pixels: its two lines (the name and its fish; a phone shows the name alone), and at most this wide (spot-map.css). */
export const LABEL_HEIGHT = 44;
export const PHONE_LABEL_HEIGHT = 22;
const LABEL_MAX_WIDTH = 180;
/** A dot's room, in pixels: a label over another pin's dot would read as that water's name. */
const DOT = 14;

export type Box = { x0: number; y0: number; x1: number; y1: number };
const meets = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** How far a point is from a box, 0 inside it. */
const gap = (box: Box, point: { x: number; y: number }) =>
  Math.hypot(Math.max(box.x0 - point.x, 0, point.x - box.x1), Math.max(box.y0 - point.y, 0, point.y - box.y1));

/**
 * Where each pin's label goes (in order), as spot-map.css draws it beside a 44px pin: 0 in its own place (right of the
 * dot, or left of it in the east half), 1 a line off (down, or up near the foot of the sheet), 2 a line the other way,
 * 4 its own line on the other side of the dot, 3 none (the dot only; the list under the sheet still names it). A place
 * is taken only when its label meets no label placed before, stays on the sheet, and is nearer its own dot than any
 * other: a label over or beside another pin's dot reads as that water's name.
 * Labels keep their size on screen while the sheet scales, so `pxPerUnit` (the sheet's drawn width over `width`)
 * decides which meet: a phone's narrow sheet spreads labels that a wide one has room for. `taken` are other dots
 * already on the sheet (in sheet units) and `labels` their labels as drawn (in pixels from the sheet's corner), such as
 * the sample waters' hand-placed ones.
 */
export function labelShifts(
  points: readonly { x: number; y: number }[],
  pxPerUnit: number,
  {
    width = OWN_WIDTH,
    height = OWN_HEIGHT,
    labelWidth = LABEL_MAX_WIDTH,
    labelHeight = LABEL_HEIGHT,
    taken = [] as readonly { x: number; y: number }[],
    labels = [] as readonly Box[],
  } = {},
): number[] {
  const sheet = { w: width * pxPerUnit, h: height * pxPerUnit };
  const dots = points.map((point) => ({ x: point.x * pxPerUnit, y: point.y * pxPerUnit }));
  const placed: Box[] = [...labels];
  const otherDots = [...dots, ...taken.map((point) => ({ x: point.x * pxPerUnit, y: point.y * pxPerUnit }))];
  const box = (point: { x: number; y: number }, at: { x: number; y: number }, shift: number): Box => {
    const low = point.y > height * 0.7;
    // spot-map.css: top 14px from the pin's corner (22px up), 62px a line down, -34px a line up.
    const top = shift === 0 || shift === 4 ? -8 : (shift === 1) === low ? -56 : 40;
    const east = (point.x > width * 0.5) !== (shift === 4);
    // left: 26px (4px right of the dot's centre), or right: 26px on the east side.
    const x0 = east ? at.x - 4 - labelWidth : at.x + 4;
    return { x0, y0: at.y + top, x1: x0 + labelWidth, y1: at.y + top + labelHeight };
  };
  return points.map((point, i) => {
    const at = dots[i]!;
    for (const shift of [0, 1, 2, 4]) {
      const room = box(point, at, shift);
      const onSheet = room.y0 >= 0 && room.y1 <= sheet.h && room.x0 >= 0 && room.x1 <= sheet.w;
      const own = gap(room, at);
      const overDot = otherDots.some((dot, j) => j !== i && (gap(room, dot) <= own || meets(room, { x0: dot.x - DOT / 2, y0: dot.y - DOT / 2, x1: dot.x + DOT / 2, y1: dot.y + DOT / 2 })));
      if (onSheet && !overDot && !placed.some((other) => meets(room, other))) {
        placed.push(room);
        return shift;
      }
    }
    return 3;
  });
}
