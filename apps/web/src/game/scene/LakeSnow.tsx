import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { SNOW_COUNT, snowFlake } from "./snowfall";

const FLAKE_COLOR = "#f4f8fb";

/** A soft round dot, so a flake near the camera reads as snow rather than a square. */
function flakeTexture() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.45, "rgba(255,255,255,0.85)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Soft flakes drifting over the lake and shore on a snowy winter day; they melt into the water unseen. */
export function LakeSnow({ light }: { light: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SNOW_COUNT * 3), 3));
    return geo;
  }, []);
  const texture = useMemo(flakeTexture, []);
  const still = useReducedMotion();
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: FLAKE_COLOR,
        map: texture,
        size: 0.13,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
      }),
    [texture],
  );

  // Unlit like the rain, so the hour's light dims it here and night snow doesn't glow.
  useEffect(() => {
    material.color.set(FLAKE_COLOR).multiplyScalar(Math.max(0.25, light));
  }, [light, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    [geometry, material, texture],
  );

  useFrame(({ clock }) => {
    // Flakes hang where they are for reduced motion.
    const time = still ? STILL_TIME : clock.elapsedTime;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < SNOW_COUNT; i += stride, slot += 1) {
      const flake = snowFlake(i, time);
      positions.setXYZ(slot, flake.x, flake.y, flake.z);
    }
    geometry.setDrawRange(0, slot);
    positions.needsUpdate = true;
  });

  return <points name="lake-snow" geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
