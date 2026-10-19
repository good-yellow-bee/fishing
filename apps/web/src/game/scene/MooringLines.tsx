import { useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import { POST_TIES, SEGMENTS } from "./mooringRope";
import { toonRamp } from "./toon";

const ROPE = "#c9b48a";

/** The rowboat's bow and stern lines to the pier, one instanced draw of rope segments that PlayerBoat lays each frame (mooringRope.ts). */
export function MooringLines({ ref }: { ref: Ref<THREE.InstancedMesh> }) {
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1, 5, 1, true), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: ROPE, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <instancedMesh ref={ref} name="mooring-lines" args={[geometry, material, POST_TIES.length * SEGMENTS]} frustumCulled={false} castShadow />;
}
