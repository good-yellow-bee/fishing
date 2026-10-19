import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { leafGeometry } from "./FallingLeaves";
import { LEAF_COLORS } from "./leafFall";
import { WHIRL_LEAVES, leafWhirl, whirlLeaf } from "./leafEddy";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

/** Drawn larger than life, like the falling leaves, so they read from the dock. */
const LEAF_SCALE = 2.4;
const SCUFF = "#dfe9ec";

/** Now and then on a dry fall day a little whirlwind spins up a swirl of leaves on the far bank and wanders out over the water with them (leafEddy.ts). */
export function LeafWhirl() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const scuff = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => leafGeometry(), []);
  const ring = useMemo(() => new THREE.RingGeometry(0.55, 1, 24), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const scuffMat = useMemo(() => new THREE.MeshBasicMaterial({ color: SCUFF, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), []);
  const colors = useMemo(() => LEAF_COLORS.map((c) => new THREE.Color(c)), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      ring.dispose();
      material.dispose();
      scuffMat.dispose();
    },
    [geometry, ring, material, scuffMat],
  );
  useFrame(({ clock }) => {
    const leaves = mesh.current;
    if (!leaves) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < WHIRL_LEAVES; i += stride) {
      const leaf = whirlLeaf(i, time, still);
      if (!leaf) continue;
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
    // Where the whirl's foot crosses the water it scuffs a spinning ring of ripples.
    const whirl = leafWhirl(time, still);
    if (scuff.current) {
      scuff.current.visible = !!whirl;
      if (whirl) {
        scuff.current.position.set(whirl.x, waterHeight(whirl.x, whirl.z, time) + 0.03, whirl.z);
        scuff.current.rotation.set(-Math.PI / 2, 0, time * 3);
        scuff.current.scale.setScalar(0.5 + 0.4 * whirl.strength);
        scuffMat.opacity = 0.28 * whirl.strength;
      }
    }
  });
  return (
    <group name="leaf-whirl">
      <instancedMesh ref={mesh} args={[geometry, material, WHIRL_LEAVES]} frustumCulled={false} />
      <mesh ref={scuff} geometry={ring} material={scuffMat} renderOrder={3} visible={false} />
    </group>
  );
}
