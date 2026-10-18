import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { leafGeometry } from "./FallingLeaves";
import { SUNK_COLORS, sunkenLeaves } from "./leafLitter";
import { toonRamp } from "./toon";
import { bedHeight } from "./water";

/** Drawn larger than life like the floating leaves, a little smaller as they lie deeper. */
const LEAF_SCALE = 1.8;

/** Fall's leaves lying sodden on the shallow bed round the dock until spring, in one draw (leafLitter.ts). */
export function SunkenLeaves() {
  const leaves = useMemo(sunkenLeaves, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(leafGeometry, []);
  // Seen through the water: drawn after it (renderOrder), part see-through so the water's tint shows.
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useEffect(() => {
    const bed = mesh.current;
    if (!bed) return;
    const scratch = new THREE.Object3D();
    const colors = SUNK_COLORS.map((c) => new THREE.Color(c));
    leaves.forEach((leaf, i) => {
      scratch.position.set(leaf.x, bedHeight(leaf.x, leaf.z) + 0.012, leaf.z);
      scratch.rotation.set(-Math.PI / 2, 0, leaf.turn);
      scratch.scale.setScalar(leaf.size * LEAF_SCALE);
      scratch.updateMatrix();
      bed.setMatrixAt(i, scratch.matrix);
      bed.setColorAt(i, colors[leaf.color]!);
    });
    bed.instanceMatrix.needsUpdate = true;
    if (bed.instanceColor) bed.instanceColor.needsUpdate = true;
  }, [leaves]);
  return <instancedMesh ref={mesh} name="sunken-leaves" args={[geometry, material, leaves.length]} frustumCulled={false} renderOrder={2} />;
}
