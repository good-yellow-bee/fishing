import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Groundbait } from "../logic";
import { CLOUD_RADIUS, cloudCenter, cloudOpacity } from "./groundbaitCloud";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const CLOUD = "#7a5a32";

/** A soft round edge, so the cloud fades into the water instead of ending in a hard disc. */
function softEdge() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const paint = canvas.getContext("2d");
  if (paint) {
    const fade = paint.createRadialGradient(32, 32, 4, 32, 32, 32);
    fade.addColorStop(0, "#fff");
    fade.addColorStop(0.55, "#bbb");
    fade.addColorStop(1, "#000");
    paint.fillStyle = fade;
    paint.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/** The muddy cloud a handful of groundbait leaves off the bank, thinning as its casts are fished out. One draw. */
export function GroundbaitCloud({ bait }: { bait: Groundbait }) {
  const still = useReducedMotion();
  const geo = useMemo(() => new THREE.CircleGeometry(CLOUD_RADIUS, 32).rotateX(-Math.PI / 2), []);
  const edge = useMemo(() => softEdge(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: CLOUD, alphaMap: edge, transparent: true, depthWrite: false }), [edge]);
  const cloud = useRef<THREE.Mesh>(null);
  const at = cloudCenter(bait.spot);
  useEffect(
    () => () => {
      geo.dispose();
      edge.dispose();
      mat.dispose();
    },
    [geo, edge, mat],
  );
  useFrame((state) => {
    const mesh = cloud.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.position.set(at.x, waterHeight(at.x, at.z, t) + 0.02, at.z);
    // A slow swell as the crumbs drift and settle.
    mesh.scale.setScalar(still ? 1 : 1 + 0.06 * Math.sin(t * 0.8));
    mat.opacity = cloudOpacity(bait.casts);
  });
  return <mesh ref={cloud} geometry={geo} material={mat} renderOrder={1} />;
}
