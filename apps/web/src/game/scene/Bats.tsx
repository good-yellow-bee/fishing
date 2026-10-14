import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { BAT_COUNT, batAt } from "./batFlight";
import { useReducedMotion } from "./reducedMotion";

/** Meters wingtip to wingtip, drawn larger than life so the silhouettes read at a distance. */
const BAT_SPAN = 0.95;
/** Radians the wings swing up and down through a beat. */
const FLAP_SWING = 0.9;
const BAT_COLOR = "#231c22";

/** One wing, a scalloped triangle reaching out along +x from the body. */
function makeWing() {
  const half = BAT_SPAN / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.08);
  shape.lineTo(half, 0.04);
  shape.lineTo(half * 0.78, -0.07);
  shape.lineTo(half * 0.55, -0.03);
  shape.lineTo(half * 0.32, -0.09);
  shape.lineTo(0, -0.06);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  // Lay it flat, front edge toward +z, the way the pose's yaw faces.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function Bat({ index, wing, material }: { index: number; wing: THREE.BufferGeometry; material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const still = useReducedMotion();
  useFrame((state) => {
    const group = ref.current;
    if (!group) return;
    // Lite effects keep the first half of the colony.
    group.visible = settings.particles !== "lite" || index < BAT_COUNT / 2;
    if (!group.visible) return;
    const pose = batAt(index, state.clock.elapsedTime, still);
    group.position.set(pose.x, pose.y, pose.z);
    group.rotation.y = pose.yaw;
    const swing = pose.flap * FLAP_SWING;
    if (right.current) right.current.rotation.z = swing;
    if (left.current) left.current.rotation.z = -swing;
  });
  return (
    <group ref={ref}>
      <mesh material={material} scale={[0.05, 0.05, 0.09]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh ref={right} geometry={wing} material={material} />
      <mesh ref={left} geometry={wing} material={material} scale={[-1, 1, 1]} />
    </group>
  );
}

/** A few bats flickering low over the water in front of the dock; motion lives in batFlight.ts. */
export function Bats() {
  const wing = useMemo(makeWing, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: BAT_COLOR, side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      wing.dispose();
      material.dispose();
    },
    [wing, material],
  );
  return (
    <>
      {Array.from({ length: BAT_COUNT }, (_, i) => (
        <Bat key={i} index={i} wing={wing} material={material} />
      ))}
    </>
  );
}
