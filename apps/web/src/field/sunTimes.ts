/**
 * Sunrise and sunset for a day at a place, by the NOAA solar formulas (good to a minute or two away from the poles).
 * The day is a calendar day ("2026-10-16"); the times come back as instants, shown in the device's own clock.
 */
export type SunTimes = { rise: Date; set: Date } | { always: "up" | "down" };

const RAD = Math.PI / 180;

export function sunTimes(ymd: string, lat: number, lng: number): SunTimes {
  const [year, month, day] = ymd.split("-").map(Number) as [number, number, number];
  // Days from J2000 to noon UTC of that date, shifted by the longitude to the place's own solar noon.
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  const n = Math.round((noonUtc - Date.UTC(2000, 0, 1, 12)) / 86_400_000) - lng / 360;
  const meanAnomaly = (357.5291 + 0.98560028 * n) % 360;
  const center = 1.9148 * Math.sin(meanAnomaly * RAD) + 0.02 * Math.sin(2 * meanAnomaly * RAD) + 0.0003 * Math.sin(3 * meanAnomaly * RAD);
  const eclipticLng = (meanAnomaly + center + 180 + 102.9372) % 360;
  const transit = 2451545 + n + 0.0053 * Math.sin(meanAnomaly * RAD) - 0.0069 * Math.sin(2 * eclipticLng * RAD);
  const declination = Math.asin(Math.sin(eclipticLng * RAD) * Math.sin(23.4397 * RAD));
  // The sun's centre 0.833° below the horizon: refraction and the sun's own half-width.
  const cosHour = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(declination)) / (Math.cos(lat * RAD) * Math.cos(declination));
  if (cosHour < -1) return { always: "up" };
  if (cosHour > 1) return { always: "down" };
  const hour = Math.acos(cosHour) / RAD / 360;
  const toDate = (julian: number) => new Date((julian - 2440587.5) * 86_400_000);
  return { rise: toDate(transit - hour), set: toDate(transit + hour) };
}
