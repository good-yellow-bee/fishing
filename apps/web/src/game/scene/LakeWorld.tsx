import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DROPOFF_PAD, POINT_PAD, REEDS_PAD, SHOP_X, SHOP_Z, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type Sky as WeatherSky, type SpotId } from "@stillwater/shared";
import { ArticulatedFish } from "./ArticulatedFish";
import { ToonModel } from "./ToonModel";
import { toonRamp } from "./toon";
import {
  BANK_BOARDS,
  BANK_POST,
  BANK_POSTS,
  BANK_STAND_LIFT,
  BANK_STAND_PLANK,
  BANK_THICK,
  BANK_TOP,
  BANK_WALK_PLANK,
  type BankBoard,
} from "./bankWalk";
import { BRIDGE_SCALE, BRIDGE_SPANS, PIER_BOARDS, PIER_PLANK, PIER_THICK, PIER_TOP } from "./pierDeck";
import { LakeRain } from "./LakeRain";
import { bedColor, bedHeight, waterDepthColor, waterHeight, waterHeightWithShoreWeight, waterShoreWeight } from "./water";

type Vec3 = [number, number, number];

export const LAKE_HOUR_LOOK: Record<
  LakeHour,
  {
    fog: string;
    hemiSky: string;
    hemiGround: string;
    hemi: number;
    sun: string;
    sunInt: number;
    sunPos: Vec3;
    sky: [string, string, string];
    disc: string;
    glow: string;
    discPos: Vec3;
    clouds: string;
    water: string;
    waterDrop: string;
    glint: number;
    glitter: boolean;
    birds: boolean;
  }
> = {
  dawn: {
    fog: "#e0c4a8",
    hemiSky: "#f0c8b0",
    hemiGround: "#5a4a38",
    hemi: 0.95,
    sun: "#ffb078",
    sunInt: 1.7,
    sunPos: [20, 12, 14],
    sky: ["#f2d2b0", "#e8a888", "#7a9ab8"],
    disc: "#ffd4a0",
    glow: "#f4c9a0",
    discPos: [32, 14, -58],
    clouds: "#f6e4d0",
    water: "#3d7a88",
    waterDrop: "#2c5a6a",
    glint: 0.85,
    glitter: true,
    birds: true,
  },
  day: {
    fog: "#b6cbd2",
    hemiSky: "#d3e6ef",
    hemiGround: "#41564a",
    hemi: 1.05,
    sun: "#ffdf9e",
    sunInt: 2.5,
    sunPos: [16, 22, 10],
    sky: ["#e6ead8", "#b7d2dc", "#79a8c6"],
    disc: "#fff3cf",
    glow: "#f4e9c5",
    discPos: [38, 34, -62],
    clouds: "#f4f8f6",
    water: "#357795",
    waterDrop: "#2c6784",
    glint: 1,
    glitter: true,
    birds: true,
  },
  dusk: {
    fog: "#c49070",
    hemiSky: "#e8a070",
    hemiGround: "#3a2820",
    hemi: 0.85,
    sun: "#ff8a50",
    sunInt: 1.55,
    sunPos: [-14, 10, 10],
    sky: ["#e8a070", "#c45c48", "#4a3a68"],
    disc: "#ffb070",
    glow: "#e89060",
    discPos: [-32, 12, -52],
    clouds: "#f0c4a8",
    water: "#2a5a6a",
    waterDrop: "#1c4860",
    glint: 0.7,
    glitter: true,
    birds: true,
  },
  night: {
    fog: "#1c2a38",
    hemiSky: "#6a82a0",
    hemiGround: "#1e2a22",
    hemi: 0.5,
    sun: "#c5d0e0",
    sunInt: 0.85,
    sunPos: [-18, 24, 8],
    sky: ["#1a2838", "#24344a", "#0e1620"],
    disc: "#e8eef6",
    glow: "#c5d0e0",
    discPos: [-28, 30, -50],
    clouds: "#3d4a58",
    water: "#1a3a48",
    waterDrop: "#143040",
    glint: 0.18,
    glitter: false,
    birds: false,
  },
};

/** How far each sky grays the hour's palette, dims the sun, and pulls the fog in. */
const WEATHER_TINT: Record<WeatherSky, { mute: number; shade: number; clouds: number; sun: number; near: number; far: number }> = {
  clear: { mute: 0, shade: 1, clouds: 1, sun: 1, near: 1, far: 1 },
  "partly-cloudy": { mute: 0.2, shade: 0.97, clouds: 0.95, sun: 0.85, near: 0.95, far: 0.95 },
  overcast: { mute: 0.6, shade: 0.86, clouds: 0.74, sun: 0.55, near: 0.85, far: 0.85 },
  rain: { mute: 0.72, shade: 0.5, clouds: 0.38, sun: 0.4, near: 0.6, far: 0.7 },
  fog: { mute: 0.8, shade: 1.1, clouds: 1.1, sun: 0.5, near: 0.3, far: 0.45 },
};

export type WeatherLook = {
  sky: [string, string, string];
  fog: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  sunInt: number;
  sunOut: boolean;
  clouds: string;
  rain: boolean;
};

/** Grays a color toward its own brightness rather than a fixed gray, so a rainy night stays a night. */
function mute(color: string, amount: number, shade: number) {
  const tinted = new THREE.Color(color);
  const gray = Math.min(1, (tinted.r * 0.2126 + tinted.g * 0.7152 + tinted.b * 0.0722) * shade);
  return `#${tinted.lerp(new THREE.Color(gray, gray, gray), amount).getHexString()}`;
}

export function weatherLook(hour: LakeHour, sky: WeatherSky): WeatherLook {
  const look = LAKE_HOUR_LOOK[hour];
  const tint = WEATHER_TINT[sky];
  const night = hour === "night";
  return {
    sky: [mute(look.sky[0], tint.mute, tint.shade), mute(look.sky[1], tint.mute, tint.shade), mute(look.sky[2], tint.mute, tint.shade)],
    fog: mute(look.fog, tint.mute, tint.shade),
    fogNear: (night ? 28 : 40) * tint.near,
    fogFar: (night ? 90 : 110) * tint.far,
    hemiSky: mute(look.hemiSky, tint.mute, 1),
    sunInt: look.sunInt * tint.sun,
    sunOut: tint.sun > 0.8,
    clouds: mute(look.clouds, tint.mute, tint.clouds),
    rain: sky === "rain",
  };
}

