import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { mergeParts } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { bedHeight } from "./water";
import { strandSway, weedGrowth, weedStrands } from "./weedSway";

/** Leaves drawn wider than life, so the weed reads through the water from the dock. */
const LEAF_WIDTH = 2;

/** A strand one unit tall, rooted at the origin: a thin stem with strap leaves up it, turn and turn about. */
export function strandGeometry() {
  const stem = new THREE.CylinderGeometry(0.004, 0.007, 1, 4).translate(0, 0.5, 0);
  const leaves = [0.28, 0.45, 0.62, 0.78, 0.93].map((up, i) => ({
    geometry: new THREE.SphereGeometry(1, 6, 4),
    position: [(i % 2 === 0 ? 1 : -1) * 0.012 * LEAF_WIDTH, up, 0] as [number, number, number],
    rotation: [0, 0, (i % 2 === 0 ? -1 : 1) * 0.5] as [number, number, number],
    scale: [0.011 * LEAF_WIDTH, 0.09, 0.004 * LEAF_WIDTH] as [number, number, number],
  }));
  return mergeParts([{ geometry: stem }, ...leaves]);
}

/** Pondweed rocking in the swell on the bed round the dock, all in one draw (weedSway.ts). */
export function Waterweed({ season }: { season: LakeSeason }) {
  const still = useReducedMotion();
  const growth = weedGrowth(season);
  const strands = useMemo(weedStrands, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(strandGeometry, []);
  // Seen through the water: drawn after it (renderOrder), part see-through so the water's tint shows.
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), transparent: true, opacity: 0.75 }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const color = growth?.color;
  useEffect(() => {
    if (color) material.color.set(color);
  }, [color, material]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const weed = mesh.current;
    if (!weed || !growth) return;
    strands.forEach((strand, i) => {
      const sway = strandSway(strand, clock.elapsedTime, still);
      scratch.position.set(strand.x, bedHeight(strand.x, strand.z), strand.z);
      // Turned about its own stem first, then tipped by the swell about world x and z.
      scratch.rotation.set(sway.x, strand.turn, sway.z, "XZY");
      scratch.scale.set(1, strand.height * growth.height, 1);
      scratch.updateMatrix();
      weed.setMatrixAt(i, scratch.matrix);
    });
    weed.instanceMatrix.needsUpdate = true;
  });
  if (!growth) return null;
  return <instancedMesh ref={mesh} name="waterweed" args={[geometry, material, strands.length]} frustumCulled={false} renderOrder={2} />;
}
