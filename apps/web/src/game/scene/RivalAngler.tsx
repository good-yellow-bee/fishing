import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { crowdedBankForDay } from "@stillwater/shared";
import { brollySitterShape, rodRestShape } from "./anglerShapes";
import { mergePainted, mergeParts } from "./mergeParts";
import { rivalSeat } from "./rivalSeat";
import { toonRamp } from "./toon";

const JACKET = "#a8452f";
const SKIN = "#d9a882";
const HAT = "#4f6b3a";
const ROD = "#2a2622";
/** The chair's seat height (as brollySitterShape's), the rod's butt ahead of it, its length and its lift over the water. */
const SEAT_Y = 0.36;
const BUTT_AHEAD = 0.45;
const ROD_LENGTH = 2.2;
const ROD_LIFT = 0.42;
const BUTT_Y = 0.32;

/** The angler from the seat up, facing +z: jacket, head and a bucket hat, the rod hand on the knee. */
function rivalTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.19, 0.5, 8), position: [0, SEAT_Y + 0.25, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, SEAT_Y + 0.62, 0.02], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.1, 0.13, 0.08, 10), position: [0, SEAT_Y + 0.71, 0.01], color: HAT },
    { geometry: new THREE.CylinderGeometry(0.17, 0.17, 0.015, 12), position: [0, SEAT_Y + 0.67, 0.01], color: HAT },
    { geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6), position: [0.16, SEAT_Y + 0.3, 0.12], rotation: [0.9, 0, -0.1], color: JACKET },
  ]);
}

/** The rod from its butt on the rest, out along +z and up over the water. */
function rivalRodShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.009, 0.02, ROD_LENGTH, 5), position: [0, Math.sin(ROD_LIFT) * ROD_LENGTH * 0.5, Math.cos(ROD_LIFT) * ROD_LENGTH * 0.5], rotation: [Math.PI / 2 - ROD_LIFT, 0, 0], color: ROD },
  ]);
}

/** The angler sat by the day's crowded bank (rivalSeat.ts): one draw. */
export function RivalAngler() {
  const [seat] = useState(() => rivalSeat(crowdedBankForDay(new Date())));
  const shape = useMemo(
    () =>
      mergeParts([
        { geometry: brollySitterShape() },
        { geometry: rivalTorsoShape() },
        { geometry: rodRestShape(BUTT_Y), position: [0.18, 0, BUTT_AHEAD] },
        { geometry: rivalRodShape(), position: [0.18, BUTT_Y, BUTT_AHEAD] },
      ]),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
    },
    [shape, material],
  );
  if (!seat) return null;
  return <mesh name="rival-angler" geometry={shape} material={material} position={[seat.x, 0, seat.z]} rotation={[0, seat.yaw, 0]} castShadow />;
}
