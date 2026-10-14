import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { onOwlHoot } from "../fx";
import { mergePainted, mergeParts } from "./mergeParts";
import { OWL_PERCH, OWL_TREE, hootBob, owlHead } from "./owlMotion";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const FEATHER = "#6b5a46";
const FACE = "#b9a687";
const EYE = "#ffe27a";
const BARK = "#4a4038";
const BEAK = "#3a3026";
/** Drawn large, so its shape and eyes read across the lake at night. */
const OWL_SCALE = 4.5;

/** The trunk, the perch branch and the stub bake into one shape. */
export function owlTreeShape() {
  return mergeParts([
    { geometry: new THREE.CylinderGeometry(0.1, 0.18, 3.4, 7), position: [0, 1.7, 0] },
    // The branch the owl sits on reaches out toward the water's right; another stub goes left.
    { geometry: new THREE.CylinderGeometry(0.035, 0.06, 0.75, 6), position: [0.25, OWL_PERCH.y - 0.12, 0], rotation: [0, 0, -1.25] },
    { geometry: new THREE.CylinderGeometry(0.03, 0.055, 0.8, 6), position: [-0.28, 2.4, 0.05], rotation: [0.2, 0, 0.9] },
  ]);
}

/** The owl's body, its head (face, ear tufts, beak) and its two eyes each bake into one shape; the eyes stay unlit so they show in the dark. */
export function owlShapes() {
  return {
    // A round body facing the lake (+z), the head sitting straight on it.
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.07, 0], scale: [0.06, 0.08, 0.055], color: FEATHER },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.065, 0.025], scale: [0.042, 0.06, 0.035], color: FACE },
    ]),
    head: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), scale: [0.055, 0.048, 0.05], color: FEATHER },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, -0.004, 0.03], scale: [0.045, 0.038, 0.025], color: FACE },
      ...[-1, 1].map((side) => ({
        geometry: new THREE.ConeGeometry(0.012, 0.03, 4),
        position: [side * 0.03, 0.045, 0] as const,
        rotation: [0, 0, side * -0.4] as const,
        color: FEATHER,
      })),
      { geometry: new THREE.ConeGeometry(0.006, 0.016, 4), position: [0, -0.016, 0.056], rotation: [Math.PI / 2 + 0.3, 0, 0], color: BEAK },
    ]),
    eyes: mergeParts([-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.018, 0.004, 0.052] as const, scale: 0.011 }))),
  };
}

/** A bare dead tree on the far bank: there all year, the owl's perch at night. */
export function OwlTree() {
  const shape = useMemo(owlTreeShape, []);
  const bark = useMemo(() => new THREE.MeshToonMaterial({ color: BARK, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      bark.dispose();
    },
    [shape, bark],
  );
  return <mesh geometry={shape} material={bark} position={[OWL_TREE.x, 0, OWL_TREE.z]} castShadow />;
}

/** The owl on its branch: turns its head now and then and bows with each hoot; motion lives in owlMotion.ts. */
export function Owl() {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const hootAt = useRef(Number.NEGATIVE_INFINITY);
  const clock = useRef(0);
  const still = useReducedMotion();
  const shapes = useMemo(owlShapes, []);
  const looks = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      // Eyes that catch what light there is, so the owl shows in the dark.
      eyes: new THREE.MeshBasicMaterial({ color: EYE, toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [shapes.body, shapes.head, shapes.eyes, looks.painted, looks.eyes].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );
  useEffect(() => onOwlHoot(() => (hootAt.current = clock.current)), []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    clock.current = time;
    if (head.current) head.current.rotation.y = owlHead(time, still);
    if (body.current) body.current.position.y = OWL_PERCH.y - (still ? 0 : hootBob(time - hootAt.current));
  });

  return (
    <group ref={body} name="owl" position={[OWL_PERCH.x, OWL_PERCH.y, OWL_PERCH.z]} scale={OWL_SCALE}>
      <mesh geometry={shapes.body} material={looks.painted} />
      <group ref={head} position={[0, 0.16, 0]}>
        <mesh geometry={shapes.head} material={looks.painted} />
        <mesh geometry={shapes.eyes} material={looks.eyes} />
      </group>
    </group>
  );
}
