import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BoatWake } from "./BoatWake";
import { mergePainted } from "./mergeParts";
import { pedaloAt } from "./pedalBoat";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const SWAN = "#f4f2ec";
const BEAK = "#e0742c";
const KNOB = "#1c1a18";
const TRIM = "#3a7fb8";
const SEAT = "#2f6a9c";
const WHEEL = "#d8d2c4";
const SKIN = "#e2b48c";
/** The two pedallers: shirt, shorts and what is on their heads. */
const RIDERS = [
  { x: 0.22, shirt: "#d9483b", shorts: "#2f3a4a", hat: "#e8d49a", brim: true },
  { x: -0.22, shirt: "#3aa3a0", shorts: "#c9b48a", hat: "#4a3424", brim: false },
] as const;
/** The seat's top, the hips' place on it, and the length of thigh and shin. */
const SEAT_TOP = 0.26;
const HIP_Z = -0.15;
const THIGH = 0.34;
const SHIN = 0.32;
/** Where the paddle wheel turns, under the tail. */
const WHEEL_AT = [0, 0.08, -0.82] as const;
/** Drawn a little larger than life, as the other boats are, so it reads from the dock. */
const SCALE = 1.25;

/** The swan-shaped hull with its raised wings, tail and long neck at the bow, and the bench across it, facing +z. */
export function pedaloHullShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), scale: [0.62, 0.3, 1.0], color: SWAN },
    { geometry: new THREE.TorusGeometry(1, 0.035, 4, 24), position: [0, -0.03, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.61, 0.98, 1], color: TRIM },
    { geometry: new THREE.CylinderGeometry(1, 1, 0.03, 16), position: [0, 0.01, 0], scale: [0.58, 1, 0.95], color: SWAN },
    // The wings, raised along each side as the gunwales.
    ...[-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(1, 10, 8), position: [side * 0.52, 0.16, -0.12] as const, rotation: [0.12, 0, 0] as const, scale: [0.12, 0.2, 0.62] as const, color: SWAN })),
    // The tail, swept up at the stern.
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.3, -0.86], rotation: [-0.6, 0, 0], scale: [0.3, 0.12, 0.3], color: SWAN },
    // The neck in two lengths, curving up and back over the bow, and the head with its beak.
    { geometry: new THREE.CylinderGeometry(0.09, 0.14, 0.5, 10), position: [0, 0.28, 0.82], rotation: [-0.35, 0, 0], color: SWAN },
    { geometry: new THREE.CylinderGeometry(0.075, 0.09, 0.36, 10), position: [0, 0.66, 0.84], rotation: [0.3, 0, 0], color: SWAN },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.86, 0.86], scale: [0.11, 0.1, 0.15], color: SWAN },
    { geometry: new THREE.ConeGeometry(0.045, 0.18, 8), position: [0, 0.83, 1.05], rotation: [Math.PI / 2 + 0.3, 0, 0], color: BEAK },
    { geometry: new THREE.SphereGeometry(0.035, 6, 5), position: [0, 0.88, 0.97], color: KNOB },
    // The bench and its back.
    { geometry: new THREE.BoxGeometry(0.86, 0.1, 0.32), position: [0, SEAT_TOP - 0.05, -0.28], color: SEAT },
    { geometry: new THREE.BoxGeometry(0.86, 0.34, 0.06), position: [0, SEAT_TOP + 0.14, -0.46], rotation: [-0.15, 0, 0], color: SEAT },
  ]);
}

/** The paddle wheel: a hub along x with six blades round it, turned about x. */
export function paddleWheelShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), rotation: [0, 0, Math.PI / 2], color: WHEEL },
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return { geometry: new THREE.BoxGeometry(0.32, 0.14, 0.02), position: [0, Math.sin(a) * 0.1, Math.cos(a) * 0.1] as const, rotation: [-a, 0, 0] as const, color: WHEEL };
    }),
  ]);
}

