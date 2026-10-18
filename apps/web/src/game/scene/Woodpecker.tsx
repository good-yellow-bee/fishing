import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { woodpeckerAt } from "./woodpeckerDrum";

const BLACK = "#1b1b1e";
const WHITE = "#f1efe9";
const RED = "#c42a2a";
const BUFF = "#d9cdb8";
/** Drawn large, like the owl, so it reads on the far bank. */
const SCALE = 4.5;

/**
 * Body and tail in one shape, head and bill in another hinged at the neck so it can hammer, and the
 * wings for the swoop. It faces +z, belly to the bark.
 */
export function woodpeckerShapes() {
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, -0.03], rotation: [-0.2, 0, 0], scale: [0.028, 0.058, 0.03], color: BLACK },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.005, -0.012], rotation: [-0.2, 0, 0], scale: [0.022, 0.048, 0.02], color: BUFF },
      // The big white shoulder patches, and the red under the tail.
      ...[-1, 1].map((side) => ({
        geometry: new THREE.SphereGeometry(1, 6, 5),
        position: [side * 0.024, 0.012, -0.042] as const,
        scale: [0.008, 0.022, 0.014] as const,
        color: WHITE,
      })),
      { geometry: new THREE.SphereGeometry(1, 6, 5), position: [0, -0.045, -0.018], scale: [0.016, 0.014, 0.014], color: RED },
      // A stiff tail braced against the bark.
      { geometry: new THREE.BoxGeometry(0.03, 0.06, 0.008), position: [0, -0.075, -0.012], rotation: [0.35, 0, 0], color: BLACK },
    ]),
    head: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.018, 0], scale: 0.022, color: BLACK },
      ...[-1, 1].map((side) => ({
        geometry: new THREE.SphereGeometry(1, 6, 5),
        position: [side * 0.016, 0.014, 0.004] as const,
        scale: [0.008, 0.011, 0.013] as const,
        color: WHITE,
      })),
      { geometry: new THREE.SphereGeometry(1, 6, 5), position: [0, 0.026, -0.016], scale: [0.012, 0.01, 0.01], color: RED },
      { geometry: new THREE.ConeGeometry(0.006, 0.034, 5), position: [0, 0.016, 0.034], rotation: [Math.PI / 2, 0, 0], color: "#3a3430" },
    ]),
    wing: new THREE.BoxGeometry(0.07, 0.004, 0.035),
  };
}

/** The woodpecker drumming on the owl's dead tree; motion lives in woodpeckerDrum.ts. */
export function Woodpecker() {
  const still = useReducedMotion();
  const bird = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(woodpeckerShapes, []);
  const looks = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      wing: new THREE.MeshToonMaterial({ color: BLACK, gradientMap: toonRamp() }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(looks)].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );

  useFrame(({ clock }) => {
    const pose = woodpeckerAt(clock.elapsedTime, still);
    bird.current?.position.set(pose.x, pose.y, pose.z);
    // The head swings in at the bark with each blow.
    if (head.current) head.current.rotation.x = pose.peck * 0.5;
    wings.current.forEach((wing, side) => {
      if (!wing) return;
      wing.visible = pose.flap > 0;
      wing.rotation.z = (side === 0 ? 1 : -1) * (0.3 + pose.flap * 1.1);
    });
  });

  return (
    // Facing west into the trunk, so the dock sees it side-on.
    <group ref={bird} name="woodpecker" rotation={[0, -Math.PI / 2, 0]} scale={SCALE}>
      <mesh geometry={shapes.body} material={looks.painted} />
      <group ref={head} position={[0, 0.05, -0.022]}>
        <mesh geometry={shapes.head} material={looks.painted} />
      </group>
      {[1, -1].map((side, i) => (
        <group key={side} ref={(g) => void (wings.current[i] = g)} position={[side * 0.026, 0.02, -0.04]} visible={false}>
          <mesh geometry={shapes.wing} material={looks.wing} position={[side * 0.035, 0, 0]} />
        </group>
      ))}
    </group>
  );
}
