import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { LEAF_COLORS, LEAF_COUNT, PETAL_COLORS, leafAt } from "./leafFall";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const NO_WIND = { x: 0, z: 0 };
/** Drawn larger than life: a true-size leaf is a speck from the dock, and flat on the water it all but vanishes. */
const LEAF_SCALE = 2.4;

/** A pointed leaf, 26 cm long, lying in the xy plane. */
export function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.13);
  shape.quadraticCurveTo(0.1, -0.03, 0, 0.13);
  shape.quadraticCurveTo(-0.1, -0.03, 0, -0.13);
  return new THREE.ShapeGeometry(shape, 4);
}

/** A rounded blossom petal, 8 cm long, lying in the xy plane. */
export function petalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.04);
  shape.bezierCurveTo(0.05, -0.02, 0.04, 0.04, 0, 0.035);
  shape.bezierCurveTo(-0.04, 0.04, -0.05, -0.02, 0, -0.04);
  return new THREE.ShapeGeometry(shape, 4);
}

/**
 * Autumn leaves spinning down off the shore trees and drifting on the water with the day's wind;
 * or, in spring (`petals`), the blossom's petals doing the same.
 */
export function FallingLeaves({ wind = NO_WIND, petals = false }: { wind?: { x: number; z: number }; petals?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => (petals ? petalGeometry() : leafGeometry()), [petals]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const colors = useMemo(() => (petals ? PETAL_COLORS : LEAF_COLORS).map((c) => new THREE.Color(c)), [petals]);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const leaves = mesh.current;
    if (!leaves) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < LEAF_COUNT; i += stride) {
      const leaf = leafAt(i, time, wind);
      if (!leaf || leaf.size <= 0) continue;
      scratch.position.set(leaf.x, waterHeight(leaf.x, leaf.z, time) + 0.02 + leaf.height, leaf.z);
      scratch.rotation.set(-Math.PI / 2 + leaf.tilt, leaf.spin, 0, "YXZ");
      scratch.scale.setScalar(leaf.size * LEAF_SCALE);
      scratch.updateMatrix();
      leaves.setMatrixAt(slot, scratch.matrix);
      leaves.setColorAt(slot, colors[leaf.color % colors.length]!);
      slot += 1;
    }
    leaves.count = slot;
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} name={petals ? "falling-petals" : "falling-leaves"} args={[geometry, material, LEAF_COUNT]} frustumCulled={false} />;
}
