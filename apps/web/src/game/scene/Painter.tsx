import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { EASEL_REACH, PAINTER_AT, PAINTER_YAW, canvasFill, painterAt } from "./pleinAir";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const SMOCK = "#ece3cf";
const DAUB_A = "#5b8fc7";
const DAUB_B = "#d9774a";
const TROUSERS = "#4a5a48";
const SKIN = "#e2b48c";
const BERET = "#2f2f3a";
const SHOES = "#3a2e26";
const EASEL = "#a87b4f";
const CANVAS = "#f6f2e8";
const PALETTE = "#c9a273";
const CANOPY = "#f4f1ea";
const STRIPE = "#c8463a";
/** The hips' height and the shoulders' above them. */
const HIP_Y = 0.84;
const SHOULDER_Y = 0.54;
/** The canvas, its centre's height, its size and how far its top leans back. */
const CANVAS_Y = 1.28;
const CANVAS_W = 0.62;
const CANVAS_H = 0.5;
const CANVAS_LEAN = 0.15;
/** The picture's bands top to bottom, the share of the canvas each takes, and its colour. */
const BANDS = [
  { key: "sky", from: 0.62, to: 1, color: "#9cc7e6" },
  { key: "bank", from: 0.38, to: 0.62, color: "#5f8a4a" },
  { key: "water", from: 0, to: 0.38, color: "#3f6f95" },
] as const;
/** Drawn a little larger than life, as the cabin is, so the work reads from across the lake. */
const SCALE = 1.2;

/** The painter's body above the hips: a paint-daubed smock and a beret, facing +z. */
export function painterTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.2, 0.62, 8), position: [0, 0.31, 0], color: SMOCK },
    { geometry: new THREE.SphereGeometry(0.035, 5, 4), position: [0.08, 0.36, 0.15], color: DAUB_A },
    { geometry: new THREE.SphereGeometry(0.03, 5, 4), position: [-0.06, 0.2, 0.17], color: DAUB_B },
    { geometry: new THREE.SphereGeometry(0.105, 10, 8), position: [0, 0.74, 0.01], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.13, 0.12, 0.05, 10), position: [0.02, 0.83, 0], rotation: [0, 0, -0.2], color: BERET },
  ]);
}

/** The legs and shoes, standing easy. */
export function painterLegsShape() {
  return mergePainted(
    [-0.09, 0.09].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.06, 0.055, HIP_Y - 0.06, 6), position: [x, (HIP_Y + 0.06) / 2, 0] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.1, 0.06, 0.19), position: [x, 0.03, 0.04] as const, color: SHOES },
    ]),
  );
}

/** An arm hung from the shoulder, with a brush in the hand pointing forward. */
export function brushArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.5, 6), position: [0, -0.25, 0], color: SMOCK },
    { geometry: new THREE.SphereGeometry(0.045, 6, 4), position: [0, -0.5, 0], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.008, 0.008, 0.24, 5), position: [0, -0.52, 0.1], rotation: [Math.PI / 2, 0, 0], color: EASEL },
    { geometry: new THREE.ConeGeometry(0.014, 0.05, 5), position: [0, -0.52, 0.24], rotation: [Math.PI / 2, 0, 0], color: DAUB_A },
  ]);
}

/** The other arm bent at the elbow, holding the palette out at the side. */
export function paletteArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.28, 6), position: [0, -0.14, 0], color: SMOCK },
    { geometry: new THREE.CylinderGeometry(0.04, 0.038, 0.26, 6), position: [0, -0.28, 0.13], rotation: [Math.PI / 2, 0, 0], color: SMOCK },
    { geometry: new THREE.CylinderGeometry(0.15, 0.15, 0.012, 12), position: [0.04, -0.27, 0.27], color: PALETTE },
    ...[DAUB_A, DAUB_B, "#e8c64a", "#5f8a4a"].map((color, i) => ({
      geometry: new THREE.SphereGeometry(0.025, 5, 3),
      position: [0.04 + Math.cos(i * 1.4) * 0.09, -0.26, 0.27 + Math.sin(i * 1.4) * 0.09] as const,
      color,
    })),
  ]);
}

/** The easel: two front legs splayed under the canvas, a back leg propping it, a ledge and the blank canvas, its face to -z. */
export function easelShape() {
  const tilt = (y: number) => [0, y, Math.tan(CANVAS_LEAN) * (y - CANVAS_Y)] as const;
  return mergePainted([
    ...[-1, 1].map((side) => ({
      geometry: new THREE.CylinderGeometry(0.018, 0.022, 1.75, 5),
      position: [side * 0.2, 0.86, Math.tan(CANVAS_LEAN) * (0.86 - CANVAS_Y)] as const,
      rotation: [CANVAS_LEAN, 0, side * 0.12] as const,
      color: EASEL,
    })),
    { geometry: new THREE.CylinderGeometry(0.018, 0.022, 1.7, 5), position: [0, 0.8, 0.38], rotation: [-0.42, 0, 0], color: EASEL },
    { geometry: new THREE.BoxGeometry(0.7, 0.04, 0.08), position: [...tilt(CANVAS_Y - CANVAS_H / 2 - 0.02)] as [number, number, number], rotation: [CANVAS_LEAN, 0, 0], color: EASEL },
    { geometry: new THREE.BoxGeometry(CANVAS_W, CANVAS_H, 0.025), position: [...tilt(CANVAS_Y)] as [number, number, number], rotation: [CANVAS_LEAN, 0, 0], color: CANVAS },
  ]);
}

