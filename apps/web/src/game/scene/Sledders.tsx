import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { SLEDDERS, SPRAY_PUFFS, SPRAY_SEC, runPoint, sledderAt, sprayPuff, type SledPose } from "./sledRun";
import { toonRamp } from "./toon";

const SLED = "#c8302c";
const RUNNER = "#5a3a26";
const SKIN = "#e8bf9a";
const TROUSERS = "#2e3442";
const BOOTS = "#2a2420";
const TRACK = "#eef3f6";
/** Each child's jacket, hat and the bobble on it. */
const OUTFITS = [
  { jacket: "#2f6fb5", hat: "#f2c230", bobble: "#f7f2e4" },
  { jacket: "#e8832c", hat: "#7b4fa0", bobble: "#f7f2e4" },
];
/** Children are drawn a little larger than life so they read at the far hill's distance. */
const SCALE = 1.25;
/** How far behind the child a towed sled trails, along the run. */
const TOW = 0.6;
/** The packed run's half width. */
const TRACK_HALF = 0.16;

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A red wooden sled, nose toward +z, its deck's underside at the origin, with a curled-up nose and two runners. */
export function sledShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.32, 0.04, 0.62), position: [0, 0.07, -0.02], color: SLED },
    { geometry: new THREE.BoxGeometry(0.32, 0.04, 0.14), position: [0, 0.12, 0.33], rotation: [-0.7, 0, 0], color: SLED },
    ...[-1, 1].map((side) => ({ geometry: new THREE.BoxGeometry(0.03, 0.05, 0.72), position: [side * 0.13, 0.025, 0] as THREE.Vector3Tuple, color: RUNNER })),
  ]);
}

function headParts(outfit: (typeof OUTFITS)[number], y: number, z = 0) {
  return [
    { geometry: new THREE.SphereGeometry(0.1, 8, 6), position: [0, y, z] as THREE.Vector3Tuple, color: SKIN },
    { geometry: new THREE.SphereGeometry(0.105, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, y + 0.02, z] as THREE.Vector3Tuple, color: outfit.hat },
    { geometry: new THREE.SphereGeometry(0.045, 6, 4), position: [0, y + 0.13, z] as THREE.Vector3Tuple, color: outfit.bobble },
  ];
}

/** A child sitting up on a sled, facing +z, legs out in front and hands on the rope, the seat at the origin. */
export function seatedChildShape(outfit: (typeof OUTFITS)[number]) {
  return mergePainted([
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.36, 6), position: [side * 0.07, 0.05, 0.16] as THREE.Vector3Tuple, rotation: [Math.PI / 2, 0, 0] as THREE.Vector3Tuple, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.08, 0.09, 0.1), position: [side * 0.07, 0.07, 0.36] as THREE.Vector3Tuple, color: BOOTS },
      { geometry: new THREE.CylinderGeometry(0.04, 0.035, 0.3, 6), position: [side * 0.14, 0.24, 0.12] as THREE.Vector3Tuple, rotation: [1.1, 0, 0] as THREE.Vector3Tuple, color: outfit.jacket },
    ]),
    { geometry: new THREE.CylinderGeometry(0.12, 0.13, 0.34, 8), position: [0, 0.22, -0.04], rotation: [-0.15, 0, 0], color: outfit.jacket },
    ...headParts(outfit, 0.48, -0.06),
  ]);
}

/** A child standing, facing +z, feet at the origin, one hand back holding the sled's rope. */
export function standingChildShape(outfit: (typeof OUTFITS)[number]) {
  return mergePainted([
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), position: [side * 0.07, 0.25, 0] as THREE.Vector3Tuple, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.08, 0.07, 0.14), position: [side * 0.07, 0.035, 0.02] as THREE.Vector3Tuple, color: BOOTS },
    ]),
    { geometry: new THREE.CylinderGeometry(0.12, 0.13, 0.36, 8), position: [0, 0.62, 0], color: outfit.jacket },
    { geometry: new THREE.CylinderGeometry(0.04, 0.035, 0.32, 6), position: [-0.15, 0.6, 0.02], rotation: [0.15, 0, 0.1], color: outfit.jacket },
    { geometry: new THREE.CylinderGeometry(0.04, 0.035, 0.32, 6), position: [0.15, 0.6, -0.1], rotation: [-0.6, 0, -0.1], color: outfit.jacket },
    ...headParts(outfit, 0.92),
  ]);
}

