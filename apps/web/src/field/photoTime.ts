/**
 * When a photo was taken, from the date its camera wrote into it (a JPEG's EXIF), as a "2026-10-16T06:42" local time.
 * Cameras and phones write the wall-clock time where the photo was taken, with no zone, which is what the form's time field holds.
 */
export function photoTakenAt(bytes: Uint8Array): string | null {
  const notes = exifBlock(bytes);
  return notes ? fromTiff(bytes, notes.start, notes.end) : null;
}

/** Where the camera's notes sit in a JPEG: the TIFF block inside its APP1 "Exif" segment. */
function exifBlock(bytes: Uint8Array): { start: number; end: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let at = 2;
  while (at + 4 <= bytes.length && bytes[at] === 0xff) {
    const marker = bytes[at + 1]!;
    const size = (bytes[at + 2]! << 8) | bytes[at + 3]!;
    // APP1 holding "Exif\0\0": the camera's notes.
    if (marker === 0xe1 && ascii(bytes, at + 4, 6) === "Exif\0\0") return { start: at + 10, end: at + 2 + size };
    // The picture itself starts; there are no notes before it.
    if (marker === 0xda) return null;
    at += 2 + size;
  }
  return null;
}

/** Where a photo was taken, from the GPS notes a phone writes into it, or null when it wrote none. */
export function photoPlace(bytes: Uint8Array): { lat: number; lng: number } | null {
  const notes = exifBlock(bytes);
  if (!notes) return null;
  const reader = tiffReader(bytes, notes.start, notes.end);
  if (!reader) return null;
  const { u16, u32, tags, start, end } = reader;
  const first = u32(start + 4);
  if (first < 0) return null;
  const gpsEntry = tags(first).get(GPS_IFD);
  if (gpsEntry === undefined) return null;
  const gps = tags(u32(gpsEntry + 8));
  /** Degrees, minutes and seconds, three fractions, as decimal degrees. */
  const degrees = (entry: number | undefined) => {
    if (entry === undefined || u16(entry + 2) !== 5 || u32(entry + 4) !== 3) return null;
    const at = start + u32(entry + 8);
    if (at + 24 > end) return null;
    const parts = [0, 1, 2].map((index) => {
      const top = u32(at + index * 8);
      const bottom = u32(at + index * 8 + 4);
      return bottom > 0 ? top / bottom : NaN;
    });
    const [d, m, sec] = parts as [number, number, number];
    const value = d + m / 60 + sec / 3600;
    return Number.isFinite(value) ? value : null;
  };
  /** "N", "S", "E" or "W", written inline in the entry. */
  const side = (entry: number | undefined) => (entry === undefined ? "" : String.fromCharCode(bytes[entry + 8] ?? 0));
  const lat = degrees(gps.get(2));
  const lng = degrees(gps.get(4));
  if (lat === null || lng === null || lat > 90 || lng > 180) return null;
  // 0, 0 is a phone that had no fix, not a fish off the coast of Africa.
  if (lat === 0 && lng === 0) return null;
  return { lat: side(gps.get(1)) === "S" ? -lat : lat, lng: side(gps.get(3)) === "W" ? -lng : lng };
}

function ascii(bytes: Uint8Array, at: number, length: number) {
  return String.fromCharCode(...bytes.subarray(at, at + length));
}

const DATE_TIME_ORIGINAL = 0x9003;
const DATE_TIME_DIGITIZED = 0x9004;
const DATE_TIME = 0x0132;
const EXIF_IFD = 0x8769;
const GPS_IFD = 0x8825;

/** Reads numbers and tag folders out of a TIFF block, in its own byte order, never past what was read. */
function tiffReader(bytes: Uint8Array, start: number, blockEnd: number) {
  // Only as much as was read: a cut-off file stops short instead of reading past it.
  const end = Math.min(blockEnd, bytes.length);
  const little = ascii(bytes, start, 2) === "II";
  if (!little && ascii(bytes, start, 2) !== "MM") return null;
  const u16 = (at: number) => (at + 2 > end ? -1 : little ? bytes[at]! | (bytes[at + 1]! << 8) : (bytes[at]! << 8) | bytes[at + 1]!);
  const u32 = (at: number) =>
    at + 4 > end
      ? -1
      : little
        ? (bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16) | (bytes[at + 3]! << 24)) >>> 0
        : ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
  /** Each tag in a folder of tags, with where its value sits. */
  const tags = (offset: number) => {
    const found = new Map<number, number>();
    const count = u16(start + offset);
    for (let index = 0; index < count && count > 0; index += 1) {
      const entry = start + offset + 2 + index * 12;
      const tag = u16(entry);
      if (tag < 0) break;
      found.set(tag, entry);
    }
    return found;
  };
  return { u16, u32, tags, start, end };
}

function fromTiff(bytes: Uint8Array, start: number, blockEnd: number): string | null {
  const reader = tiffReader(bytes, start, blockEnd);
  if (!reader) return null;
  const { u16, u32, tags, end } = reader;
  /** A 20-character date text, "2026:10:16 06:42:10", turned into the form's time. */
  const dateAt = (entry: number | undefined) => {
    if (entry === undefined || u16(entry + 2) !== 2) return null;
    const length = u32(entry + 4);
    const at = length > 4 ? start + u32(entry + 8) : entry + 8;
    if (length < 16 || at + 16 > end) return null;
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(ascii(bytes, at, 16));
    if (!match || match[1] === "0000") return null;
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  };
  const first = u32(start + 4);
  if (first < 0) return null;
  const main = tags(first);
  const exifEntry = main.get(EXIF_IFD);
  const exif = exifEntry === undefined ? new Map<number, number>() : tags(u32(exifEntry + 8));
  return dateAt(exif.get(DATE_TIME_ORIGINAL)) ?? dateAt(exif.get(DATE_TIME_DIGITIZED)) ?? dateAt(main.get(DATE_TIME));
}
