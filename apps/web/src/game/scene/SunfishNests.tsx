import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { guardSpot, sunfishNests } from "./sunfishNests";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { bedHeight } from "./water";

/** Fanned-clean sand, paler than the bed round it. */
const NEST_SAND = "#e4d6a8";
/** How high the guard hovers over its bed, in metres. */
const GUARD_HOVER = 0.18;

/** A bed: pale clean sand in the middle, a raised rim of darker sand, fading out into the bed. */
function nestTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const bed = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    bed.addColorStop(0, "rgba(255,255,255,0.95)");
    bed.addColorStop(0.62, "rgba(255,255,255,0.8)");
    bed.addColorStop(0.78, "rgba(120,104,70,0.55)");
    bed.addColorStop(1, "rgba(120,104,70,0)");
    ctx.fillStyle = bed;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Sunfish nests in the shallows either side of the dock in late spring and summer: pale round beds
 * fanned in the sand, each with its guard hovering over it (sunfishNests.ts). Two draws in all.
 */
export function SunfishNests() {
  const still = useReducedMotion();
  const nests = useMemo(sunfishNests, []);
  const beds = useRef<THREE.InstancedMesh>(null);
  const guards = useRef<THREE.InstancedMesh>(null);
  const bedShape = useMemo(() => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), []);
  const guardShape = useMemo(() => new THREE.SphereGeometry(1, 8, 6).scale(0.05, 0.03, 0.09), []);
  const texture = useMemo(nestTexture, []);
  const bedMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: NEST_SAND, map: texture, gradientMap: toonRamp(), transparent: true, depthWrite: false }), [texture]);
  const guardMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#13261f", transparent: true, opacity: 0.75, depthWrite: false }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      for (const thing of [bedShape, guardShape, texture, bedMaterial, guardMaterial]) thing.dispose();
    },
    [bedShape, guardShape, texture, bedMaterial, guardMaterial],
  );
  useEffect(() => {
    const mesh = beds.current;
    if (!mesh) return;
    nests.forEach((nest, i) => {
      scratch.position.set(nest.x, bedHeight(nest.x, nest.z) + 0.015, nest.z);
      scratch.rotation.set(0, 0, 0);
      scratch.scale.setScalar(nest.radius);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [nests, scratch]);
  useFrame(({ clock }) => {
    const mesh = guards.current;
    if (!mesh) return;
    nests.forEach((nest, i) => {
      const guard = guardSpot(nest, clock.elapsedTime, still);
      scratch.position.set(guard.x, bedHeight(guard.x, guard.z) + GUARD_HOVER, guard.z);
      scratch.rotation.set(0, guard.yaw, 0);
      scratch.scale.setScalar(1);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={beds} name="sunfish-nests" args={[bedShape, bedMaterial, nests.length]} frustumCulled={false} />
      <instancedMesh ref={guards} name="nest-guards" args={[guardShape, guardMaterial, nests.length]} frustumCulled={false} />
    </group>
  );
}
