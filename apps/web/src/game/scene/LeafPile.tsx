import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LEAF_COLORS } from "./leafFall";
import { BURST_LEAVES, PILE_AT, burstLeaf, jumperAt } from "./leafJump";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const JACKET = "#3c7fbf";
const TROUSERS = "#5b4a3a";
const SKIN = "#e2b48c";
const HAT = "#d8443a";
const HIP_Y = 0.5;
const LEG = 0.48;
/** Drawn a little larger than life, so the leap reads from across the lake. */
const SCALE = 1.25;

/** The pile: a low mound of leaves in the fall colours. */
export function pileShape() {
  return mergePainted(
    Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const r = i === 0 ? 0 : 0.35 + (i % 2) * 0.12;
      return {
        geometry: new THREE.SphereGeometry(0.32 - (i === 0 ? 0 : 0.08), 7, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as const,
        scale: [1, i === 0 ? 0.9 : 0.6, 1] as const,
        color: LEAF_COLORS[i % LEAF_COLORS.length]!,
      };
    }),
  );
}

/** The child's body above the hips, in a woolly hat, facing +z. */
export function kidTorsoShape(jacket: string = JACKET, hat: string = HAT) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.1, 0.12, 0.36, 8), position: [0, 0.18, 0], color: jacket },
    { geometry: new THREE.SphereGeometry(0.09, 10, 8), position: [0, 0.46, 0], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.095, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.48, 0], color: hat },
    { geometry: new THREE.SphereGeometry(0.035, 6, 4), position: [0, 0.58, 0], color: "#f3efe6" },
  ]);
}

export function kidLimbShape(length: number, color: string) {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.035, 0.032, length, 6), position: [0, -length / 2, 0], color }]);
}

/** A child running and leaping into a pile of raked leaves on the far bank on a dry fall day. */
export function LeafPile() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const burst = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(
    () => ({ pile: pileShape(), torso: kidTorsoShape(), leg: kidLimbShape(LEG, TROUSERS), arm: kidLimbShape(0.32, JACKET), leaf: new THREE.PlaneGeometry(0.1, 0.06) }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const leafMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, leafMaterial].forEach((item) => item.dispose());
    },
    [shapes, material, leafMaterial],
  );
  useEffect(() => {
    const mesh = burst.current;
    if (!mesh) return;
    for (let i = 0; i < BURST_LEAVES; i += 1) mesh.setColorAt(i, new THREE.Color(LEAF_COLORS[i % LEAF_COLORS.length]!));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = jumperAt(time, still);
    if (body.current) {
      body.current.position.set(pose.x, pose.y, pose.z);
      body.current.rotation.y = pose.yaw;
    }
    // Lying back in the pile: the whole child tips over backward about the hips.
    if (tilt.current) tilt.current.rotation.x = -pose.lie * (Math.PI / 2) * 0.95;
    [1, -1].forEach((side, i) => {
      const swing = pose.stride * side * 0.6 * pose.pace;
      const leg = legs[i]!.current;
      if (leg) leg.rotation.x = -swing;
      const arm = arms[i]!.current;
      // Arms swing against the legs as they run, and fling up overhead as they leap.
      if (arm) arm.rotation.x = swing - pose.arms * 2.8;
    });
    const mesh = burst.current;
    if (!mesh) return;
    let shown = 0;
    for (let i = 0; i < BURST_LEAVES; i += 1) {
      const leaf = burstLeaf(i, time, still);
      if (!leaf) continue;
      scratch.position.set(leaf.x, leaf.y, leaf.z);
      scratch.rotation.set(leaf.spin, leaf.spin * 0.7, 0);
      scratch.updateMatrix();
      mesh.setMatrixAt(shown, scratch.matrix);
      mesh.setColorAt(shown, new THREE.Color(LEAF_COLORS[i % LEAF_COLORS.length]!));
      shown += 1;
    }
    mesh.count = shown;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <group name="leaf-pile">
      <mesh geometry={shapes.pile} material={material} position={[PILE_AT.x, 0, PILE_AT.z]} scale={SCALE} />
      <group ref={body} scale={SCALE}>
        <group ref={tilt} position={[0, HIP_Y, 0]}>
          <mesh geometry={shapes.torso} material={material} castShadow />
          {[1, -1].map((side, i) => (
            <group key={side} ref={arms[i]} position={[side * 0.13, 0.32, 0]}>
              <mesh geometry={shapes.arm} material={material} />
            </group>
          ))}
          {[1, -1].map((side, i) => (
            <group key={side} ref={legs[i]} position={[side * 0.06, 0, 0]}>
              <mesh geometry={shapes.leg} material={material} />
            </group>
          ))}
        </group>
      </group>
      <instancedMesh ref={burst} args={[shapes.leaf, leafMaterial, BURST_LEAVES]} frustumCulled={false} />
    </group>
  );
}
