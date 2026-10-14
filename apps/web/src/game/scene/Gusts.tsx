import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { GUST_COUNT, gustAt } from "./gustPatch";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const GUST_COLOR = "#d6ecf2";
const GUST_PEAK = 0.32;

/** A soft oval of fine ripple crests, which run across the wind (along the texture's x). */
function rippleTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  for (let y = 4; y < size; y += 5) {
    const jitter = Math.sin(y * 1.7) * 1.5;
    ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * Math.sin(y * 0.9) ** 2})`;
    ctx.fillRect(0, y + jitter, size, 2);
  }
  // Fade the crests to nothing toward the oval's rim.
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, "rgba(255,255,255,1)");
  fade.addColorStop(0.55, "rgba(255,255,255,0.7)");
  fade.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Rippled patches, catching the sky, sweeping downwind across the lake on breezy days; motion lives in gustPatch.ts. */
export function Gusts({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(rippleTexture, []);
  const materials = useMemo(
    () => Array.from({ length: GUST_COUNT }, () => new THREE.MeshBasicMaterial({ color: GUST_COLOR, map: texture, transparent: true, opacity: 0, depthWrite: false })),
    [texture],
  );
  const groups = useRef<Array<THREE.Group | null>>([]);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, texture, materials],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    groups.current.forEach((group, i) => {
      if (!group) return;
      const gust = !still && i % stride === 0 ? gustAt(i, time, wind) : null;
      group.visible = gust !== null;
      if (!gust) return;
      group.position.set(gust.x, waterHeight(gust.x, gust.z, time) + 0.05, gust.z);
      group.rotation.y = gust.yaw;
      group.scale.set(gust.width, 1, gust.length);
      materials[i]!.opacity = gust.alpha * GUST_PEAK;
    });
  });
  return materials.map((material, i) => (
    <group
      key={i}
      visible={false}
      ref={(group) => {
        groups.current[i] = group;
      }}
    >
      <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} />
    </group>
  ));
}
