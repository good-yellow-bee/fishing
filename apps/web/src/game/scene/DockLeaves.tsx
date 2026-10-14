import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOCK_PLANKS } from "@stillwater/shared";
import { leafGeometry } from "./FallingLeaves";
import { LEAF_COLORS } from "./leafFall";
import { PLANK_LEAF_COUNT, plankLeafAt } from "./plankLeaves";
import { toonRamp } from "./toon";

const NO_WIND = { x: 0, z: 0 };
/** Larger than life so they read from the camera, but smaller than the ones out on the water. */
const LEAF_SCALE = 1.5;

/** Fall leaves lying on the dock planks, gathering through the visit and skittering in the wind. */
export function DockLeaves({ wind = NO_WIND }: { wind?: { x: number; z: number } }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(leafGeometry, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const colors = useMemo(() => LEAF_COLORS.map((c) => new THREE.Color(c)), []);
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
    let slot = 0;
    for (let i = 0; i < PLANK_LEAF_COUNT; i += 1) {
      const leaf = plankLeafAt(i, time, wind);
      if (!leaf) continue;
      scratch.position.set(leaf.x, DOCK_PLANKS.top + 0.004 + i * 0.0006 + leaf.lift, leaf.z);
      scratch.rotation.set(-Math.PI / 2, leaf.spin, 0, "YXZ");
      scratch.scale.setScalar(LEAF_SCALE);
      scratch.updateMatrix();
      leaves.setMatrixAt(slot, scratch.matrix);
      leaves.setColorAt(slot, colors[leaf.color]!);
      slot += 1;
    }
    leaves.count = slot;
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} name="dock-leaves" args={[geometry, material, PLANK_LEAF_COUNT]} frustumCulled={false} receiveShadow />;
}
