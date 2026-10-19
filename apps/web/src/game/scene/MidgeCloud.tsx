import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { makeSoftSpotTexture } from "./Atmosphere";
import { MIDGES_PER_CLOUD, MIDGE_CLOUDS, midgeAt } from "./midgeDance";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const GLINT = "#ffd98a";
/** Drawn larger than life: a true-size midge is invisible from the dock. */
const MIDGE_SIZE = 0.08;
const COUNT = MIDGE_CLOUDS.length * MIDGES_PER_CLOUD;
const NO_WIND = { x: 0, z: 0 };

/** Little clouds of midges dancing over the water in front of the dock on still evenings, glinting in the low sun (midgeDance.ts). */
export function MidgeCloud({ wind = NO_WIND }: { wind?: { x: number; z: number } }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color(GLINT), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.3), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [texture],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
    [geometry, texture, material],
  );
  useFrame(({ clock, camera }) => {
    const midges = mesh.current;
    if (!midges) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    MIDGE_CLOUDS.forEach((cloud, c) => {
      const water = waterHeight(cloud.x, cloud.z, still ? 0 : time);
      for (let i = 0; i < MIDGES_PER_CLOUD; i += stride, slot += 1) {
        const midge = midgeAt(c, i, time, wind, still);
        scratch.position.set(midge.x, water + midge.y, midge.z);
        scratch.quaternion.copy(camera.quaternion);
        scratch.scale.setScalar(MIDGE_SIZE * (0.7 + 0.3 * midge.glint));
        scratch.updateMatrix();
        midges.setMatrixAt(slot, scratch.matrix);
        // Additive: a darker colour is a dimmer glint.
        midges.setColorAt(slot, color.copy(base).multiplyScalar(midge.glint));
      }
    });
    midges.count = slot;
    midges.instanceMatrix.needsUpdate = true;
    if (midges.instanceColor) midges.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="midges" args={[geometry, material, COUNT]} frustumCulled={false} renderOrder={6} />;
}
