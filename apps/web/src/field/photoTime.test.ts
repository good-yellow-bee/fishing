import { describe, expect, it } from "vitest";
import { photoTakenAt } from "./photoTime";

/** A JPEG start with an EXIF block: IFD0 points to an Exif IFD holding the given date tags. */
function jpegWith(dates: Record<number, string>, little = true, inMain = false): Uint8Array {
  const out: number[] = [];
  const u16 = (value: number) => (little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff]);
  const u32 = (value: number) => (little ? [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, value >>> 24] : [value >>> 24, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
  const tiff: number[] = [...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8)];
  const tags = Object.entries(dates).map(([tag, text]) => [Number(tag), text] as const);
  const texts: number[] = [];
  const folder = (entries: (readonly [number, number, number, number])[], next: number) => [
    ...u16(entries.length),
    ...entries.flatMap(([tag, type, count, value]) => [...u16(tag), ...u16(type), ...u32(count), ...u32(value)]),
    ...u32(next),
  ];
  const mainSize = 2 + 12 * (inMain ? tags.length : 1) + 4;
  const exifAt = 8 + mainSize;
  const exifSize = inMain ? 0 : 2 + 12 * tags.length + 4;
  let textAt = exifAt + exifSize;
  const dated = tags.map(([tag, text]) => {
    const entry = [tag, 2, 20, textAt] as const;
    texts.push(...[...text.padEnd(19, " ")].map((c) => c.charCodeAt(0)), 0);
    textAt += 20;
    return entry;
  });
  if (inMain) tiff.push(...folder(dated, 0));
  else tiff.push(...folder([[0x8769, 4, 1, exifAt]], 0), ...folder(dated, 0));
  tiff.push(...texts);
  const app1 = [..."Exif\0\0"].map((c) => c.charCodeAt(0)).concat(tiff);
  out.push(0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 0xff, ...app1, 0xff, 0xda, 0, 2);
  return new Uint8Array(out);
}

describe("photoTakenAt", () => {
  it("reads when the photo was taken, as the time field writes it", () => {
    expect(photoTakenAt(jpegWith({ 0x9003: "2026:10:16 06:42:10" }))).toBe("2026-10-16T06:42");
    expect(photoTakenAt(jpegWith({ 0x9003: "2025:07:04 19:05:00" }, false))).toBe("2025-07-04T19:05");
  });

  it("falls back to the digitized time, then the file's own date", () => {
    expect(photoTakenAt(jpegWith({ 0x9004: "2026:05:01 08:00:00" }))).toBe("2026-05-01T08:00");
    expect(photoTakenAt(jpegWith({ 0x0132: "2026:05:02 09:30:00" }, true, true))).toBe("2026-05-02T09:30");
  });

  it("gives nothing for a photo without a date, a blank date, or a file that isn't a JPEG", () => {
    expect(photoTakenAt(jpegWith({}))).toBeNull();
    expect(photoTakenAt(jpegWith({ 0x9003: "0000:00:00 00:00:00" }))).toBeNull();
    expect(photoTakenAt(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(photoTakenAt(jpegWith({ 0x9003: "2026:10:16 06:42:10" }).subarray(0, 40))).toBeNull();
  });
});