const MODELS = {
  pine: "/models/tree_detailed.glb",
  pineDark: "/models/tree_detailed_dark.glb",
  oak: "/models/tree_oak.glb",
  oakDark: "/models/tree_oak_dark.glb",
  fat: "/models/tree_fat.glb",
  bushDetailed: "/models/plant_bushDetailed.glb",
  bushLarge: "/models/plant_bushLarge.glb",
  grass: "/models/grass.glb",
  grassLarge: "/models/grass_large.glb",
  canoe: "/models/canoe.glb",
  rowboat: "/models/boat-row-large.glb",
  paddle: "/models/canoe_paddle.glb",
  bridge: "/models/bridge_wood.glb",
  platform: "/models/platform_beach.glb",
  path: "/models/path_wood.glb",
  log: "/models/log.glb",
  lilyLarge: "/models/lily_large.glb",
  lilySmall: "/models/lily_small.glb",
  reed: "/models/grass_leafsLarge.glb",
  grassPlat: "/models/platform_grass.glb",
} as const;

type Scatter = { url: string; position: Vec3; scale: number; rot: number };
type Lily = { url: string; position: Vec3; scale: number };
type BoatProps = { url: string; position: Vec3; heading: number; delay: number; scale: number };
type FishProps = {
  points: Vec3[];
  speed: number;
  phase: number;
  size: number;
  color: string;
  accent: string;
};

// Deterministic pseudo-random in [0, 1) so the layout is stable across renders.
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Ring of scenery around the lake, leaving the dock side (+z) open for the camera.
function scatterRing(count: number, urls: readonly string[], seed: number, spread: number, scaleMin: number, scaleMax: number): Scatter[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI * (0.72 + (1.56 * i) / (count - 1)) + (jitter(seed + i) - 0.5) * 0.14;
    const out = jitter(seed + i + 40) * spread;
    return {
      url: urls[Math.floor(jitter(seed + i + 80) * urls.length)]!,
      position: [Math.cos(angle) * (LAKE_RX + 2.6 + out), -0.08, Math.sin(angle) * (LAKE_RZ + 2.4 + out * 0.7) + LAKE_CENTER_Z] as Vec3,
      scale: scaleMin + jitter(seed + i + 120) * (scaleMax - scaleMin),
      rot: jitter(seed + i + 160) * Math.PI * 2,
    };
  });
}

const TREE_URLS = [MODELS.pine, MODELS.pineDark, MODELS.pine, MODELS.oak, MODELS.fat, MODELS.pineDark, MODELS.oakDark] as const;
const TREES = scatterRing(22, TREE_URLS, 3, 6, 3.4, 5.6);
const BACK_TREES = scatterRing(14, [MODELS.pineDark, MODELS.oakDark, MODELS.pine], 57, 6, 4.6, 6.4).map((tree) => ({
  ...tree,
  position: [tree.position[0] * 1.18, tree.position[1], tree.position[2] * 1.24 - 1.5] as Vec3,
}));
const BUSHES = scatterRing(10, [MODELS.bushDetailed, MODELS.bushLarge], 11, 2.2, 1.1, 2.1);
const GRASS = scatterRing(16, [MODELS.grass, MODELS.grassLarge], 23, 1.4, 1.2, 2.2);

const NEAR_GRASS: Scatter[] = [
  { url: MODELS.grassLarge, position: [-4.6, -0.02, 9.6], scale: 1.9, rot: 0.6 },
  { url: MODELS.grass, position: [-3.1, -0.02, 10.4], scale: 1.5, rot: 2.3 },
  { url: MODELS.grassLarge, position: [3.4, -0.02, 10.1], scale: 1.7, rot: 4.1 },
  { url: MODELS.grass, position: [5, -0.02, 9.3], scale: 1.4, rot: 1.2 },
  { url: MODELS.bushDetailed, position: [-6.4, -0.02, 9], scale: 1.4, rot: 0.9 },
  { url: MODELS.bushLarge, position: [7.1, -0.02, 9.8], scale: 1.3, rot: 2.8 },
  { url: MODELS.grassLarge, position: [3.8, -0.02, 14.2], scale: 1.8, rot: 0.4 },
  { url: MODELS.grass, position: [6.6, -0.02, 16.1], scale: 1.5, rot: 2.1 },
  { url: MODELS.bushDetailed, position: [8.2, -0.02, 14.8], scale: 1.5, rot: 1.4 },
  { url: MODELS.bushLarge, position: [2.1, -0.02, 16.6], scale: 1.35, rot: 3.2 },
];

const LILIES: Lily[] = [
  { url: MODELS.lilyLarge, position: [-8.4, 0.04, 5.5], scale: 1.35 },
  { url: MODELS.lilySmall, position: [-6.8, 0.04, 4.8], scale: 1.5 },
  { url: MODELS.lilyLarge, position: [7.8, 0.04, -8.4], scale: 1.2 },
  { url: MODELS.lilySmall, position: [9.1, 0.04, -7.7], scale: 1.4 },
  { url: MODELS.lilySmall, position: [-12.2, 0.04, -4.1], scale: 1.2 },
  { url: MODELS.lilyLarge, position: [-10.6, 0.04, -6.8], scale: 1.15 },
];

const BOATS: BoatProps[] = [
  { url: MODELS.canoe, position: [-8.5, 0.08, -5], heading: 0.72, delay: 0.2, scale: 2.6 },
  { url: MODELS.rowboat, position: [10.5, 0.06, -9.8], heading: -0.82, delay: 1.4, scale: 0.66 },
];

