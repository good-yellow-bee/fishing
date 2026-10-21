import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { BIN_AT, BIN_HEIGHT as HEIGHT, BIN_INSIDE, BIN_SOIL, BIN_TIN, BIN_WALL as WALL, BIN_WORMS, binSnowy, binWorm } from "./binWorms";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { BAND, RIM, TIN, WORM } from "./WormPot";

const SLAT = "#a77a4c";
const POST = "#6b4a32";
const SOIL = "#3f2e20";
const BOARD = "#e4d6b5";
const SNOW = "#f3f6f8";
/** The stake the sign board is nailed to, behind the crate's right corner. */
const STAKE_X = BIN_INSIDE.width / 2 + 0.06;
const STAKE_Z = -BIN_INSIDE.depth / 2 - 0.02;
const STAKE_TOP = 0.52;

/** A worm's wavy line across the sign board, facing +z. */
function signWorm() {
  const points = Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-0.07 + i * 0.0175, Math.sin(i * 1.3) * 0.018, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.008, 5);
}

/** The angler's worm tin sunk into the soil, its rim and band standing over it, its own soil snowed on in winter. */
function tinParts(snowy: boolean): PaintedPart[] {
  const { x, z, radius: r, rim } = BIN_TIN;
  const sunk = 0.035;
  return [
    { geometry: new THREE.CylinderGeometry(r, r, sunk + rim, 12, 1, true), position: [x, BIN_SOIL + (rim - sunk) / 2, z], color: TIN },
    { geometry: new THREE.CylinderGeometry(r * 1.02, r * 1.02, rim * 0.45, 12, 1, true), position: [x, BIN_SOIL + rim * 0.45, z], color: BAND },
    { geometry: new THREE.TorusGeometry(r, 0.005, 4, 14).rotateX(Math.PI / 2), position: [x, BIN_SOIL + rim, z], color: RIM },
    { geometry: new THREE.CircleGeometry(r * 0.98, 12).rotateX(-Math.PI / 2), position: [x, BIN_SOIL + rim * 0.7, z], color: snowy ? SNOW : SOIL },
  ];
}

/** The open crate with its soil, snow on it in winter, the sign beside it painted with a worm, and the angler's tin in it once they have a place. */
function binShape(snowy: boolean, owned: boolean) {
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

/** The shack's worm bin by the deck, worms rising out of its soil and sinking back (none under winter snow), with a sign painted with a worm and, once `owned`, the angler's tin (binWorms.ts). */
export function WormBin({ season, owned = false }: { season: LakeSeason; owned?: boolean }) {
  const worms = useRef<THREE.InstancedMesh>(null);
  const posed = useRef(false);
  const still = useReducedMotion();
  const snowy = binSnowy(season);
  const shape = useMemo(() => binShape(snowy, owned), [snowy, owned]);
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
