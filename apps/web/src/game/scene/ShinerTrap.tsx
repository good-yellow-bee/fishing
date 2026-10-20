import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { CAGE_ALONG, CAGE_LENGTH, CAGE_RADIUS, CAGE_Y, TRAP_REACH, TRAP_STAKE, shinerFlip } from "./trapSpot";
import { toonRamp } from "./toon";

const WIRE = "#5f6769";
const TWINE = "#cdbb8e";
const SHINER = "#e8f0f3";
const STAKE_TOP = 0.34;
/** The funnel mouths at each end, where the shiners nose in. */
const MOUTH = 0.035;
const FUNNEL = 0.1;

/** A thin rod between two points. */
function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, color: string): PaintedPart {
  const span = to.clone().sub(from);
  const turn = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize()));
  const mid = from.clone().add(to).multiplyScalar(0.5);
  return { geometry: new THREE.CylinderGeometry(radius, radius, span.length(), 3), position: [mid.x, mid.y, mid.z], rotation: [turn.x, turn.y, turn.z], color };
}

/** The stake, the cord out to the cage, and the wire cage lying along the shore (x) with a funnel at each end. */
function trapShape() {
  const [left, right] = [CAGE_ALONG - CAGE_LENGTH / 2, CAGE_ALONG + CAGE_LENGTH / 2];
  const parts: PaintedPart[] = [
    { geometry: new THREE.CylinderGeometry(0.014, 0.022, STAKE_TOP + 0.06, 5), position: [0, STAKE_TOP / 2 - 0.03, 0], color: "#6b5236" },
    rod(new THREE.Vector3(0, STAKE_TOP - 0.04, 0), new THREE.Vector3(left + 0.02, CAGE_Y + CAGE_RADIUS, TRAP_REACH), 0.005, TWINE),
  ];
  for (const at of [0, 0.33, 0.67, 1]) {
    parts.push({ geometry: new THREE.TorusGeometry(CAGE_RADIUS, 0.008, 3, 12), position: [left + CAGE_LENGTH * at, CAGE_Y, TRAP_REACH], rotation: [0, Math.PI / 2, 0], color: WIRE });
  }
  for (let i = 0; i < 6; i += 1) {
    const turn = (i / 6) * Math.PI * 2;
    const ring = (radius: number, x: number) => new THREE.Vector3(x, CAGE_Y + Math.sin(turn) * radius, TRAP_REACH + Math.cos(turn) * radius);
    parts.push(rod(ring(CAGE_RADIUS, left), ring(CAGE_RADIUS, right), 0.006, WIRE));
    // Each end's funnel narrows inward to its mouth.
    for (const [end, inward] of [[left, 1], [right, -1]] as const) parts.push(rod(ring(CAGE_RADIUS, end), ring(MOUTH, end + inward * FUNNEL), 0.005, WIRE));
  }
  return mergePainted(parts);
}

/** The shiner trap by the shack while it is set (trapSpot.ts): one draw, and a second for a shiner flipping in the cage once it is ready to lift. */
export function ShinerTrap({ ready }: { ready: boolean }) {
  const still = useReducedMotion();
  const fish = useRef<THREE.Mesh>(null);
  const shape = useMemo(trapShape, []);
  const body = useMemo(() => new THREE.SphereGeometry(1, 6, 4), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const silver = useMemo(() => new THREE.MeshToonMaterial({ color: SHINER, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shape, body, material, silver].forEach((item) => item.dispose());
    },
    [shape, body, material, silver],
  );
  useFrame(({ clock }) => {
    const mesh = fish.current;
    if (!mesh) return;
    const flip = shinerFlip(clock.elapsedTime, still);
    mesh.visible = flip !== null;
    if (!flip) return;
    mesh.position.set(CAGE_ALONG + flip.along, 0.02 + flip.lift, TRAP_REACH);
    mesh.rotation.z = flip.roll;
  });
  return (
    <group name="shiner-trap" position={[TRAP_STAKE.x, 0, TRAP_STAKE.z]} rotation={[0, TRAP_STAKE.yaw, 0]}>
      <mesh geometry={shape} material={material} />
      {ready && <mesh ref={fish} geometry={body} material={silver} visible={false} scale={[0.05, 0.016, 0.01]} />}
    </group>
  );
}