/** A pedaller's body from the seat up, arms resting forward, facing +z. */
export function pedallerShape(rider: (typeof RIDERS)[number]) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.11, 0.13, 0.38, 8), position: [0, SEAT_TOP + 0.19, HIP_Z - 0.04], rotation: [-0.12, 0, 0], color: rider.shirt },
    ...[-1, 1].map((side) => ({ geometry: new THREE.CylinderGeometry(0.035, 0.032, 0.3, 6), position: [side * 0.15, SEAT_TOP + 0.26, HIP_Z + 0.04] as const, rotation: [0.7, 0, side * 0.1] as const, color: SKIN })),
    { geometry: new THREE.SphereGeometry(0.085, 10, 8), position: [0, SEAT_TOP + 0.5, HIP_Z - 0.02], color: SKIN },
    rider.brim
      ? { geometry: new THREE.CylinderGeometry(0.06, 0.15, 0.08, 12), position: [0, SEAT_TOP + 0.59, HIP_Z - 0.02] as const, color: rider.hat }
      : { geometry: new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, SEAT_TOP + 0.52, HIP_Z - 0.03] as const, color: rider.hat },
  ]);
}

/** A thigh reaching forward from the hip, and the shin hanging from the knee. */
export function pedalThighShape(shorts: string) {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.055, 0.05, THIGH, 6), position: [0, 0, THIGH / 2], rotation: [Math.PI / 2, 0, 0], color: shorts }]);
}

export function pedalShinShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.045, 0.035, SHIN, 6), position: [0, -SHIN / 2, 0], color: SKIN },
    { geometry: new THREE.BoxGeometry(0.08, 0.05, 0.16), position: [0, -SHIN, 0.04], color: "#f2f0ea" },
  ]);
}

/** A swan pedalo going lazily round the east water on calm summer days (pedalBoat.ts), its two riders pedalling. */
export function Pedalo() {
  const still = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const thighs = useRef<(THREE.Group | null)[]>([]);
  const shins = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(
    () => ({
      hull: pedaloHullShape(),
      wheel: paddleWheelShape(),
      riders: RIDERS.map((rider) => pedallerShape(rider)),
      thighs: RIDERS.map((rider) => pedalThighShape(rider.shorts)),
      shin: pedalShinShape(),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const course = useCallback((time: number) => pedaloAt(time, still), [still]);
  useEffect(
    () => () => {
      [shapes.hull, shapes.wheel, ...shapes.riders, ...shapes.thighs, shapes.shin, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = pedaloAt(time, still);
    if (boat.current) {
      boat.current.position.set(pose.x, waterHeight(pose.x, pose.z, time) + 0.1, pose.z);
      boat.current.rotation.set(0, pose.yaw, still ? 0 : Math.sin(time * 0.9) * 0.025, "YXZ");
    }
    if (wheel.current) wheel.current.rotation.x = pose.crank;
    // Each foot goes round with its pedal: the knee rises and falls, and the shin swings to keep the foot on it.
    for (let leg = 0; leg < 4; leg += 1) {
      const phase = pose.crank + (leg % 2) * Math.PI + (leg >> 1) * 0.6;
      const lift = Math.sin(phase);
      const thigh = thighs.current[leg];
      if (thigh) thigh.rotation.x = -0.25 - 0.18 * lift;
      const shin = shins.current[leg];
      if (shin) shin.rotation.x = -0.45 + 0.28 * lift;
    }
  });
  useSkinnedFigure(boat, material);

  return (
    <>
      <group ref={boat} name="pedalo">
        <group scale={SCALE}>
          <mesh geometry={shapes.hull} material={material} castShadow />
          <group ref={wheel} position={[...WHEEL_AT]}>
            <mesh geometry={shapes.wheel} material={material} />
          </group>
          {RIDERS.map((rider, r) => (
            <group key={r} position={[rider.x, 0, 0]}>
              <mesh geometry={shapes.riders[r]} material={material} castShadow />
              {[-1, 1].map((side, s) => (
                <group key={side} ref={(g) => void (thighs.current[r * 2 + s] = g)} position={[side * 0.07, SEAT_TOP + 0.03, HIP_Z]}>
                  <mesh geometry={shapes.thighs[r]} material={material} />
                  <group ref={(g) => void (shins.current[r * 2 + s] = g)} position={[0, 0, THIGH]}>
                    <mesh geometry={shapes.shin} material={material} />
                  </group>
                </group>
              ))}
            </group>
          ))}
        </group>
      </group>
      <BoatWake at={course} stern={1.2} still={still} />
    </>
  );
}
