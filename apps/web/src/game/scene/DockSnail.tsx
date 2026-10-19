import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { SNAIL_Y, snailAt, trailAt } from "./snailCrawl";
import { toonRamp } from "./toon";

const SHELL = "#9a6a3c";
const BAND = "#5e3e22";
const FOOT = "#8c8478";
const TRAIL = "#7d8c96";
/** Larger than life, so it reads from behind the angler. */
const SCALE = 3.2;
/** Dabs of slime along the trail. */
const DABS = 18;

/** The coiled shell: a fat whorl and a smaller one on top, a dark band round each. */
export function snailShellShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.016, 10, 8), position: [0, 0.018, -0.004], scale: [0.85, 1, 1], color: SHELL },
    { geometry: new THREE.TorusGeometry(0.012, 0.0035, 5, 14), position: [0, 0.018, -0.004], rotation: [0, Math.PI / 2, 0], color: BAND },
    { geometry: new THREE.SphereGeometry(0.008, 8, 6), position: [0, 0.028, -0.008], color: SHELL },
    { geometry: new THREE.TorusGeometry(0.006, 0.002, 4, 10), position: [0, 0.028, -0.008], rotation: [0, Math.PI / 2, 0], color: BAND },
  ]);
}

/** The soft foot it glides on, its head end forward (+z). */
export function snailFootShape() {
  return mergePainted([{ geometry: new THREE.SphereGeometry(1, 10, 6), position: [0, 0.004, 0.004], scale: [0.007, 0.005, 0.03], color: FOOT }]);
}

/** The two eye stalks, from the head. */
export function snailStalksShape() {
  return mergePainted(
    [-1, 1].flatMap((side) => [
      { geometry: new THREE.CylinderGeometry(0.0012, 0.0016, 0.014, 4), position: [side * 0.003, 0.006, 0.002] as const, rotation: [0.6, 0, side * 0.3] as const, color: FOOT },
      { geometry: new THREE.SphereGeometry(0.0022, 5, 4), position: [side * 0.005, 0.012, 0.006] as const, color: "#2a2622" },
    ]),
  );
}

/** A snail gliding a slow loop on the dock's planks behind the angler (snailCrawl.ts). */
export function DockSnail() {
  const still = useReducedMotion();
  const snail = useRef<THREE.Group>(null);
  const foot = useRef<THREE.Group>(null);
  const stalks = useRef<THREE.Group>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(
    () => ({ shell: snailShellShape(), foot: snailFootShape(), stalks: snailStalksShape(), dab: new THREE.CircleGeometry(0.011, 8).rotateX(-Math.PI / 2) }),
    [],
  );
  const materials = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      trail: new THREE.MeshBasicMaterial({ color: TRAIL, transparent: true, opacity: 0.35, depthWrite: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, materials],
  );
  const at = useMemo(() => new THREE.Matrix4(), []);
  const size = useMemo(() => new THREE.Vector3(), []);
  const spot = useMemo(() => new THREE.Vector3(), []);
  const turn = useMemo(() => new THREE.Quaternion(), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = snailAt(time, still);
    if (snail.current) {
      snail.current.position.set(pose.x, SNAIL_Y, pose.z);
      snail.current.rotation.y = pose.yaw;
    }
    if (foot.current) foot.current.scale.set(1, 1, 1 + pose.stretch * 0.1);
    if (stalks.current) stalks.current.rotation.set(0.15 * pose.stretch, pose.sway * 0.35, 0);
    const dabs = trail.current;
    if (dabs) {
      // The trail narrows and fades away as it dries, the oldest dabs smallest.
      trailAt(time, DABS, still).forEach((p, k) => {
        const s = SCALE * (1 - (k / DABS) * 0.7);
        at.compose(spot.set(p.x, SNAIL_Y + 0.002, p.z), turn, size.set(s, 1, s));
        dabs.setMatrixAt(k, at);
      });
      dabs.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group name="dock-snail">
      <instancedMesh ref={trail} args={[shapes.dab, materials.trail, DABS]} frustumCulled={false} />
      <group ref={snail}>
        <group scale={SCALE}>
          <group ref={foot}>
            <mesh geometry={shapes.foot} material={materials.painted} />
          </group>
          <mesh geometry={shapes.shell} material={materials.painted} castShadow />
          <group ref={stalks} position={[0, 0.004, 0.03]}>
            <mesh geometry={shapes.stalks} material={materials.painted} />
          </group>
        </group>
      </group>
    </group>
  );
}
