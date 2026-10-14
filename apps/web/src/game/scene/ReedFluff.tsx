import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { makeSoftSpotTexture } from "./Atmosphere";
import { FLUFF_COUNT, tuftAt } from "./cattailTufts";
import { useReducedMotion } from "./reducedMotion";

const NO_WIND = { x: 0, z: 0 };
const HIDDEN_Y = -50;

/** Soft white cattail tufts floating off the reed beds on the breeze; `light` dims them toward night. */
export function ReedFluff({ wind = NO_WIND, light }: { wind?: { x: number; z: number }; light: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FLUFF_COUNT * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(FLUFF_COUNT * 4), 4));
    return geo;
  }, []);
  const texture = useMemo(() => makeSoftSpotTexture(0.25), []);
  const material = useMemo(
    () => new THREE.PointsMaterial({ size: 0.5, map: texture, vertexColors: true, transparent: true, depthWrite: false }),
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
  useFrame(({ clock }) => {
    // Held where they are for reduced motion, as if the air had stilled.
    const time = still ? 8 : clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    const spot = geometry.getAttribute("position") as THREE.BufferAttribute;
    const tint = geometry.getAttribute("color") as THREE.BufferAttribute;
    const shade = Math.max(0.3, Math.min(1, light));
    for (let i = 0; i < FLUFF_COUNT; i++) {
      const tuft = i % stride === 0 ? tuftAt(i, time, wind) : null;
      if (!tuft) {
        spot.setXYZ(i, 0, HIDDEN_Y, 0);
        tint.setXYZW(i, 0, 0, 0, 0);
        continue;
      }
      spot.setXYZ(i, tuft.x, tuft.y, tuft.z);
      tint.setXYZW(i, shade, shade, shade * 0.97, tuft.alpha * 0.9);
    }
    spot.needsUpdate = true;
    tint.needsUpdate = true;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
