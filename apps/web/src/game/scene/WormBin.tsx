import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { BIN_AT, BIN_HEIGHT as HEIGHT, BIN_INSIDE, BIN_SACK, BIN_SOIL, BIN_TIN, BIN_WALL as WALL, BIN_WORMS, TIN_WORM, binSnowy, binWorm } from "./binWorms";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { BAND, RIM, TIN, WORM } from "./WormPot";

const SLAT = "#a77a4c";
const POST = "#6b4a32";
const SOIL = "#3f2e20";
const BOARD = "#e4d6b5";
const SNOW = "#f3f6f8";
const BURLAP = "#b7956a";
const TWINE = "#6e5236";
const PATCH = "#efe2c0";
const CRUST = "#c58a47";
const CRUMB = "#ead9a6";
/** The stake the sign board is nailed to, behind the crate's right corner. */
const STAKE_X = BIN_INSIDE.width / 2 + 0.06;
const STAKE_Z = -BIN_INSIDE.depth / 2 - 0.02;
const STAKE_TOP = 0.52;

/** A worm's wavy line across the sign board, facing +z. */
function signWorm() {
  const points = Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-0.07 + i * 0.0175, Math.sin(i * 1.3) * 0.018, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.008, 5);
}

/** The angler's keeping tin sunk into the soil, its rim and band standing over it, its own soil near its rim and snowed on in winter. */
function tinParts(snowy: boolean): PaintedPart[] {
  const { x, z, radius: r, rim, lip } = BIN_TIN;
  const sunk = 0.02;
  return [
    { geometry: new THREE.CylinderGeometry(r, r, sunk + rim, 12, 1, true), position: [x, BIN_SOIL + (rim - sunk) / 2, z], color: TIN },
    { geometry: new THREE.CylinderGeometry(r * 1.02, r * 1.02, rim * 0.45, 12, 1, true), position: [x, BIN_SOIL + rim * 0.45, z], color: BAND },
    { geometry: new THREE.TorusGeometry(r, lip, 4, 14).rotateX(Math.PI / 2), position: [x, BIN_SOIL + rim, z], color: RIM },
    { geometry: new THREE.CircleGeometry(r * 0.98, 12).rotateX(-Math.PI / 2), position: [x, BIN_SOIL + rim - 0.004, z], color: snowy ? SNOW : SOIL },
    ...(snowy ? [] : [{ geometry: tinWorm(), position: [x, BIN_SOIL, z] as const, color: WORM }]),
  ];
}

/** A worm out of the tin's soil, over its rim toward the bin's middle and down onto the bin's soil. */
function tinWorm() {
  const { radius: r, rim } = BIN_TIN;
  const out = (reach: number, y: number) => new THREE.Vector3(reach * r * TIN_WORM.x, y, reach * r * TIN_WORM.z);
  const curve = new THREE.CatmullRomCurve3([out(0.3, rim - 0.006), out(0.7, rim + 0.01), out(1, rim + 0.007), out((1 + TIN_WORM.out) / 2, rim * 0.45), out(TIN_WORM.out, 0.006)]);
  return new THREE.TubeGeometry(curve, 12, 0.007, 5);
}

/** Where a few crumbs lie spilled in front of the sack, off its middle. */
const CRUMBS = [
  [-0.02, 0.085],
  [0.015, 0.095],
  [0.04, 0.078],
  [-0.045, 0.072],
  [0.005, 0.115],
] as const;

