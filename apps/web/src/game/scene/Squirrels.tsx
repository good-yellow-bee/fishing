import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { squirrelAt, type Tree } from "./squirrelRun";
import { toonRamp } from "./toon";

const FUR = "#a4502a";
const TAIL = "#b8673a";
const DARK = "#2a1a12";
/** Drawn larger than life, so one reads on the far bank from the dock. */
const SCALE = 2.6;

/** The body and head bake into one shape; the tail is its own so it can flick. */
export function squirrelShapes() {
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.06, 0], scale: [0.042, 0.042, 0.085], color: FUR },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.085, 0.085], scale: [0.032, 0.032, 0.038], color: FUR },
      ...[-1, 1].map((side) => ({
        geometry: new THREE.ConeGeometry(0.01, 0.03, 4),
        position: [side * 0.016, 0.122, 0.08] as const,
        color: FUR,
      })),
      ...[-1, 1].map((side) => ({
        geometry: new THREE.SphereGeometry(1, 6, 4),
        position: [side * 0.022, 0.095, 0.105] as const,
        scale: 0.006,
        color: DARK,
      })),
    ]),
    // A bushy plume, curled up over the back from its root at the rump.
    tail: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.035, -0.015], rotation: [0.35, 0, 0], scale: [0.028, 0.06, 0.028], color: TAIL },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.1, 0.005], rotation: [-0.5, 0, 0], scale: [0.032, 0.045, 0.04], color: TAIL },
    ]),
  };
}

/** Red squirrels coming down a tree, bounding over to the next and running up it, one to each pair of trees. */
export function Squirrels({ runs }: { runs: readonly (readonly [Tree, Tree])[] }) {
  const shapes = useMemo(squirrelShapes, []);
  const fur = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const animals = useRef<(THREE.Group | null)[]>([]);
  const torsos = useRef<(THREE.Group | null)[]>([]);
  const tails = useRef<(THREE.Group | null)[]>([]);
  // Reduced motion holds each squirrel where it is at one moment, with no bounding run or tail flick.
  const still = useReducedMotion();
  useEffect(
    () => () => {
      [shapes.body, shapes.tail, fur].forEach((thing) => thing.dispose());
    },
    [shapes, fur],
  );

  useFrame(({ clock }) => {
    const time = still ? STILL_TIME : clock.elapsedTime;
    runs.forEach((pair, k) => {
      const animal = animals.current[k];
      if (!animal) return;
      const pose = squirrelAt(k, pair, time);
      animal.visible = pose !== null;
      if (!pose) return;
      animal.position.set(pose.x, pose.y, pose.z);
      animal.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
      // Sitting up rocks the front up about the haunches.
      const torso = torsos.current[k];
      if (torso) torso.rotation.x = -pose.sit * 1.1;
      const tail = tails.current[k];
      if (tail) tail.rotation.x = pose.tail;
    });
  });

  return (
    <group name="squirrels">
      {runs.map((_, k) => (
        <group key={k} ref={(g) => void (animals.current[k] = g)} scale={SCALE} visible={false}>
          <group ref={(g) => void (torsos.current[k] = g)} position={[0, 0.03, -0.06]}>
            <mesh geometry={shapes.body} material={fur} position={[0, -0.03, 0.06]} />
          </group>
          <group ref={(g) => void (tails.current[k] = g)} position={[0, 0.05, -0.07]}>
            <mesh geometry={shapes.tail} material={fur} />
          </group>
        </group>
      ))}
    </group>
  );
}
