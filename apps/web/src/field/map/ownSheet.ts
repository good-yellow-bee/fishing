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

/** A label's room on screen, in pixels: a long name's width, and its two lines (the name and its fish). */
const LABEL_WIDTH = 190;
const LABEL_HEIGHT = 46;
/** How far a moved label goes, in pixels, as spot-map.css moves it (62px down, 34px up, from 14px). */
const LABEL_STEP = 48;

/**
 * Where each pin's label goes beside the earlier pins' labels (in order): 0 in its own place, 1 a line off (down, or
 * up near the foot of the sheet), 2 a line the other way, 3 none (the dot only; the list under the sheet still names
 * it). Labels keep their size on screen while the sheet scales, so `pxPerUnit` (the sheet's drawn width over
 * OWN_WIDTH) decides which meet: a phone's narrow sheet spreads labels that a wide one has room for.
 */
export function labelShifts(points: readonly { x: number; y: number }[], pxPerUnit: number): number[] {
  const shifts: number[] = [];
  const placed: { x: number; y: number }[] = [];
  const offset = (point: { y: number }, shift: number) => {
    const low = point.y > OWN_HEIGHT * 0.7;
    if (shift === 0) return 0;
    return (shift === 1) === low ? -LABEL_STEP : LABEL_STEP;
  };
  for (const point of points) {
    const at = { x: point.x * pxPerUnit, y: point.y * pxPerUnit };
    let shift = 0;
    while (shift < 3 && placed.some((other) => Math.abs(other.x - at.x) < LABEL_WIDTH && Math.abs(other.y - (at.y + offset(point, shift))) < LABEL_HEIGHT)) shift++;
    shifts.push(shift);
    if (shift < 3) placed.push({ x: at.x, y: at.y + offset(point, shift) });
  }
  return shifts;
}
