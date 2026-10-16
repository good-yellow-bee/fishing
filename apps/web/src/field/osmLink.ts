/** The place on OpenStreetMap, pinned, where a phone can ask for the way there. */
export function osmLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}
