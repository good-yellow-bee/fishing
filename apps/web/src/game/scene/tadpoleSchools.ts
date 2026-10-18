import type { LakeHour, LakeSeason } from "@stillwater/shared";

/** The warm shallows where spring's tadpoles mill: off the dock, below the Point, by the Reeds and the Drop-off. */
export const TADPOLE_SCHOOLS: readonly { x: number; z: number }[] = [
  { x: -1.4, z: 8.6 },
  { x: -5.6, z: 10.1 },
  { x: -11.8, z: 7.6 },
  { x: 15.0, z: 6.0 },
];
export const TADPOLES_PER_SCHOOL = 18;
/** How far a school's tadpoles spread about its middle, in metres. */
export const SCHOOL_SPREAD = 0.45;
/** How far a school's middle wanders from its shallows, in metres. */
export const SCHOOL_ROAM = 0.5;

/** Tadpoles fill the shallows in spring, in daylight; they lie low and out of sight at night. */
export function tadpolesOut(season: LakeSeason, hour: LakeHour) {
  return season === "spring" && hour !== "night";
}

function seeded(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Where one tadpole is `time` seconds in, and which way it faces: the school's middle wanders a
 * slow loop round its shallows, and each tadpole darts about it on its own beat, wriggling as it
 * goes. Reduced motion holds the school still where it lies.
 */
export function tadpoleSpot(school: number, index: number, time: number, still = false) {
  const home = TADPOLE_SCHOOLS[school]!;
  const n = school * 100 + index;
  const t = still ? 0 : time;
  const cx = home.x + Math.cos(t * 0.05 + school) * SCHOOL_ROAM;
  const cz = home.z + Math.sin(t * 0.07 + school * 2) * SCHOOL_ROAM * 0.6;
  // Each tadpole circles the middle at its own radius and pace, now one way, now the other.
  const radius = SCHOOL_SPREAD * Math.sqrt(seeded(n, 1));
  const pace = (0.25 + seeded(n, 2) * 0.35) * (seeded(n, 3) < 0.5 ? 1 : -1);
  const angle = seeded(n, 4) * Math.PI * 2 + t * pace;
  const x = cx + Math.cos(angle) * radius;
  const z = cz + Math.sin(angle) * radius;
  // Facing along its circle, with a wriggle.
  const along = angle + (pace > 0 ? Math.PI / 2 : -Math.PI / 2);
  const wriggle = still ? 0 : Math.sin(t * 14 + n) * 0.35;
  return { x, z, yaw: Math.atan2(Math.cos(along), Math.sin(along)) + wriggle };
}
