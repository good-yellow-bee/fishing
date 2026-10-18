import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { CAMPERS_YAW, CAMP_LOG_AT, TENT_AT, TENT_YAW, tentGlow } from "./campTent";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const CANVAS = "#d9772f";
const GROUNDSHEET = "#4f6a3a";
const POLE = "#6b4f33";
const INSIDE_DARK = "#3a2618";
const INSIDE_LIT = "#ffd27a";
const LOG = "#6e4b30";
const SKIN = "#e2b48c";
const TROUSERS = "#3d4a5a";
const STICK = "#8a6a48";
const MARSHMALLOW = "#f6f1e4";
/** The two campers' jackets and hats. */
const JACKETS = ["#4f7a52", "#c8562e"];
const HATS = ["#e3cf6a", "#2f5f8a"];
/** How high the log's top is, and how far apart the two sit on it. */
const SEAT_Y = 0.36;
const SPACING = 0.6;
/** The canvas glows this colour at full lantern light. */
const GLOW = "#ff9a3c";
/** The tent's length (along z, door at +z), width at the ground, and ridge height. */
const LENGTH = 2;
const WIDTH = 1.7;
const RIDGE = 1.2;

/** The canvas, the groundsheet and the poles, in one painted shape with its door facing +z. */
export function tentShape() {
  const end = new THREE.Shape([new THREE.Vector2(-WIDTH / 2, 0), new THREE.Vector2(WIDTH / 2, 0), new THREE.Vector2(0, RIDGE)]);
  const canvas = new THREE.ExtrudeGeometry(end, { depth: LENGTH, bevelEnabled: false });
  return mergePainted([
    { geometry: canvas, position: [0, 0, -LENGTH / 2], color: CANVAS },
    { geometry: new THREE.BoxGeometry(WIDTH + 0.3, 0.02, LENGTH + 0.4), position: [0, 0.01, 0.1], color: GROUNDSHEET },
    { geometry: new THREE.CylinderGeometry(0.025, 0.025, RIDGE + 0.15, 5), position: [0, (RIDGE + 0.15) / 2, LENGTH / 2 + 0.03], color: POLE },
    { geometry: new THREE.CylinderGeometry(0.025, 0.025, RIDGE + 0.15, 5), position: [0, (RIDGE + 0.15) / 2, -LENGTH / 2 - 0.03], color: POLE },
  ]);
}

/** The open doorway: a smaller triangle just proud of the front of the canvas, dark by day and lamplit at night. */
export function doorShape() {
  const door = new THREE.Shape([new THREE.Vector2(-0.42, 0.02), new THREE.Vector2(0.42, 0.02), new THREE.Vector2(0, RIDGE * 0.78)]);
  return mergePainted([{ geometry: new THREE.ShapeGeometry(door), position: [0, 0, LENGTH / 2 + 0.012], color: "#ffffff" }]);
}

/** Campers' tent on the far bank, lit from inside by a lantern from dusk. */
export function Tent({ hour }: { hour: LakeHour }) {
  const still = useReducedMotion();
  const shapes = useMemo(() => ({ tent: tentShape(), door: doorShape() }), []);
  const canvas = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), emissive: GLOW, emissiveIntensity: 0 }), []);
  const door = useMemo(() => new THREE.MeshBasicMaterial({ color: INSIDE_DARK, toneMapped: false, side: THREE.DoubleSide }), []);
  const dark = useMemo(() => new THREE.Color(INSIDE_DARK), []);
  const lit = useMemo(() => new THREE.Color(INSIDE_LIT), []);
  useEffect(
    () => () => {
      [shapes.tent, shapes.door, canvas, door].forEach((item) => item.dispose());
    },
    [shapes, canvas, door],
  );
  useFrame(({ clock }) => {
    const glow = tentGlow(hour, clock.elapsedTime, still);
    canvas.emissiveIntensity = glow * 0.55;
    door.color.copy(dark).lerp(lit, glow);
  });
  return (
    <group name="tent" position={[TENT_AT.x, 0, TENT_AT.z]} rotation={[0, TENT_YAW, 0]}>
      <mesh geometry={shapes.tent} material={canvas} castShadow />
      <mesh geometry={shapes.door} material={door} />
    </group>
  );
}

/** One camper sitting on the log facing +z, the first with a toasting stick held out to the fire. */
export function camperShape(k: 0 | 1) {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.28, 0.12, 0.4), position: [0, SEAT_Y + 0.06, 0.14], color: TROUSERS },
    { geometry: new THREE.BoxGeometry(0.26, 0.36, 0.1), position: [0, SEAT_Y / 2, 0.36], color: TROUSERS },
    { geometry: new THREE.CylinderGeometry(0.13, 0.16, 0.46, 8), position: [0, SEAT_Y + 0.33, -0.02], rotation: [0.2, 0, 0], color: JACKETS[k]! },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, SEAT_Y + 0.66, 0.04], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.105, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, SEAT_Y + 0.69, 0.03], color: HATS[k]! },
    { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.34, 6), position: [0, SEAT_Y + 0.38, 0.2], rotation: [1.2, 0, 0], color: JACKETS[k]! },
    ...(k === 0
      ? [
          { geometry: new THREE.CylinderGeometry(0.01, 0.01, 1.1, 4), position: [0, SEAT_Y + 0.46, 0.85] as const, rotation: [1.75, 0, 0] as const, color: STICK },
          { geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), position: [0, SEAT_Y + 0.36, 1.39] as const, rotation: [1.75, 0, 0] as const, color: MARSHMALLOW },
        ]
      : []),
  ]);
}

/** The two campers on their log by the fire in front of the tent, from dusk. */
export function Campers() {
  const still = useReducedMotion();
  const shapes = useMemo(() => [camperShape(0), camperShape(1)], []);
  const log = useMemo(() => mergePainted([{ geometry: new THREE.CylinderGeometry(0.17, 0.19, 1.5, 8), position: [0, 0.18, 0], rotation: [0, 0, Math.PI / 2], color: LOG }]), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const seats = useRef<(THREE.Group | null)[]>([]);
  useEffect(
    () => () => {
      [...shapes, log, material].forEach((item) => item.dispose());
    },
    [shapes, log, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    seats.current.forEach((seat, k) => {
      if (!seat) return;
      // Leaning in to the warmth and back, each in their own time, and turning to talk now and then.
      seat.rotation.x = still ? 0 : 0.05 * Math.sin(time * 0.6 + k * 2);
      seat.rotation.y = still ? 0 : (k === 0 ? -1 : 1) * 0.25 * Math.max(0, Math.sin(time * 0.17 + k));
    });
  });
  return (
    <group name="campers" position={[CAMP_LOG_AT.x, 0, CAMP_LOG_AT.z]} rotation={[0, CAMPERS_YAW, 0]}>
      <mesh geometry={log} material={material} castShadow />
      {shapes.map((shape, k) => (
        <group key={k} ref={(g) => void (seats.current[k] = g)} position={[(k === 0 ? 1 : -1) * (SPACING / 2), 0, 0]}>
          <mesh geometry={shape} material={material} castShadow />
        </group>
      ))}
    </group>
  );
}
