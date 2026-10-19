import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { makeSoftSpotTexture } from "./Atmosphere";
import { CRYSTALS, crystalAt } from "./iceGlitter";
import { useReducedMotion } from "./reducedMotion";

const SPARK = "#eef8ff";
/** Drawn far larger than life, so a flash reads as a spark from the dock. */
const CRYSTAL_SIZE = 0.12;
const NO_WIND = { x: 0, z: 0 };

/** Tiny ice crystals hanging in the air over the lake on bitter, clear winter mornings, flashing now and then in the sun (iceGlitter.ts). */
export function DiamondDust({ wind = NO_WIND }: { wind?: { x: number; z: number } }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color(SPARK), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.12), []);
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
    const sparks = mesh.current;
    if (!sparks) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < CRYSTALS; i += stride, slot += 1) {
      const c = crystalAt(i, time, wind, still);
      scratch.position.set(c.x, c.y, c.z);
      scratch.quaternion.copy(camera.quaternion);
      // A flash swells the spark as well as brightening it.
      scratch.scale.setScalar(CRYSTAL_SIZE * (0.4 + 0.9 * c.flash));
      scratch.updateMatrix();
      sparks.setMatrixAt(slot, scratch.matrix);
      sparks.setColorAt(slot, color.copy(base).multiplyScalar(c.flash));
    }
    sparks.count = slot;
    sparks.instanceMatrix.needsUpdate = true;
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="diamond-dust" args={[geometry, material, CRYSTALS]} frustumCulled={false} renderOrder={6} />;
}
