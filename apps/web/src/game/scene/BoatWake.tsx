import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WAKE_SPREAD, speedOf, wakeLook } from "./boatWake";
import { waterHeight } from "./water";

const WAKE = "#e4f0ec";
/** The arms' width where they leave the stern and at their far ends, as shares of their length. */
const NEAR_WIDTH = 0.08;
const FAR_WIDTH = 0.26;

/**
 * A unit-long V of two arms opening back from the stern (along -z), each fading out toward its
 * end through its vertex alpha, so it can be stretched to any length.
 */
export function wakeGeometry() {
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  [-1, 1].forEach((side, arm) => {
    const along = { x: side * Math.sin(WAKE_SPREAD), z: -Math.cos(WAKE_SPREAD) };
    const across = { x: -along.z, z: along.x };
    const steps = 6;
    for (let i = 0; i <= steps; i += 1) {
      const s = i / steps;
      const half = (NEAR_WIDTH + (FAR_WIDTH - NEAR_WIDTH) * s) / 2;
      for (const edge of [-1, 1]) {
        positions.push(along.x * s + across.x * edge * half, 0, along.z * s + across.z * edge * half);
        colors.push(1, 1, 1, (1 - s) * (1 - s));
      }
      if (i < steps) {
        const a = arm * (steps + 1) * 2 + i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(index);
  return geometry;
}

/**
 * The wake behind a boat whose path is `at` (where it is and which way its bow points at a time),
 * its stern `stern` metres behind that point. `still` leaves the water smooth.
 */
export function BoatWake({ at, stern, still }: { at: (time: number) => { x: number; z: number; yaw: number }; stern: number; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(wakeGeometry, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: WAKE, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const wake = group.current;
    if (!wake) return;
    const time = clock.elapsedTime;
    const look = still ? { length: 0, opacity: 0 } : wakeLook(speedOf(at, time));
    wake.visible = look.opacity > 0.01;
    if (!wake.visible) return;
    const pose = at(time);
    const x = pose.x - Math.sin(pose.yaw) * stern;
    const z = pose.z - Math.cos(pose.yaw) * stern;
    wake.position.set(x, waterHeight(x, z, time) + 0.04, z);
    wake.rotation.y = pose.yaw;
    wake.scale.set(look.length, 1, look.length);
    material.opacity = look.opacity;
  });
  return (
    <group ref={group} visible={false}>
      <mesh geometry={geometry} material={material} renderOrder={4} frustumCulled={false} />
    </group>
  );
}
