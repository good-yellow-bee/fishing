import { describe, expect, it } from "vitest";
import { parseSpotPlace } from "./logbook";

const at = { lat: 53.8, lng: 21.5 };

describe("a place as a GPS unit or another map writes it", () => {
  it("reads a waypoint with the hemisphere's letter first, the signs left out or not", () => {
    for (const raw of ["N 53° 48.000' E 021° 30.000'", "N53 48.000 E21 30.000", "53 48.000N 21 30.000E", "N 53.8000 E 21.5000", "N53°48.000' E21°30.000'", "E 21.5 N 53.8"]) {
      expect(parseSpotPlace(raw), raw).toEqual(at);
    }
    expect(parseSpotPlace("S 33° 52.000' W 151° 12.000'")).toEqual({ lat: -33.86667, lng: -151.2 });
  });

  it("still reads what it read before", () => {
    expect(parseSpotPlace("53.8000N, 21.5000E")).toEqual(at);
    expect(parseSpotPlace("46.85, -94.24")).toEqual({ lat: 46.85, lng: -94.24 });
    expect(parseSpotPlace("46,85; -94,24")).toEqual({ lat: 46.85, lng: -94.24 });
    expect(parseSpotPlace("46.85° N 94.24° W")).toEqual({ lat: 46.85, lng: -94.24 });
    expect(parseSpotPlace(`53°48'00.0"N 21°30'00.0"E`)).toEqual(at);
    expect(parseSpotPlace("N 53 E 21 W")).toBeNull();
    expect(parseSpotPlace("N 53° 48' N 21° 30'")).toBeNull();
  });

  it("reads Yandex the right way round, and Mapy.cz, Apple, Google directions and Bing links", () => {
    expect(parseSpotPlace("https://yandex.com/maps/?ll=21.5%2C53.8&z=15")).toEqual(at);
    expect(parseSpotPlace("https://yandex.ru/maps/?pt=21.5,53.8&z=15&l=map")).toEqual(at);
    expect(parseSpotPlace("https://mapy.com/en/turisticka?x=21.5000&y=53.8000&z=14")).toEqual(at);
    expect(parseSpotPlace("https://mapy.cz/zakladni?y=53.8&x=21.5&z=14")).toEqual(at);
    expect(parseSpotPlace("https://maps.apple.com/place?coordinate=53.8,21.5&name=Lake")).toEqual(at);
    expect(parseSpotPlace("https://www.google.com/maps/dir/?api=1&destination=53.8,21.5")).toEqual(at);
    expect(parseSpotPlace("https://www.bing.com/maps?cp=53.8~21.5")).toEqual(at);
    expect(parseSpotPlace("https://www.google.com/maps?ll=53.8,21.5")).toEqual(at);
  });
});