const FISH: FishProps[] = [
  {
    points: [[-8, -0.36, 3], [-2, -0.24, 5], [5, -0.41, 2], [7, -0.31, -4], [1, -0.48, -7], [-7, -0.34, -5]],
    speed: 0.027,
    phase: 0,
    size: 1.05,
    color: "#b9673e",
    accent: "#e7bd72",
  },
  {
    points: [[3, -0.46, 4], [9, -0.26, 0], [6, -0.41, -7], [-1, -0.36, -9], [-5, -0.26, -3]],
    speed: 0.034,
    phase: 0.22,
    size: 0.85,
    color: "#779057",
    accent: "#c6ce85",
  },
  {
    points: [[-12, -0.28, -1], [-8, -0.44, -8], [-1, -0.52, -11], [4, -0.34, -6], [0, -0.28, 0]],
    speed: 0.023,
    phase: 0.48,
    size: 1.12,
    color: "#566f78",
    accent: "#b7c7bd",
  },
  {
    points: [[-5, -0.32, 1], [0, -0.24, 3], [5, -0.36, -1], [2, -0.48, -5], [-4, -0.32, -4]],
    speed: 0.039,
    phase: 0.67,
    size: 0.8,
    color: "#c5893d",
    accent: "#f1cf77",
  },
  {
    points: [[8, -0.32, 2], [12, -0.44, -4], [7, -0.41, -10], [1, -0.28, -7], [2, -0.36, -1]],
    speed: 0.031,
    phase: 0.84,
    size: 0.95,
    color: "#8b5c4b",
    accent: "#d4a071",
  },
];

// Streak of sparkle quads on the water toward the sun disc at [38, 34, -62].
const GLITTER_DIR = new THREE.Vector2(38, -60).normalize();
const GLITTER_ANGLE = Math.atan2(60, 38);
const GLITTER_QUADS = Array.from({ length: 16 }, (_, i) => {
  const dist = 2.5 + (i / 15) * 12;
  const side = (jitter(i + 7) - 0.5) * (1 + dist * 0.16);
  return {
    x: GLITTER_DIR.x * dist - GLITTER_DIR.y * side,
    z: LAKE_CENTER_Z + GLITTER_DIR.y * dist + GLITTER_DIR.x * side,
    scale: 0.3 + jitter(i + 31) * 0.45,
    mat: i % 3,
  };
});

const WING_GEOMETRY = new THREE.BufferGeometry();
WING_GEOMETRY.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.09, 0.7, 0.04, 0, 0, 0, -0.11], 3));
WING_GEOMETRY.computeVertexNormals();
const BIRD_MATERIAL = new THREE.MeshBasicMaterial({ color: "#2b3138", fog: false, side: THREE.DoubleSide });

type FlockProps = { y: number; z: number; speed: number; offset: number; dir: 1 | -1; birds: Vec3[] };

const FLOCKS: FlockProps[] = [
  { y: 18, z: -32, speed: 1.1, offset: 20, dir: 1, birds: [[0, 0, 0], [-1.3, 0.4, 0.9], [1.2, 0.25, -0.8], [-2.4, -0.1, -0.6]] },
  { y: 15.5, z: -18, speed: 0.85, offset: 68, dir: -1, birds: [[0, 0, 0], [1.4, 0.35, 0.7], [-1.2, 0.2, -0.9]] },
];

type DuckProps = { points: Vec3[]; speed: number; phase: number; body: string; head: string };

const DUCKS: DuckProps[] = [
  {
    points: [[-9, 0, 4], [-6.5, 0, 5], [-4.8, 0, 3.2], [-6.8, 0, 2], [-9.5, 0, 2.6]],
    speed: 0.02,
    phase: 0,
    body: "#8a6842",
    head: "#3f7d6d",
  },
  {
    points: [[7, 0, -6.5], [9.5, 0, -7], [9.6, 0, -8.4], [8, 0, -10], [6.2, 0, -8.5]],
    speed: 0.016,
    phase: 0.45,
    body: "#9c7a4f",
    head: "#45607a",
  },
];

type DragonflyProps = { center: Vec3; size: number; speed: number; phase: number };

const DRAGONFLIES: DragonflyProps[] = [
  { center: [-4.2, 0.85, 9.1], size: 1.1, speed: 0.7, phase: 0 },
  { center: [-7.6, 0.7, 4.6], size: 0.9, speed: 0.55, phase: 2.4 },
];

for (const url of Object.values(MODELS)) useGLTF.preload(url);

function pushDiscIndices(rings: number, segments: number, indices: number[]) {
  for (let s = 0; s < segments; s += 1) {
    indices.push(0, 1 + s, 1 + ((s + 1) % segments));
  }
  for (let r = 0; r < rings - 1; r += 1) {
    const inner = 1 + r * segments;
    const outer = inner + segments;
    for (let s = 0; s < segments; s += 1) {
      const next = (s + 1) % segments;
      const a = inner + s;
      const b = inner + next;
      const c = outer + s;
      const d = outer + next;
      indices.push(a, c, d);
      indices.push(a, d, b);
    }
  }
}

