import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { leafGeometry } from "./FallingLeaves";
import { LEAF_COLORS } from "./leafFall";
import { RAFT_COUNT, raftTurn, raftedLeaves } from "./raftedLeaves";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

/** Drawn larger than life, like the falling leaves, so a raft reads from across the lake. */
const RAFT_SCALE = 2.2;

/**
 * Fall's fallen leaves afloat: rafted up against the bank the breeze blows onto, with a few strays
 * on the open water, all riding the chop in one draw (raftedLeaves.ts).
 */
export function LeafRaft({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(leafGeometry, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const leaves = useMemo(() => raftedLeaves({ x: wind.x, z: wind.z }), [wind.x, wind.z]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useEffect(() => {
    const raft = mesh.current;
    if (!raft) return;
    const colors = LEAF_COLORS.map((c) => new THREE.Color(c));
    leaves.forEach((leaf, i) => raft.setColorAt(i, colors[leaf.color]!));
    if (raft.instanceColor) raft.instanceColor.needsUpdate = true;
  }, [leaves]);
  useFrame(({ clock }) => {
    const raft = mesh.current;
    if (!raft) return;
    const time = still ? 0 : clock.elapsedTime;
    leaves.forEach((leaf, i) => {
      scratch.position.set(leaf.x, waterHeight(leaf.x, leaf.z, time) + 0.025, leaf.z);
      scratch.rotation.set(-Math.PI / 2, raftTurn(leaf, time, still), 0, "YXZ");
      scratch.scale.setScalar(leaf.size * RAFT_SCALE);
      scratch.updateMatrix();
      raft.setMatrixAt(i, scratch.matrix);
    });
    raft.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="leaf-raft" args={[geometry, material, RAFT_COUNT]} frustumCulled={false} />;
}
