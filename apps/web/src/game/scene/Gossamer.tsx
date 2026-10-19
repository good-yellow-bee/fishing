import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "./reducedMotion";
import { THREADS, THREAD_POINTS, silkPoint } from "./silkDrift";

const SILK = new THREE.Color("#fff6e0");
const SEGMENTS = THREADS * (THREAD_POINTS - 1);

/** Long silk threads drifting over the water in front of the dock on still fall mornings, sun glinting along them (silkDrift.ts). */
export function Gossamer() {
  const still = useReducedMotion();
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEGMENTS * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SEGMENTS * 6), 3));
    return g;
  }, []);
  // Additive, so a darker colour is a fainter thread.
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const color = geometry.getAttribute("color") as THREE.BufferAttribute;
    let v = 0;
    for (let i = 0; i < THREADS; i++) {
      let last = silkPoint(i, 0, time, still);
      for (let k = 1; k < THREAD_POINTS; k++) {
        const next = silkPoint(i, k, time, still);
        for (const p of [last, next]) {
          position.setXYZ(v, p.x, p.y, p.z);
          color.setXYZ(v, SILK.r * p.glint, SILK.g * p.glint, SILK.b * p.glint);
          v++;
        }
        last = next;
      }
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
  });
  return <lineSegments name="gossamer" geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />;
}
