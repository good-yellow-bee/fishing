/** The three hills behind the far shore: centre and radii of each icosphere, and their day and night greens. */
export const FAR_HILLS: { position: [number, number, number]; scale: [number, number, number]; day: string; night: string }[] = [
  { position: [-28, 4.5, -26], scale: [17, 7, 10], day: "#587a5f", night: "#3d5a44" },
  { position: [-5, 5.2, -30], scale: [20, 8, 10], day: "#628468", night: "#456348" },
  { position: [20, 4.6, -27], scale: [18, 7, 11], day: "#547459", night: "#385640" },
];

/** How far toward the lake the hills' face comes at `x` and height `y`: the front-most hill surface there, or null off every hill. */
export function hillFront(x: number, y: number): number | null {
  let front: number | null = null;
  for (const { position: [cx, cy, cz], scale: [rx, ry, rz] } of FAR_HILLS) {
    const k = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
    if (k > 0) front = Math.max(front ?? -Infinity, cz + rz * Math.sqrt(k));
  }
  return front;
}