/** The angler's sack of bread crumb, tied at the neck, its top folded in, a loaf painted on its front; crumbs spilled before it, or snow on its top in winter. */
function sackParts(snowy: boolean): PaintedPart[] {
  const { x, z, radius: r, height: h } = BIN_SACK;
  const neck = h * 0.8;
  const body = [
    [0.001, 0],
    [r * 0.8, 0.004],
    [r, 0.035],
    [r * 0.97, 0.09],
    [r * 0.75, neck - 0.015],
    [r * 0.38, neck],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const tuft = [
    [r * 0.36, neck],
    [r * 0.42, neck + 0.015],
    [r * 0.58, h],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  return [
    { geometry: new THREE.LatheGeometry(body, 10), position: [x, 0, z], color: BURLAP },
    { geometry: new THREE.LatheGeometry(tuft, 10), position: [x, 0, z], color: BURLAP },
    { geometry: new THREE.TorusGeometry(r * 0.4, 0.005, 4, 12).rotateX(Math.PI / 2), position: [x, neck + 0.003, z], color: TWINE },
    { geometry: new THREE.CircleGeometry(r * 0.56, 10).rotateX(-Math.PI / 2), position: [x, h - 0.012, z], color: BURLAP },
    // The patch and its loaf wrap the sack's front, where it is about 0.985 of its width.
    { geometry: new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.05, 6, 1, true, -0.4, 0.8), position: [x, 0.062, z], color: PATCH },
    { geometry: new THREE.CylinderGeometry(r, r, 0.022, 4, 1, true, -0.22, 0.44), position: [x, 0.062, z], color: CRUST },
    ...(snowy
      ? [{ geometry: new THREE.SphereGeometry(r * 0.6, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2), position: [x, h - 0.008, z] as const, scale: [1, 0.4, 1] as const, color: SNOW }]
      : CRUMBS.map(([dx, dz], i) => ({ geometry: new THREE.BoxGeometry(0.011, 0.007, 0.009), position: [x + dx, 0.0035, z + dz] as const, rotation: [0, i * 1.1, 0] as const, color: CRUMB }))),
  ];
}

/** The open crate with its soil, snow on it in winter, the sign beside it painted with a worm, the angler's keeping tin in it once they have a place, and their sack of bread crumb beside it once bought. */
function binShape(snowy: boolean, owned: boolean, sack: boolean) {
  const { width: w, depth: d } = BIN_INSIDE;
  return mergePainted([
    { geometry: new THREE.BoxGeometry(w + WALL * 2, HEIGHT, WALL), position: [0, HEIGHT / 2, d / 2 + WALL / 2], color: SLAT },
    { geometry: new THREE.BoxGeometry(w + WALL * 2, HEIGHT, WALL), position: [0, HEIGHT / 2, -d / 2 - WALL / 2], color: SLAT },
    { geometry: new THREE.BoxGeometry(WALL, HEIGHT, d), position: [w / 2 + WALL / 2, HEIGHT / 2, 0], color: SLAT },
    { geometry: new THREE.BoxGeometry(WALL, HEIGHT, d), position: [-w / 2 - WALL / 2, HEIGHT / 2, 0], color: SLAT },
    // A darker band across each long side, where the slats meet.
    { geometry: new THREE.BoxGeometry(w + WALL * 2 + 0.004, 0.012, WALL + 0.004), position: [0, HEIGHT * 0.5, d / 2 + WALL / 2], color: POST },
    { geometry: new THREE.BoxGeometry(w, 0.02, d), position: [0, BIN_SOIL - 0.01, 0], color: snowy ? SNOW : SOIL },
    { geometry: new THREE.BoxGeometry(0.03, STAKE_TOP, 0.03), position: [STAKE_X, STAKE_TOP / 2, STAKE_Z], color: POST },
    { geometry: new THREE.BoxGeometry(0.2, 0.12, 0.015), position: [STAKE_X, STAKE_TOP - 0.08, STAKE_Z + 0.025], rotation: [0, 0, 0.06], color: BOARD },
    { geometry: signWorm(), position: [STAKE_X, STAKE_TOP - 0.08, STAKE_Z + 0.036], rotation: [0, 0, 0.06], color: WORM },
    ...(owned ? tinParts(snowy) : []),
    ...(sack ? sackParts(snowy) : []),
  ]);
}

/** One worm poking up out of the soil at the origin, its tip curling over along +x. */
function wormShape() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.005, 0.04, 0),
    new THREE.Vector3(0.02, 0.075, 0.005),
    new THREE.Vector3(0.045, 0.082, 0),
    new THREE.Vector3(0.064, 0.064, -0.005),
  ]);
  return new THREE.TubeGeometry(curve, 12, 0.011, 5);
}

const turn = new THREE.Quaternion();
const lean = new THREE.Quaternion();
const at = new THREE.Vector3();
const size = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const matrix = new THREE.Matrix4();

/** The shack's worm bin by the deck, worms rising out of its soil and sinking back (none under winter snow), with a sign painted with a worm, once `owned` the angler's keeping tin, and with `sack` their sack of bread crumb beside it (binWorms.ts). */
export function WormBin({ season, owned = false, sack = false }: { season: LakeSeason; owned?: boolean; sack?: boolean }) {
  const worms = useRef<THREE.InstancedMesh>(null);
  const posed = useRef(false);
  const still = useReducedMotion();
  const snowy = binSnowy(season);
  const shape = useMemo(() => binShape(snowy, owned, sack), [snowy, owned, sack]);
  useEffect(() => {
    posed.current = false;
  }, [snowy, still]);
  const worm = useMemo(wormShape, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const pink = useMemo(() => new THREE.MeshToonMaterial({ color: WORM, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shape, worm, material, pink].forEach((item) => item.dispose());
    },
    [shape, worm, material, pink],
  );
  useFrame(({ clock }) => {
    const mesh = worms.current;
    // Held still, the worms are posed once.
    if (!mesh || (still && posed.current)) return;
    posed.current = still;
    const time = still ? STILL_TIME : clock.elapsedTime;
    for (let i = 0; i < BIN_WORMS; i += 1) {
      const pose = binWorm(i, time);
      turn.setFromAxisAngle(Y, pose.yaw).multiply(lean.setFromAxisAngle(Z, pose.lean));
      at.set(pose.x, BIN_SOIL, pose.z);
      mesh.setMatrixAt(i, matrix.compose(at, turn, size.set(1, pose.rise, 1)));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="worm-bin" position={[BIN_AT.x, BIN_AT.y, BIN_AT.z]}>
      <mesh geometry={shape} material={material} castShadow />
      {!snowy && <instancedMesh ref={worms} args={[worm, pink, BIN_WORMS]} frustumCulled={false} />}
    </group>
  );
}
