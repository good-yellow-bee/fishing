import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CABIN_WINDOW_LIGHTS, GLINTS_PER_WINDOW, windowGlints } from "./cabinShine";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const GLOW = "#ffcf7a";
const GAIN = 1.2;

/** The far cabin's lit windows mirrored on the lake as two broken streaks of warm light, dimmer when rain or fog breaks them up (`strength` 0..1). */
export function WindowGlow({ strength }: { strength: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.0, 0.35), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const helper = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color(GLOW), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    const glow = mesh.current;
    if (!glow) return;
    const t = state.clock.elapsedTime;
    const eye = state.camera.position;
    let n = 0;
    CABIN_WINDOW_LIGHTS.forEach((_, w) => {
      const glints = windowGlints(w, eye, t, still);
      // Each glint lies across the line of sight, the way light breaks on ripples.
      const toEye = glints.length > 0 ? Math.atan2(-(eye.z - glints[0]!.z), eye.x - glints[0]!.x) + Math.PI / 2 : 0;
      glints.forEach((glint) => {
        helper.position.set(glint.x, waterHeight(glint.x, glint.z, t) + 0.06, glint.z);
        helper.rotation.set(-Math.PI / 2, 0, toEye);
        helper.scale.setScalar(glint.scale);
        helper.updateMatrix();
        glow.setMatrixAt(n, helper.matrix);
        // Additive light: a dimmer glint is simply a darker colour. Lamplight on dark water reads brighter than the lamp's own hue.
        glow.setColorAt(n, tint.copy(base).multiplyScalar(glint.alpha * strength * GAIN));
        n += 1;
      });
    });
    glow.count = n;
    glow.instanceMatrix.needsUpdate = true;
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, CABIN_WINDOW_LIGHTS.length * GLINTS_PER_WINDOW]} frustumCulled={false} renderOrder={6} name="cabin-window-glow" />;
}
