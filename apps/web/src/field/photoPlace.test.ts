import { describe, expect, it } from "vitest";
import { photoPlace } from "./photoTime";

/** A JPEG start whose EXIF block holds GPS notes: latitude and longitude as degrees, minutes and seconds. */
function jpegAt(lat: [number, number, number], ns: string, lng: [number, number, number], ew: string, little = true): Uint8Array {
  const u16 = (value: number) => (little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff]);
  const u32 = (value: number) => (little ? [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, value >>> 24] : [value >>> 24, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
  const entry = (tag: number, type: number, count: number, value: number[]) => [...u16(tag), ...u16(type), ...u32(count), ...value];
  const mainAt = 8;
  const gpsAt = mainAt + 2 + 12 + 4;
  const dataAt = gpsAt + 2 + 12 * 4 + 4;
  const inline = (text: string) => [...text].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0]).slice(0, 4);
  const rational = (parts: [number, number, number]) => parts.flatMap((part) => [...u32(Math.round(part * 100)), ...u32(100)]);
  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(mainAt),
    ...u16(1),
    ...entry(0x8825, 4, 1, u32(gpsAt)),
    ...u32(0),
    ...u16(4),
    ...entry(1, 2, 2, inline(ns)),
    ...entry(2, 5, 3, u32(dataAt)),
    ...entry(3, 2, 2, inline(ew)),
    ...entry(4, 5, 3, u32(dataAt + 24)),
    ...u32(0),
    ...rational(lat),
    ...rational(lng),
  ];
  const app1 = [..."Exif\0\0"].map((c) => c.charCodeAt(0)).concat(tiff);
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 0xff, ...app1, 0xff, 0xda, 0, 2]);
}

describe("photoPlace", () => {
  it("reads where the photo was taken, south and west as negative", () => {
    const place = photoPlace(jpegAt([45, 30, 36], "N", [93, 15, 0], "W"))!;
    expect(place.lat).toBeCloseTo(45.51, 4);
    expect(place.lng).toBeCloseTo(-93.25, 4);
    const south = photoPlace(jpegAt([33, 52, 0], "S", [151, 12, 36], "E", false))!;
    expect(south.lat).toBeCloseTo(-33.8667, 3);
    expect(south.lng).toBeCloseTo(151.21, 3);
  });

  it("gives nothing for a phone with no fix, or a file that isn't a JPEG", () => {
    expect(photoPlace(jpegAt([0, 0, 0], "N", [0, 0, 0], "E"))).toBeNull();
    expect(photoPlace(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
