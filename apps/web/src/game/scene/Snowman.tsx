import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { SNOWBALLS, SNOWMAN_AT, SNOWMAN_YAW } from "./snowmanLook";
import { toonRamp } from "./toon";

const SNOW = "#f3f6f8";
const COAL = "#1e1e22";
const CARROT = "#e07a2a";
const STICK = "#5a3e2a";
const SCARF = "#b8322a";

/** The whole snowman bakes into one painted shape, facing +z. */
export function snowmanShape() {
  const middle = SNOWBALLS[1]!;
  const head = SNOWBALLS[2]!;
  const neck = (middle.y + middle.r + head.y - head.r) / 2;
  return mergePainted([
    ...SNOWBALLS.map((ball) => ({ geometry: new THREE.IcosahedronGeometry(ball.r, 2), position: [0, ball.y, 0] as const, color: SNOW })),
    // Two coal eyes and a carrot nose.
    ...[-1, 1].map((side) => ({
      geometry: new THREE.SphereGeometry(0.025, 6, 4),
      position: [side * 0.065, head.y + 0.05, head.r * 0.9] as const,
      color: COAL,
    })),
    { geometry: new THREE.ConeGeometry(0.03, 0.16, 6), position: [0, head.y, head.r + 0.06], rotation: [Math.PI / 2, 0, 0], color: CARROT },
    // Coal buttons down the front of the middle.
    ...[0.1, 0, -0.1].map((dy) => ({
      geometry: new THREE.SphereGeometry(0.028, 6, 4),
      position: [0, middle.y + dy, Math.sqrt(middle.r * middle.r - dy * dy) - 0.005] as const,
      color: COAL,
    })),
    // Stick arms out of the middle's sides, each with a twig.
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.CylinderGeometry(0.012, 0.018, 0.5, 5), position: [side * (middle.r + 0.18), middle.y + 0.1, 0] as const, rotation: [0, 0, side * -1.1] as const, color: STICK },
      { geometry: new THREE.CylinderGeometry(0.007, 0.01, 0.14, 4), position: [side * (middle.r + 0.33), middle.y + 0.24, 0.02] as const, rotation: [0, 0, side * 0.3] as const, color: STICK },
    ]),
    // A red scarf round the neck, one end hanging down the front.
    { geometry: new THREE.TorusGeometry(head.r * 0.95, 0.04, 6, 14), position: [0, neck, 0], rotation: [Math.PI / 2, 0, 0], color: SCARF },
    { geometry: new THREE.BoxGeometry(0.08, 0.22, 0.03), position: [0.08, neck - 0.11, middle.r * 0.75], rotation: [-0.25, 0, 0.1], color: SCARF },
  ]);
}

/** A snowman someone built by the shack, standing there all winter. */
export function Snowman() {
  const shape = useMemo(snowmanShape, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
    },
    [shape, material],
  );
  return <mesh name="snowman" geometry={shape} material={material} position={[SNOWMAN_AT.x, 0, SNOWMAN_AT.z]} rotation={[0, SNOWMAN_YAW, 0]} castShadow />;
}
