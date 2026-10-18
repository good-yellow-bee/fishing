import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { TENT_AT, TENT_YAW, tentGlow } from "./campTent";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const CANVAS = "#d9772f";
const GROUNDSHEET = "#4f6a3a";
const POLE = "#6b4f33";
const INSIDE_DARK = "#3a2618";
const INSIDE_LIT = "#ffd27a";
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
