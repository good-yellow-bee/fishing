import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { PUFFS, WISPS, smokePuffAt } from "./lakeSteam";
import { useReducedMotion } from "./reducedMotion";

/** Each puff's width in the world, in metres. */
const PUFF_SIZE = 4;

/** Wisps of steam rising off the lake on cold dawns (lakeSteam.ts), drawn as one cloud of soft puffs in the mist's colour. */
export function LakeSmoke({ wind, color }: { wind: { x: number; z: number }; color: string }) {
  const still = useReducedMotion();
  const tint = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35), [color]);
  const texture = useMemo(() => makeSoftSpotTexture(0.35), []);
  const parts = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(WISPS * PUFFS * 3), 3));
    // Four channels, so each puff carries its own thickness.
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(WISPS * PUFFS * 4), 4));
    const material = new THREE.PointsMaterial({ map: texture, size: PUFF_SIZE, vertexColors: true, transparent: true, depthWrite: false });
    return { geometry, material };
  }, [texture]);
  useEffect(
    () => () => {
      parts.geometry.dispose();
      parts.material.dispose();
      texture.dispose();
    },
    [parts, texture],
  );
  useFrame(({ clock }) => {
    const at = parts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const glow = parts.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < WISPS; i++)
      for (let k = 0; k < PUFFS; k++) {
        const puff = smokePuffAt(i, k, clock.elapsedTime, wind, still);
        const n = i * PUFFS + k;
        at.setXYZ(n, puff.x, puff.y, puff.z);
        glow.setXYZW(n, tint.r, tint.g, tint.b, puff.alpha);
      }
    at.needsUpdate = true;
    glow.needsUpdate = true;
  });
  return <points name="lake-smoke" geometry={parts.geometry} material={parts.material} frustumCulled={false} renderOrder={3} />;
}