/** The packed run down the hill, a pale strip laid on its face. */
export function trackShape() {
  const STEPS = 24;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let s = 0; s <= STEPS; s += 1) {
    const along = s / STEPS;
    for (const above of [-TRACK_HALF, TRACK_HALF]) {
      const p = runPoint(along, above);
      positions.push(p.x, p.y, p.z - 0.02);
    }
    if (s < STEPS) {
      const a = s * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The run's length, near enough straight. */
const RUN_LENGTH = (() => {
  const a = runPoint(0);
  const b = runPoint(1);
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
})();
/** How tall a standing child is, for keeping them out in front of the hill's face. */
const TALL = 1.4;

const A = new THREE.Vector3();
const B = new THREE.Vector3();

/** Sets `object` at `along` the run, `above` it, facing down it (`facing` 1) or up it, pitched with the slope when `pitched`. */
function placeOnRun(object: THREE.Object3D, along: number, above: number, facing: 1 | -1, pitched: boolean) {
  const p = runPoint(along, above, TALL);
  const q = runPoint(Math.min(1, along + 0.02), above);
  const r = runPoint(Math.max(0, along - 0.02), above);
  A.set(q.x - r.x, q.y - r.y, 0).multiplyScalar(facing);
  object.position.set(p.x, p.y, p.z);
  object.rotation.set(pitched ? Math.atan2(-A.y, Math.abs(A.x)) : 0, Math.atan2(A.x, 0), 0, "YXZ");
}

/** Two children taking turns sledging down the hill behind the far bank on winter days (sledRun.ts). */
export function Sledders() {
  const still = useReducedMotion();
  const sleds = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const seated = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const standing = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const spray = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(
    () => ({
      sled: sledShape(),
      seated: OUTFITS.map(seatedChildShape),
      standing: OUTFITS.map(standingChildShape),
      track: trackShape(),
      puff: new THREE.PlaneGeometry(1, 1),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const trackMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: TRACK, gradientMap: toonRamp(), side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.2), []);
  const puffMaterial = useMemo(() => new THREE.MeshBasicMaterial({ map: spot, color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }), [spot]);
  useEffect(
    () => () => {
      [shapes.sled, ...shapes.seated, ...shapes.standing, shapes.track, shapes.puff, material, trackMaterial, spot, puffMaterial].forEach((item) => item.dispose());
    },
    [shapes, material, trackMaterial, spot, puffMaterial],
  );
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    for (let i = 0; i < SLEDDERS; i += 1) {
      const pose: SledPose = sledderAt(i, time, still);
      const sled = sleds[i]!.current;
      const sit = seated[i]!.current;
      const stand = standing[i]!.current;
      if (!sled || !sit || !stand) continue;
      sit.visible = pose.seated;
      stand.visible = !pose.seated;
      if (pose.seated) {
        placeOnRun(sled, pose.along, pose.above, 1, true);
        // Leaning back into the rush, and rocking a little as the sled bumps down.
        sit.position.copy(sled.position);
        sit.rotation.copy(sled.rotation);
        sit.rotateX(-0.2 * pose.speed + (still ? 0 : 0.05 * pose.speed * Math.sin(time * 23 + i)));
      } else {
        placeOnRun(stand, pose.along, pose.above, pose.facing, false);
        stand.position.y += 0.03 * Math.abs(pose.stride);
        stand.rotation.z = 0.04 * pose.stride;
        // The sled trails behind on its rope, nose toward the child.
        const behind = Math.min(1, pose.along + ((pose.facing === -1 ? 1 : -1) * TOW) / RUN_LENGTH);
        placeOnRun(sled, Math.max(0, behind), pose.above, pose.facing, true);
      }
    }
    const puffs = spray.current;
    if (puffs) {
      let slot = 0;
      for (let i = 0; i < SLEDDERS; i += 1) {
        for (let j = 0; j < SPRAY_PUFFS; j += 1) {
          const puff = sprayPuff(i, j, time, still);
          if (!puff) continue;
          const p = runPoint(puff.along, 0, TALL);
          const k = puff.age / SPRAY_SEC;
          const seed = i * 97 + Math.floor(time / (SPRAY_SEC / SPRAY_PUFFS)) - j;
          // Thrown up behind the sled, which runs down toward +x.
          B.set(p.x - 0.25 - 0.4 * k, p.y + 0.08 + 0.35 * k, p.z + 0.15 + 0.2 * (hash(seed) - 0.3));
          A.set(0, 0.25 * (hash(seed + 1) - 0.5), 0);
          scratch.position.copy(B).add(A);
          scratch.quaternion.copy(camera.quaternion);
          scratch.scale.setScalar(0.5 * Math.sin(Math.PI * Math.min(1, k * 1.4 + 0.1)) * (0.7 + 0.6 * hash(seed + 2)));
          scratch.updateMatrix();
          puffs.setMatrixAt(slot++, scratch.matrix);
        }
      }
      puffs.count = slot;
      puffs.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group name="sledders">
      <mesh geometry={shapes.track} material={trackMaterial} />
      {OUTFITS.map((_, i) => (
        <group key={i}>
          <group ref={sleds[i]}>
            <mesh geometry={shapes.sled} material={material} scale={SCALE} />
          </group>
          <group ref={seated[i]}>
            <mesh geometry={shapes.seated[i]} material={material} position={[0, 0.09 * SCALE, -0.05 * SCALE]} scale={SCALE} />
          </group>
          <group ref={standing[i]}>
            <mesh geometry={shapes.standing[i]} material={material} scale={SCALE} />
          </group>
        </group>
      ))}
      <instancedMesh ref={spray} args={[shapes.puff, puffMaterial, SLEDDERS * SPRAY_PUFFS]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