// Shelf near the bank, basin in the middle. Local +Z is world up after the mesh pitch.
function makeBedSurface(radiusX: number, radiusZ: number) {
  const rings = 18;
  const segments = 72;
  const count = 1 + rings * segments;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const indices: number[] = [];
  const setVert = (i: number, x: number, y: number) => {
    const worldZ = -y + LAKE_CENTER_Z;
    const tint = bedColor(x, worldZ);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = bedHeight(x, worldZ);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  };
  setVert(0, 0, 0);
  for (let r = 1; r <= rings; r += 1) {
    const f = r / rings;
    for (let s = 0; s < segments; s += 1) {
      const angle = (s / segments) * Math.PI * 2;
      const edge = lakeEdge(angle);
      setVert(1 + (r - 1) * segments + s, Math.cos(angle) * radiusX * edge * f, Math.sin(angle) * radiusZ * edge * f);
    }
  }
  pushDiscIndices(rings, segments, indices);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// Concentric rings so the surface can chop. Local +Z is world up after the mesh pitch.
function makeWaveSurface(radiusX: number, radiusZ: number) {
  const rings = 24;
  const segments = 84;
  const count = 1 + rings * segments;
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 2);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  const spanX = radiusX * 2;
  const spanZ = radiusZ * 2;
  const setVert = (i: number, x: number, y: number) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    base[i * 2] = x;
    base[i * 2 + 1] = y;
    uvs[i * 2] = x / spanX + 0.5;
    uvs[i * 2 + 1] = y / spanZ + 0.5;
  };
  setVert(0, 0, 0);
  for (let r = 1; r <= rings; r += 1) {
    const f = r / rings;
    for (let s = 0; s < segments; s += 1) {
      const angle = (s / segments) * Math.PI * 2;
      const edge = lakeEdge(angle);
      setVert(1 + (r - 1) * segments + s, Math.cos(angle) * radiusX * edge * f, Math.sin(angle) * radiusZ * edge * f);
    }
  }
  pushDiscIndices(rings, segments, indices);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.base = base;
  const shoreWeights = new Float32Array(position.count);
  const tints = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = base[i * 2]!;
    const worldZ = -base[i * 2 + 1]! + LAKE_CENTER_Z;
    shoreWeights[i] = waterShoreWeight(x, worldZ);
    const tint = waterDepthColor(x, worldZ);
    tints[i * 3] = tint.r;
    tints[i * 3 + 1] = tint.g;
    tints[i * 3 + 2] = tint.b;
  }
  geometry.userData.shoreWeights = shoreWeights;
  geometry.userData.tints = tints;
  return geometry;
}

function displaceWater(geometry: THREE.BufferGeometry, time: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const base = geometry.userData.base as Float32Array;
  const shoreWeights = geometry.userData.shoreWeights as Float32Array;
  const tints = geometry.userData.tints as Float32Array;
  let colors = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colors) {
    colors = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
    geometry.setAttribute("color", colors);
  }
  for (let i = 0; i < position.count; i += 1) {
    const x = base[i * 2]!;
    const y = base[i * 2 + 1]!;
    const worldZ = -y + LAKE_CENTER_Z;
    const height = waterHeightWithShoreWeight(x, worldZ, time, shoreWeights[i]!);
    position.setZ(i, height);
    const crest = 1 + height * 0.55;
    colors.setXYZ(i, tints[i * 3]! * crest, tints[i * 3 + 1]! * crest, tints[i * 3 + 2]! * crest);
  }
  colors.needsUpdate = true;
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function edgePoints(offset: number) {
  return Array.from({ length: 96 }, (_, i) => {
    const angle = (i / 96) * Math.PI * 2;
    const edge = lakeEdge(angle);
    return new THREE.Vector2(Math.cos(angle) * (LAKE_RX * edge + offset), Math.sin(angle) * (LAKE_RZ * edge + offset));
  });
}

function makeEdgeRingGeometry(outerOffset: number, innerOffset: number) {
  const shape = new THREE.Shape(edgePoints(outerOffset));
  shape.holes.push(new THREE.Path(edgePoints(innerOffset).reverse()));
  return new THREE.ShapeGeometry(shape);
}

// Terrain with a lake-shaped hole so the lakebed and fish stay visible under the water.
function makeGroundGeometry() {
  const shape = new THREE.Shape([
    new THREE.Vector2(-55, -39.5),
    new THREE.Vector2(55, -39.5),
    new THREE.Vector2(55, 45.5),
    new THREE.Vector2(-55, 45.5),
  ]);
  shape.holes.push(new THREE.Path(edgePoints(0.15).reverse()));
  return new THREE.ShapeGeometry(shape);
}

// Subtle wave streaks multiplied over the water color; offset scrolls each frame.
function makeWaterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2f8f9";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i += 1) {
    const y = jitter(i + 1) * 256;
    const x = jitter(i + 50) * 256;
    const w = 24 + jitter(i + 100) * 56;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.32)" : "rgba(170,200,212,0.22)";
    ctx.lineWidth = 1 + jitter(i + 150) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + 4, x + w / 2, y);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  return texture;
}

// Faint dappled layer scrolled opposite the wave streaks for extra surface life.
function makeWaterDetailTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 30; i += 1) {
    const x = jitter(i + 400) * 128;
    const y = jitter(i + 440) * 128;
    const r = 6 + jitter(i + 480) * 14;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(150,190,205,0.14)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 4);
  return texture;
}

function makeSkyTexture(bottom: string, mid: string, top: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 256, 0, 0);
  gradient.addColorStop(0, bottom);
  gradient.addColorStop(0.42, mid);
  gradient.addColorStop(1, top);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Sky({ hour, weather }: { hour: LakeHour; weather: WeatherLook }) {
  const look = LAKE_HOUR_LOOK[hour];
  const texture = useMemo(() => makeSkyTexture(...weather.sky), [weather.sky]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      <mesh scale={90}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
      </mesh>
      {weather.sunOut && (
        <mesh position={look.discPos}>
          <circleGeometry args={[hour === "night" ? 4.2 : 5.5, 24]} />
          <meshBasicMaterial color={look.disc} fog={false} />
        </mesh>
      )}
      <mesh position={[look.discPos[0], look.discPos[1], look.discPos[2] + 0.2]}>
        <circleGeometry args={[hour === "night" ? 7 : 9, 24]} />
        <meshBasicMaterial
          color={look.glow}
          transparent
          opacity={(hour === "night" ? 0.22 : 0.35) * (weather.sunOut ? 1 : 0.5)}
          fog={false}
        />
      </mesh>
    </>
  );
}

const CLOUDS: { y: number; z: number; scale: number; speed: number; offset: number }[] = [
  { y: 17, z: -38, scale: 1, speed: 0.32, offset: 0 },
  { y: 21, z: -28, scale: 1.5, offset: 30, speed: 0.24 },
  { y: 14.5, z: -47, scale: 0.8, offset: 55, speed: 0.42 },
  { y: 19, z: -34, scale: 1.2, offset: 72, speed: 0.28 },
];