/** The sun umbrella: a pole and a white canopy with a red stripe round its rim. */
export function umbrellaShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.02, 0.02, 2.1, 6), position: [0, 1.05, 0], color: "#d8d4c8" },
    { geometry: new THREE.ConeGeometry(0.72, 0.3, 12, 1, true), position: [0, 2.1, 0], color: CANOPY },
    { geometry: new THREE.CylinderGeometry(0.73, 0.73, 0.06, 12, 1, true), position: [0, 1.95, 0], color: STRIPE },
  ]);
}

/** A band of the picture, a unit wide with its left edge at the origin, so scaling x paints it in from the left. */
function bandGeometry(height: number) {
  return new THREE.PlaneGeometry(1, height).translate(0.5, 0, 0);
}

/** A painter at an easel on the far bank on a calm, clear day, the picture filling in as they work (pleinAir.ts). */
export function Painter() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const brush = useRef<THREE.Group>(null);
  const bands = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const shapes = useMemo(
    () => ({
      torso: painterTorsoShape(),
      legs: painterLegsShape(),
      brush: brushArmShape(),
      palette: paletteArmShape(),
      easel: easelShape(),
      umbrella: umbrellaShape(),
      bands: BANDS.map((band) => bandGeometry((band.to - band.from) * (CANVAS_H - 0.04))),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const paints = useMemo(() => BANDS.map((band) => new THREE.MeshToonMaterial({ color: band.color, gradientMap: toonRamp() })), []);
  useEffect(
    () => () => {
      [shapes.torso, shapes.legs, shapes.brush, shapes.palette, shapes.easel, shapes.umbrella, ...shapes.bands, material, ...paints].forEach((item) => item.dispose());
    },
    [shapes, material, paints],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = painterAt(time, still);
    if (body.current) body.current.position.z = -pose.back / SCALE;
    if (head.current) head.current.rotation.z = pose.tilt * 0.3;
    // The brush arm lifts forward to the canvas, reaching right in on each dab.
    if (brush.current) brush.current.rotation.x = -(0.6 + pose.dab * 0.45) * (1 - Math.min(1, pose.back / 0.3) * 0.6);
    const fill = canvasFill(time, still);
    BANDS.forEach((band, i) => {
      const mesh = bands[i]!.current;
      const amount = fill[band.key];
      if (!mesh) return;
      mesh.visible = amount > 0.001;
      mesh.scale.x = Math.max(0.001, amount) * (CANVAS_W - 0.04);
    });
  });
  const canvasZ = EASEL_REACH / SCALE;
  return (
    <group name="painter" position={[PAINTER_AT.x, 0, PAINTER_AT.z]} rotation={[0, PAINTER_YAW, 0]} scale={SCALE}>
      <group ref={body}>
        <mesh geometry={shapes.legs} material={material} castShadow />
        <group position={[0, HIP_Y, 0]}>
          <group ref={head}>
            <mesh geometry={shapes.torso} material={material} castShadow />
          </group>
          {/* Their right hand is on -x, facing +z. */}
          <group ref={brush} position={[-0.19, SHOULDER_Y, 0]}>
            <mesh geometry={shapes.brush} material={material} />
          </group>
          <group position={[0.19, SHOULDER_Y, 0]} rotation={[0, 0.5, 0]}>
            <mesh geometry={shapes.palette} material={material} />
          </group>
        </group>
      </group>
      <group position={[0, 0, canvasZ]}>
        <mesh geometry={shapes.easel} material={material} castShadow />
        {/* The picture, painted on the canvas's face toward the painter. */}
        <group position={[0, CANVAS_Y, -0.016]} rotation={[CANVAS_LEAN, Math.PI, 0]}>
          {BANDS.map((band, i) => (
            <mesh
              key={band.key}
              ref={bands[i]}
              geometry={shapes.bands[i]}
              material={paints[i]}
              position={[-(CANVAS_W - 0.04) / 2, ((band.from + band.to) / 2 - 0.5) * (CANVAS_H - 0.04), 0]}
            />
          ))}
        </group>
      </group>
      <mesh geometry={shapes.umbrella} material={material} position={[0.55 / SCALE, 0, 0]} rotation={[0, 0, 0.2]} castShadow />
    </group>
  );
}
