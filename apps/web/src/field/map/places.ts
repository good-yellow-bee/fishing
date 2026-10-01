export type LngLat = { lat: number; lng: number };

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 720;

/** North-woods sheet. Ground scale is nearly even in both axes. */
export const MAP_FRAME = {
  north: 46.882,
  south: 46.772,
  west: -94.27,
  east: -94.048,
} as const;

export type SamplePlace = {
  spotId: string;
  lat: number;
  lng: number;
  labelSide: "north" | "east" | "south" | "west";
};

/** Plausible coordinates for the seeded spots. Ids match sampleLogbook. */
export const SAMPLE_PLACES: SamplePlace[] = [
  { spotId: "spot-oxbow", lat: 46.8551, lng: -94.2438, labelSide: "east" },
  { spotId: "spot-mill", lat: 46.832, lng: -94.205, labelSide: "east" },
  { spotId: "spot-cedar", lat: 46.848, lng: -94.14, labelSide: "north" },
  { spotId: "spot-duck", lat: 46.804, lng: -94.175, labelSide: "east" },
  { spotId: "spot-quarry", lat: 46.792, lng: -94.095, labelSide: "west" },
];

export const GRID_LATS = [46.87, 46.85, 46.83, 46.81, 46.79];
export const GRID_LNGS = [-94.25, -94.2, -94.15, -94.1];

export const CEDAR_LAKE: LngLat[] = [
  { lat: 46.826, lng: -94.186 },
  { lat: 46.834, lng: -94.176 },
  { lat: 46.842, lng: -94.16 },
  { lat: 46.8462, lng: -94.14 },
  { lat: 46.844, lng: -94.118 },
  { lat: 46.834, lng: -94.098 },
  { lat: 46.82, lng: -94.09 },
  { lat: 46.806, lng: -94.102 },
  { lat: 46.8, lng: -94.126 },
  { lat: 46.802, lng: -94.152 },
  { lat: 46.812, lng: -94.172 },
  { lat: 46.82, lng: -94.184 },
];

export const WEED_EDGE: LngLat[] = [
  { lat: 46.8448, lng: -94.156 },
  { lat: 46.8452, lng: -94.14 },
  { lat: 46.8436, lng: -94.122 },
];

export const MILL_RACE: LngLat[] = [
  { lat: 46.876, lng: -94.214 },
  { lat: 46.862, lng: -94.21 },
  { lat: 46.848, lng: -94.208 },
  { lat: 46.84, lng: -94.207 },
  { lat: 46.836, lng: -94.206 },
  { lat: 46.832, lng: -94.205 },
  { lat: 46.826, lng: -94.198 },
  { lat: 46.822, lng: -94.19 },
  { lat: 46.826, lng: -94.186 },
];

/** Short tick across the race, just upstream of the pocket. */
export const MILL_DAM: LngLat[] = [
  { lat: 46.8376, lng: -94.2092 },
  { lat: 46.8344, lng: -94.2028 },
];

export const OXBOW: LngLat[] = [
  { lat: 46.8731, lng: -94.254 },
  { lat: 46.8664, lng: -94.246 },
  { lat: 46.8631, lng: -94.2371 },
  { lat: 46.8573, lng: -94.2287 },
  { lat: 46.8521, lng: -94.2363 },
  { lat: 46.8551, lng: -94.2438 },
  { lat: 46.8493, lng: -94.2371 },
  { lat: 46.8426, lng: -94.2245 },
  { lat: 46.8374, lng: -94.2127 },
];

export const QUARRY: LngLat[] = [
  { lat: 46.792, lng: -94.095 },
  { lat: 46.7885, lng: -94.0831 },
  { lat: 46.783, lng: -94.08 },
  { lat: 46.7815, lng: -94.0906 },
  { lat: 46.7827, lng: -94.1039 },
  { lat: 46.7876, lng: -94.1106 },
  { lat: 46.7906, lng: -94.1039 },
  { lat: 46.7916, lng: -94.0986 },
];

export const TRACK: LngLat[] = [
  { lat: 46.856, lng: -94.252 },
  { lat: 46.848, lng: -94.232 },
  { lat: 46.84, lng: -94.216 },
  { lat: 46.826, lng: -94.196 },
  { lat: 46.816, lng: -94.168 },
  { lat: 46.808, lng: -94.14 },
  { lat: 46.798, lng: -94.116 },
  { lat: 46.786, lng: -94.1 },
];

export const CEDARS: LngLat[] = [
  { lat: 46.858, lng: -94.15 },
  { lat: 46.856, lng: -94.142 },
  { lat: 46.86, lng: -94.136 },
  { lat: 46.854, lng: -94.132 },
  { lat: 46.857, lng: -94.126 },
  { lat: 46.852, lng: -94.148 },
];

export const ALDERS: LngLat[] = [
  { lat: 46.868, lng: -94.236 },
  { lat: 46.866, lng: -94.228 },
  { lat: 46.858, lng: -94.252 },
  { lat: 46.852, lng: -94.254 },
  { lat: 46.85, lng: -94.232 },
];

export const QUARRY_RIM: LngLat[] = [
  { lat: 46.796, lng: -94.09 },
  { lat: 46.794, lng: -94.082 },
  { lat: 46.786, lng: -94.078 },
  { lat: 46.778, lng: -94.118 },
];

export const POND_CENTER: LngLat = { lat: 46.799, lng: -94.175 };

export function placeFor(spotId: string): SamplePlace | undefined {
  return SAMPLE_PLACES.find((place) => place.spotId === spotId);
}

export function project(point: LngLat): { x: number; y: number } {
  const x = ((point.lng - MAP_FRAME.west) / (MAP_FRAME.east - MAP_FRAME.west)) * MAP_WIDTH;
  const y = ((MAP_FRAME.north - point.lat) / (MAP_FRAME.north - MAP_FRAME.south)) * MAP_HEIGHT;
  return { x, y };
}

export function linePath(points: LngLat[]): string {
  return points
    .map((point, index) => {
      const { x, y } = project(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ringPath(points: LngLat[]): string {
  return `${linePath(points)} Z`;
}

export function oval(center: LngLat, dLat: number, dLng: number, steps = 16): LngLat[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return {
      lat: center.lat + Math.sin(angle) * dLat,
      lng: center.lng + Math.cos(angle) * dLng,
    };
  });
}

export function formatCoord(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export function formatLat(lat: number): string {
  return `${lat.toFixed(2)}°N`;
}

export function formatLng(lng: number): string {
  return `${Math.abs(lng).toFixed(2)}°W`;
}