function Cloud({ y, z, scale, speed, offset, color }: (typeof CLOUDS)[number] & { color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = ((state.clock.elapsedTime * speed + offset) % 110) - 55;
  });
  return (
    <group ref={ref} position={[0, y, z]} scale={scale}>
      <mesh position={[0, 0, 0]} scale={[2.6, 1.1, 1.6]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
      <mesh position={[1.9, 0.35, 0.2]} scale={[1.5, 0.85, 1.2]}>
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
      <mesh position={[-1.8, 0.2, -0.3]} scale={[1.3, 0.7, 1]}>
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
    </group>
  );
}

function LakeSurface({ spot, hour }: { spot: SpotId; hour: LakeHour }) {
  const look = LAKE_HOUR_LOOK[hour];
  const material = useRef<THREE.MeshToonMaterial>(null);
  const glintA = useRef<THREE.MeshBasicMaterial>(null);
  const glintB = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => makeWaveSurface(LAKE_RX, LAKE_RZ), []);
  const bedGeometry = useMemo(() => makeBedSurface(LAKE_RX + 0.35, LAKE_RZ + 0.35), []);
  const foamGeometry = useMemo(() => makeEdgeRingGeometry(0.32, 0.02), []);
  const waterMap = useMemo(() => makeWaterTexture(), []);
  const detailMap = useMemo(() => makeWaterDetailTexture(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      bedGeometry.dispose();
      foamGeometry.dispose();
      waterMap.dispose();
      detailMap.dispose();
    };
  }, [geometry, bedGeometry, foamGeometry, waterMap, detailMap]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    displaceWater(geometry, t);
    waterMap.offset.x += delta * 0.014;
    waterMap.offset.y += delta * 0.008;
    detailMap.offset.x -= delta * 0.006;
    detailMap.offset.y += delta * 0.004;
    if (material.current) material.current.opacity = 0.8 + Math.sin(t * 0.45) * 0.02;
    if (glintA.current) glintA.current.opacity = look.glint * (0.14 + Math.sin(t * 0.65) * 0.05);
    if (glintB.current) glintB.current.opacity = look.glint * (0.1 + Math.sin(t * 0.52 + 2) * 0.04);
  });

  return (
    <group position={[0, 0, LAKE_CENTER_Z]}>
      <mesh geometry={bedGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshToonMaterial color="#ffffff" vertexColors gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshToonMaterial
          ref={material}
          color={spot === "dropoff" ? look.waterDrop : look.water}
          map={waterMap}
          vertexColors
          gradientMap={toonRamp()}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <meshBasicMaterial map={detailMap} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh geometry={foamGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <meshBasicMaterial color="#e9f3ef" transparent opacity={hour === "night" ? 0.08 : 0.3} depthWrite={false} />
      </mesh>
      <mesh position={[-5, 0.035, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.8, 0.55, 1]}>
        <ringGeometry args={[2.4, 2.48, 64]} />
        <meshBasicMaterial ref={glintA} color="#e3f0ec" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh position={[7, 0.038, -4]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 0.42, 1]}>
        <ringGeometry args={[3.2, 3.3, 64]} />
        <meshBasicMaterial ref={glintB} color="#d8eae6" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Hill({ position, scale, color }: { position: Vec3; scale: Vec3; color: string }) {
  return (
    <mesh position={position} scale={scale} castShadow={false}>
      <icosahedronGeometry args={[1, 2]} />
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </mesh>
  );
}

function Rock({ position, scale, rotation = 0 }: { position: Vec3; scale: Vec3; rotation?: number }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.15, rotation, -0.08]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshToonMaterial color="#75796f" gradientMap={toonRamp()} />
    </mesh>
  );
}

function FloatingLily({ url, position, scale }: Lily) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const lily = ref.current;
    if (!lily) return;
    const t = state.clock.elapsedTime;
    const y = waterHeight(position[0], position[2], t);
    const sample = 0.5;
    lily.position.set(position[0], position[1] + y, position[2]);
    lily.rotation.x = THREE.MathUtils.clamp((waterHeight(position[0], position[2] + sample, t) - y) * 1.3, -0.28, 0.28);
    lily.rotation.z = THREE.MathUtils.clamp((y - waterHeight(position[0] + sample, position[2], t)) * 1.3, -0.28, 0.28);
  });
  return (
    <group ref={ref} position={position}>
      <ToonModel url={url} scale={scale} shadows={false} />
    </group>
  );
}

function Boat({ url, position, heading, delay, scale }: BoatProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const boat = ref.current;
    if (!boat) return;
    const t = state.clock.elapsedTime + delay;
    const y = waterHeight(position[0], position[2], t);
    const sample = 0.75;
    boat.position.y = position[1] + y;
    boat.rotation.x = THREE.MathUtils.clamp((waterHeight(position[0], position[2] + sample, t) - y) * 1.15, -0.2, 0.2);
    boat.rotation.z = THREE.MathUtils.clamp((y - waterHeight(position[0] + sample, position[2], t)) * 1.15, -0.2, 0.2);
    boat.rotation.y = heading + Math.sin(t * 0.35) * 0.04;
  });
  return (
    <group ref={ref} position={position} rotation={[0, heading, 0]}>
      <ToonModel url={url} scale={scale} shadows={false} />
    </group>
  );
}

