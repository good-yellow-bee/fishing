import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { SWALLOW_COUNT, swallowAt } from "./swallowFlight";
import { useReducedMotion } from "./reducedMotion";

const BACK = "#22305a";
const BELLY = "#f1ece0";
/** Drawn larger than life so the birds read as they sweep across the far water. */
const SWALLOW_SCALE = 2.4;
/** Radians the wings swing through a beat. */
const FLAP_SWING = 0.6;

/** One swept-back wing reaching out along +x from the shoulder, front edge toward +z. */
function makeWing() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.03);
  shape.lineTo(0.16, -0.05);
  shape.lineTo(0.2, -0.09);
  shape.lineTo(0.1, -0.05);
  shape.lineTo(0, -0.03);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** The forked tail: two thin streamers behind the body. */
function makeTail() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.035, -0.11);
  shape.lineTo(0.012, -0.05);
  shape.lineTo(0, -0.04);
  shape.lineTo(-0.012, -0.05);
  shape.lineTo(-0.035, -0.11);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

type Parts = { wing: THREE.BufferGeometry; tail: THREE.BufferGeometry; back: THREE.Material; belly: THREE.Material };

function Swallow({ index, parts }: { index: number; parts: Parts }) {
  const ref = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const still = useReducedMotion();
  useFrame((state) => {
    const group = ref.current;
    if (!group) return;
    group.visible = settings.particles !== "lite" || index < SWALLOW_COUNT / 2;
    if (!group.visible) return;
    const pose = swallowAt(index, state.clock.elapsedTime, still);
    group.position.set(pose.x, pose.y, pose.z);
    group.rotation.set(0, pose.yaw, pose.bank, "YXZ");
    const swing = pose.flap * FLAP_SWING;
    if (right.current) right.current.rotation.z = swing;
    if (left.current) left.current.rotation.z = -swing;
  });
  return (
    <group ref={ref} scale={SWALLOW_SCALE}>
      <mesh material={parts.back} scale={[0.022, 0.02, 0.06]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh material={parts.belly} position={[0, -0.006, 0.005]} scale={[0.018, 0.015, 0.045]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh geometry={parts.tail} material={parts.back} position={[0, 0, -0.045]} />
      <mesh ref={right} geometry={parts.wing} material={parts.back} position={[0.012, 0.004, 0.01]} />
      <mesh ref={left} geometry={parts.wing} material={parts.back} position={[-0.012, 0.004, 0.01]} scale={[-1, 1, 1]} />
    </group>
  );
}

/** Swallows sweeping low over the lake on warm, still summer days; motion lives in swallowFlight.ts. */
export function Swallows() {
  const parts = useMemo<Parts>(
    () => ({
      wing: makeWing(),
      tail: makeTail(),
      back: new THREE.MeshBasicMaterial({ color: BACK, side: THREE.DoubleSide }),
      belly: new THREE.MeshBasicMaterial({ color: BELLY }),
    }),
    [],
  );
  useEffect(
    () => () => {
      parts.wing.dispose();
      parts.tail.dispose();
      parts.back.dispose();
      parts.belly.dispose();
    },
    [parts],
  );
  return (
    <>
      {Array.from({ length: SWALLOW_COUNT }, (_, i) => (
        <Swallow key={i} index={i} parts={parts} />
      ))}
    </>
  );
}
