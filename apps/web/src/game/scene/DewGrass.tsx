import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { DEW_GLINT_COUNT, DEW_LEFT, dewGlint, dewGlintSpot } from "./dewGlints";
import { useReducedMotion } from "./reducedMotion";

/** Pixels across: the banks are tens of metres off, so a true-size drop would never show. */
const GLINT_SIZE = 5;

/** Dew sparkling in the shore grass at dawn. */
export function DewGrass() {
  const still = useReducedMotion();
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const spots = Array.from({ length: DEW_GLINT_COUNT }, (_, i) => dewGlintSpot(i));
    geo.setAttribute("position", new THREE.Float32BufferAttribute(spots.flatMap((s) => [s.x, s.y, s.z]), 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(spots.flatMap(() => [DEW_LEFT, DEW_LEFT, DEW_LEFT]), 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: GLINT_SIZE,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((state) => {
    geometry.setDrawRange(0, settings.particles === "lite" ? DEW_GLINT_COUNT / 2 : DEW_GLINT_COUNT);
    if (still) return;
    const t = state.clock.elapsedTime;
    const tint = geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < tint.count; i += 1) {
      const glint = dewGlint(i, t);
      tint.setXYZ(i, glint, glint, glint * 0.95);
    }
    tint.needsUpdate = true;
  });
  return <points name="dew-grass" geometry={geometry} material={material} frustumCulled={false} />;
}