function SwimmingFish({ points, speed, phase, size, color, accent }: FishProps) {
  const ref = useRef<THREE.Group>(null);
  const bank = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Group>(null);
  const rippleMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true, "catmullrom", 0.35), [points]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const fish = ref.current;
    if (!fish) return;
    const time = state.clock.elapsedTime;
    const t = (time * speed + phase) % 1;
    curve.getPointAt(t, position);
    // Heading from a small look-ahead; getTangentAt allocates internally.
    curve.getPointAt((t + 0.01) % 1, tangent).sub(position);
    // Keep the whole fish body between the surface and the bed.
    const half = 0.34 * size;
    const surface = waterHeight(position.x, position.z, time);
    position.y = THREE.MathUtils.clamp(
      position.y + Math.sin(time * 0.9 + phase * 20) * 0.05,
      -1 + half,
      surface - 0.07 - half,
    );
    fish.position.copy(position);
    const target = Math.atan2(tangent.x, tangent.z);
    const turn = Math.atan2(Math.sin(target - fish.rotation.y), Math.cos(target - fish.rotation.y));
    fish.rotation.y += turn * (1 - Math.exp(-5 * delta));
    if (bank.current) {
      const targetBank = THREE.MathUtils.clamp(-turn * 0.7, -0.22, 0.22);
      bank.current.rotation.z = THREE.MathUtils.damp(bank.current.rotation.z, targetBank, 7, delta);
    }
    if (ripple.current && rippleMaterial.current) {
      // Ripple stays on the water surface above the fish; child y compensates group y and scale.
      ripple.current.position.y = (surface + 0.03 - position.y) / size;
      const pulse = (time * 0.55 + phase) % 1;
      ripple.current.scale.setScalar((0.7 + pulse * 1.9) / size);
      rippleMaterial.current.opacity = (1 - pulse) * 0.16;
    }
  });

  return (
    <group ref={ref} scale={size}>
      <group ref={bank}>
        <ArticulatedFish color={color} accent={accent} phase={phase * 10} speed={0.85 + speed * 8} />
      </group>
      <group ref={ripple}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.58, 24]} />
          <meshBasicMaterial ref={rippleMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function SunGlitter() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 0.28), []);
  const materials = useMemo(
    () =>
      [0, 1, 2].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: "#fdf3d3",
            transparent: true,
            opacity: 0.1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [],
  );
  const bands = useMemo(() => [0, 1, 2].map((mat) => GLITTER_QUADS.filter((quad) => quad.mat === mat)), []);
  const helper = useMemo(() => new THREE.Object3D(), []);
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  useEffect(() => {
    return () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    };
  }, [geometry, materials]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    helper.rotation.set(-Math.PI / 2, 0, GLITTER_ANGLE);
    for (let i = 0; i < materials.length; i += 1) {
      materials[i]!.opacity = 0.04 + (Math.sin(t * (0.9 + i * 0.33) + i * 2.1) * 0.5 + 0.5) * 0.09;
      const mesh = meshes.current[i];
      const quads = bands[i];
      if (!mesh || !quads) continue;
      quads.forEach((quad, j) => {
        helper.position.set(quad.x, waterHeight(quad.x, quad.z, t) + 0.07, quad.z);
        helper.scale.setScalar(quad.scale);
        helper.updateMatrix();
        mesh.setMatrixAt(j, helper.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  return bands.map((quads, i) => (
    <instancedMesh
      key={i}
      args={[geometry, materials[i], quads.length]}
      frustumCulled={false}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
    />
  ));
}

function Bird({ position, phase, flap }: { position: Vec3; phase: number; flap: number }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame((state) => {
    const f = Math.sin(state.clock.elapsedTime * flap + phase) * 0.55 + 0.15;
    if (left.current) left.current.rotation.z = f;
    if (right.current) right.current.rotation.z = -f;
  });
  return (
    <group position={position}>
      <group ref={left}>
        <mesh geometry={WING_GEOMETRY} material={BIRD_MATERIAL} />
      </group>
      <group ref={right} scale={[-1, 1, 1]}>
        <mesh geometry={WING_GEOMETRY} material={BIRD_MATERIAL} />
      </group>
    </group>
  );
}

function BirdFlock({ y, z, speed, offset, dir, birds }: FlockProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = dir * (((state.clock.elapsedTime * speed + offset) % 110) - 55);
  });
  return (
    <group ref={ref} position={[0, y, z]} rotation={[0, Math.PI / 2, 0]}>
      {birds.map((position, i) => (
        <Bird key={i} position={position} phase={i * 1.9} flap={6.5 + (i % 3) * 0.7} />
      ))}
    </group>
  );
}

function Duck({ points, speed, phase, body, head }: DuckProps) {
  const ref = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Group>(null);
  const rippleMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true, "catmullrom", 0.4), [points]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const duck = ref.current;
    if (!duck) return;
    const t = (state.clock.elapsedTime * speed + phase) % 1;
    curve.getPointAt(t, position);
    // Heading from a small look-ahead; getTangentAt allocates internally.
    curve.getPointAt((t + 0.01) % 1, tangent).sub(position);
    const time = state.clock.elapsedTime;
    position.y = waterHeight(position.x, position.z, time) + 0.08 + Math.sin(time * 1.3 + phase * 9) * 0.015;
    duck.position.copy(position);
    const target = Math.atan2(tangent.x, tangent.z);
    const turn = Math.atan2(Math.sin(target - duck.rotation.y), Math.cos(target - duck.rotation.y));
    duck.rotation.y += turn * (1 - Math.exp(-4 * delta));
    if (ripple.current && rippleMaterial.current) {
      const pulse = (state.clock.elapsedTime * 0.5 + phase) % 1;
      ripple.current.scale.setScalar(0.7 + pulse * 1.6);
      rippleMaterial.current.opacity = (1 - pulse) * 0.14;
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.09, 0]} scale={[0.19, 0.15, 0.3]} castShadow={false}>
        <sphereGeometry args={[1, 12, 9]} />
        <meshToonMaterial color={body} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[0, 0.26, 0.2]} scale={0.1} castShadow={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshToonMaterial color={head} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[0, 0.25, 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow={false}>
        <coneGeometry args={[0.035, 0.09, 6]} />
        <meshToonMaterial color="#d8a13c" gradientMap={toonRamp()} />
      </mesh>
      <group ref={ripple} position={[0, -0.02, -0.18]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.38, 24]} />
          <meshBasicMaterial ref={rippleMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Dragonfly({ center, size, speed, phase }: DragonflyProps) {
  const ref = useRef<THREE.Group>(null);
  const wingMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#e6f1f2", transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );
  useEffect(() => () => wingMaterial.dispose(), [wingMaterial]);
  useFrame((state) => {
    const fly = ref.current;
    if (!fly) return;
    const t = state.clock.elapsedTime * speed + phase;
    fly.position.set(
      center[0] + Math.sin(t) * size,
      center[1] + Math.sin(t * 2.7) * 0.14,
      center[2] + Math.sin(t * 2) * size * 0.55,
    );
    fly.rotation.y = Math.atan2(Math.cos(t), Math.cos(t * 2) * 1.1);
    wingMaterial.opacity = 0.18 + (Math.sin(state.clock.elapsedTime * 34 + phase) * 0.5 + 0.5) * 0.16;
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={false}>
        <capsuleGeometry args={[0.02, 0.3, 3, 6]} />
        <meshToonMaterial color="#3d6f78" gradientMap={toonRamp()} />
      </mesh>
      <mesh material={wingMaterial} position={[0, 0.03, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.09]} />
      </mesh>
      <mesh material={wingMaterial} position={[0, 0.03, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.08]} />
      </mesh>
    </group>
  );
}

type BankPlank = { board: BankBoard; index: number };

function bankPlankBatches() {
  const batches = new Map<string, BankPlank[]>();
  BANK_BOARDS.forEach((board, index) => {
    const colors = board.kind === "stand" ? BANK_STAND_PLANK : BANK_WALK_PLANK;
    const color = colors[index % 2];
    const batch = batches.get(color);
    const plank = { board, index };
    if (batch) batch.push(plank);
    else batches.set(color, [plank]);
  });
  return [...batches].map(([color, planks]) => ({ color, planks }));
}

export const BANK_PLANK_BATCHES = bankPlankBatches();

/** Matrix for one board; unit geometry keeps all planks in four draw calls. */
export function bankPlankMatrix(board: BankBoard, index: number) {
  const stand = board.kind === "stand";
  const y = BANK_TOP - BANK_THICK / 2 + (stand ? BANK_STAND_LIFT : 0) + (index % 2) * 0.001;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(board.x, y, board.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, board.yaw, 0)),
    new THREE.Vector3(board.halfX * 2, BANK_THICK, board.halfZ * 2),
  );
}

export function placeBankPlanks(mesh: THREE.InstancedMesh, planks: readonly BankPlank[]) {
  planks.forEach(({ board, index }, instance) => mesh.setMatrixAt(instance, bankPlankMatrix(board, index)));
  mesh.instanceMatrix.needsUpdate = true;
  // Culling and shadow passes cache the first bounds three computes, which may predate these matrices.
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

function BankPlanks({ color, planks }: { color: string; planks: readonly BankPlank[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (mesh.current) placeBankPlanks(mesh.current, planks);
  }, [planks]);

  // R3F disposes child geometry and material on unmount; an effect cleanup would also fire on StrictMode's dev replay.
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, planks.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </instancedMesh>
  );
}

function BankWalks() {
  return (
    <group>
      {BANK_PLANK_BATCHES.map(({ color, planks }) => (
        <BankPlanks key={color} color={color} planks={planks} />
      ))}
      {BANK_POSTS.map((post) => (
        <mesh key={`${post.spot}-post`} position={[post.x, 0.52, post.z]} castShadow>
          <boxGeometry args={[0.16, 1.04, 0.16]} />
          <meshToonMaterial color={BANK_POST} gradientMap={toonRamp()} />
        </mesh>
      ))}
    </group>
  );
}

function PierDeck() {
  return PIER_BOARDS.map((board, i) => (
    <mesh
      key={i}
      position={[board.x, PIER_TOP - PIER_THICK / 2 + (i % 2) * 0.001, board.z]}
      rotation={[0, board.yaw, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[board.halfX * 2, PIER_THICK, board.halfZ * 2]} />
      <meshToonMaterial color={PIER_PLANK[i % 2]} gradientMap={toonRamp()} />
    </mesh>
  ));
}

function Dock() {
  return (
    <group>
      {BRIDGE_SPANS.map((z) => (
        <ToonModel key={z} url={MODELS.bridge} position={[0, 0, z]} rotation={[0, Math.PI / 2, 0]} scale={BRIDGE_SCALE} />
      ))}
      <PierDeck />
      <ToonModel url={MODELS.platform} position={[0, 0, 7.9]} scale={1.55} />
      <ToonModel url={MODELS.log} position={[1.35, 0.12, 7.2]} rotation={[0, 0.5, 0]} scale={1.1} />
      <ToonModel url={MODELS.paddle} position={[-1, 0.18, 7.05]} rotation={[0.15, 0.6, 1.15]} scale={1.25} />
    </group>
  );
}

function Shack() {
  return (
    <group position={[SHOP_X, 0, SHOP_Z]}>
      <ToonModel url={MODELS.grassPlat} position={[0, 0, 0]} scale={2.2} />
      <ToonModel url={MODELS.platform} position={[0, 0.02, -0.2]} scale={1.7} />
      <ToonModel url={MODELS.log} position={[-0.85, 0.22, 0.55]} rotation={[0, 1.2, 0]} scale={1.15} />
      <ToonModel url={MODELS.log} position={[0.9, 0.22, 0.45]} rotation={[0, -0.4, 0]} scale={1.05} />
      <ToonModel url={MODELS.log} position={[0.1, 0.38, -0.7]} rotation={[0, 0.2, 0]} scale={1.3} />
      <ToonModel url={MODELS.paddle} position={[-1.15, 0.7, 0.1]} rotation={[0.2, 0.4, 1.2]} scale={1.4} />
      <ToonModel url={MODELS.bushDetailed} position={[1.8, 0, -1.1]} scale={1.4} shadows={false} sitOnGround />
      <ToonModel url={MODELS.fat} position={[3.4, 0, 1.2]} scale={3.8} sitOnGround />
      <ToonModel url={MODELS.oak} position={[-3.2, 0, 1.6]} scale={3.2} sitOnGround />
    </group>
  );
}

function ShorePath() {
  return (
    <group>
      <ToonModel url={MODELS.path} position={[-6.2, 0.02, 11.2]} rotation={[0, 1.2, 0]} scale={1.55} />
      <ToonModel url={MODELS.path} position={[-9.8, 0.02, 10.4]} rotation={[0, 0.9, 0]} scale={1.5} />
      <ToonModel url={MODELS.path} position={[8.4, 0.02, 11]} rotation={[0, -1.05, 0]} scale={1.5} />
      <ToonModel url={MODELS.path} position={[12.2, 0.02, 9.6]} rotation={[0, -0.85, 0]} scale={1.45} />
      <ToonModel url={MODELS.log} position={[REEDS_PAD.x + 1.1, 0.12, REEDS_PAD.z + 0.4]} rotation={[0, 0.8, 0]} scale={1.05} />
      <ToonModel url={MODELS.log} position={[POINT_PAD.x + 1.15, 0.12, POINT_PAD.z + 0.35]} rotation={[0, -0.4, 0]} scale={1.05} />
      <Rock position={[DROPOFF_PAD.x - 0.8, 0.4, DROPOFF_PAD.z + 0.6]} scale={[1.3, 0.7, 1]} rotation={0.4} />
      <Rock position={[DROPOFF_PAD.x + 0.9, 0.32, DROPOFF_PAD.z - 0.3]} scale={[0.9, 0.5, 0.75]} rotation={1.6} />
    </group>
  );
}

function Reeds({ count, origin }: { count: number; origin: Vec3 }) {
  const keyPrefix = origin.join("-");
  return Array.from({ length: count }, (_, i) => (
    <ToonModel
      key={`${keyPrefix}-${i}`}
      url={MODELS.reed}
      position={[origin[0] + (i % 4) * 0.52, origin[1], origin[2] - Math.floor(i / 4) * 0.44]}
      rotation={[0, i * 0.73, 0]}
      scale={1.45 + (i % 3) * 0.16}
      shadows={false}
    />
  ));
}

function ScatterModels({ items, shadows = false }: { items: Scatter[]; shadows?: boolean }) {
  return items.map((item, i) => (
    <ToonModel
      key={`${item.url}-${i}`}
      url={item.url}
      position={item.position}
      rotation={[0, item.rot, 0]}
      scale={item.scale}
      shadows={shadows}
      sitOnGround
    />
  ));
}

export function LakeWorld({ spot, hour, sky }: { spot: SpotId; hour: LakeHour; sky: WeatherSky }) {
  const look = LAKE_HOUR_LOOK[hour];
  const weather = useMemo(() => weatherLook(hour, sky), [hour, sky]);
  const shore = useMemo(() => makeEdgeRingGeometry(1.8, 0.15), []);
  const ground = useMemo(() => makeGroundGeometry(), []);
  useEffect(() => {
    return () => {
      shore.dispose();
      ground.dispose();
    };
  }, [shore, ground]);
  return (
    <>
      <fog attach="fog" args={[weather.fog, weather.fogNear, weather.fogFar]} />
      <hemisphereLight args={[weather.hemiSky, look.hemiGround, look.hemi]} />
      <directionalLight
        castShadow
        position={look.sunPos}
        intensity={weather.sunInt}
        color={look.sun}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={22}
        shadow-camera-bottom={-20}
      />
      <Sky hour={hour} weather={weather} />
      {CLOUDS.map((cloud, i) => (
        <Cloud key={i} {...cloud} color={weather.clouds} />
      ))}
      <mesh geometry={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, LAKE_CENTER_Z]} receiveShadow>
        <meshToonMaterial color={hour === "night" ? "#3a5240" : "#4d6c48"} gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={shore} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, LAKE_CENTER_Z]} receiveShadow>
        <meshToonMaterial color={hour === "night" ? "#6a5a42" : "#9a815b"} gradientMap={toonRamp()} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, -0.48, -5]} scale={[1.7, 1, 1]}>
        <circleGeometry args={[4.2, 48]} />
        <meshBasicMaterial color="#1c3d4c" transparent opacity={spot === "dropoff" ? 0.62 : 0.38} />
      </mesh>
      <LakeSurface spot={spot} hour={hour} />

      <Hill position={[-28, 4.5, -26]} scale={[17, 7, 10]} color={hour === "night" ? "#3d5a44" : "#587a5f"} />
      <Hill position={[-5, 5.2, -30]} scale={[20, 8, 10]} color={hour === "night" ? "#456348" : "#628468"} />
      <Hill position={[20, 4.6, -27]} scale={[18, 7, 11]} color={hour === "night" ? "#385640" : "#547459"} />
      <ScatterModels items={BACK_TREES} />
      <ScatterModels items={TREES} />
      <ScatterModels items={BUSHES} />
      <ScatterModels items={GRASS} />
      <ScatterModels items={NEAR_GRASS} />
      <Rock position={[-17.5, 0.45, 6.2]} scale={[1.7, 0.75, 1.15]} rotation={0.3} />
      <Rock position={[16.2, 0.5, 3.5]} scale={[1.4, 0.85, 1.1]} rotation={1.1} />
      <Rock position={[12.8, 0.3, -12.7]} scale={[1.1, 0.55, 0.8]} rotation={0.7} />
      <Rock position={[-14.8, 0.35, -10.9]} scale={[1.2, 0.6, 0.9]} rotation={1.8} />
      <Rock position={[19.6, 0.28, -6.4]} scale={[0.9, 0.5, 0.7]} rotation={2.6} />
      <Dock />
      <Shack />
      <ShorePath />
      <BankWalks />
      <Reeds count={14} origin={[-13.2, 0.03, 1.8]} />
      <Reeds count={6} origin={[11.4, 0.03, -9.7]} />
      {LILIES.map((lily, i) => (
        <FloatingLily key={`${lily.url}-${i}`} {...lily} />
      ))}
      {BOATS.map((boat, i) => (
        <Boat key={`${boat.url}-${i}`} {...boat} />
      ))}
      {FISH.map((fish, i) => (
        <SwimmingFish key={i} {...fish} />
      ))}
      {look.glitter && weather.sunOut && <SunGlitter />}
      {look.birds &&
        FLOCKS.map((flock, i) => (
          <BirdFlock key={i} {...flock} />
        ))}
      {DUCKS.map((duck, i) => (
        <Duck key={i} {...duck} />
      ))}
      {look.birds &&
        DRAGONFLIES.map((fly, i) => (
          <Dragonfly key={i} {...fly} />
        ))}
      {weather.rain && <LakeRain />}
    </>
  );
}
