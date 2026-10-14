import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { onOwlHoot } from "../fx";
import { OWL_PERCH, OWL_TREE, hootBob, owlHead } from "./owlMotion";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const FEATHER = "#6b5a46";
const FACE = "#b9a687";
const EYE = "#ffe27a";
const BARK = "#4a4038";
/** Drawn large, so its shape and eyes read across the lake at night. */
const OWL_SCALE = 4.5;

/** A bare dead tree on the far bank: there all year, the owl's perch at night. */
export function OwlTree() {
  return (
    <group position={[OWL_TREE.x, 0, OWL_TREE.z]}>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.18, 3.4, 7]} />
        <meshToonMaterial color={BARK} gradientMap={toonRamp()} />
      </mesh>
      {/* The branch the owl sits on reaches out toward the water's right; another stub goes left. */}
      <mesh position={[0.25, OWL_PERCH.y - 0.12, 0]} rotation={[0, 0, -1.25]}>
        <cylinderGeometry args={[0.035, 0.06, 0.75, 6]} />
        <meshToonMaterial color={BARK} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[-0.28, 2.4, 0.05]} rotation={[0.2, 0, 0.9]}>
        <cylinderGeometry args={[0.03, 0.055, 0.8, 6]} />
        <meshToonMaterial color={BARK} gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}

/** The owl on its branch: turns its head now and then and bows with each hoot; motion lives in owlMotion.ts. */
export function Owl() {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const hootAt = useRef(Number.NEGATIVE_INFINITY);
  const clock = useRef(0);
  const still = useReducedMotion();
  useEffect(() => onOwlHoot(() => (hootAt.current = clock.current)), []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    clock.current = time;
    if (head.current) head.current.rotation.y = owlHead(time, still);
    if (body.current) body.current.position.y = OWL_PERCH.y - (still ? 0 : hootBob(time - hootAt.current));
  });

  return (
    <group ref={body} position={[OWL_PERCH.x, OWL_PERCH.y, OWL_PERCH.z]} scale={OWL_SCALE}>
      {/* A round body facing the lake (+z), the head sitting straight on it. */}
      <mesh position={[0, 0.07, 0]} scale={[0.06, 0.08, 0.055]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshToonMaterial color={FEATHER} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[0, 0.065, 0.025]} scale={[0.042, 0.06, 0.035]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshToonMaterial color={FACE} gradientMap={toonRamp()} />
      </mesh>
      <group ref={head} position={[0, 0.16, 0]}>
        <mesh scale={[0.055, 0.048, 0.05]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={FEATHER} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, -0.004, 0.03]} scale={[0.045, 0.038, 0.025]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={FACE} gradientMap={toonRamp()} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            {/* Eyes that catch what light there is, so the owl shows in the dark. */}
            <mesh position={[side * 0.018, 0.004, 0.052]} scale={0.011}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color={EYE} toneMapped={false} />
            </mesh>
            <mesh position={[side * 0.03, 0.045, 0]} rotation={[0, 0, side * -0.4]}>
              <coneGeometry args={[0.012, 0.03, 4]} />
              <meshToonMaterial color={FEATHER} gradientMap={toonRamp()} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.016, 0.056]} rotation={[Math.PI / 2 + 0.3, 0, 0]}>
          <coneGeometry args={[0.006, 0.016, 4]} />
          <meshBasicMaterial color="#3a3026" />
        </mesh>
      </group>
    </group>
  );
}
