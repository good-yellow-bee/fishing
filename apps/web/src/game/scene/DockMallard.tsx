import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mallardAt } from "./mallardWaddle";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { toonRamp } from "./toon";

const GREY = "#a9a49a";
const BREAST = "#7a3e2a";
const GREEN = "#1f5a3a";
const COLLAR = "#efece4";
const TAIL = "#22201c";
/** The lake ducks' bill colour (duckShapes.ts). */
const BILL = "#d8a13c";
const FOOT = "#e08a2c";
const SPECULUM = "#3b4fa8";
const EYE = "#111";
/** About life size, a little larger so it reads behind the angler. */
const MALLARD_SCALE = 1.15;

/** The grey body, chestnut breast and black curled tail, facing +z, standing on its legs at y = 0. */
export function mallardBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.13, 0], scale: [0.09, 0.075, 0.15], color: GREY },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.14, 0.09], scale: [0.075, 0.07, 0.07], color: BREAST },
    { geometry: new THREE.ConeGeometry(0.04, 0.09, 6), position: [0, 0.16, -0.16], rotation: [-Math.PI / 2 + 0.6, 0, 0], color: TAIL },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.CylinderGeometry(0.008, 0.008, 0.07, 5), position: [side * 0.035, 0.035, 0] as const, color: FOOT },
      { geometry: new THREE.BoxGeometry(0.04, 0.006, 0.05), position: [side * 0.035, 0.003, 0.02] as const, color: FOOT },
    ]),
  ]);
}

/** The green head on its neck, with its white collar, eye and yellow bill, from the neck forward. */
export function mallardHeadShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.028, 0.034, 0.012, 10), position: [0, 0, 0], color: COLLAR },
    { geometry: new THREE.CylinderGeometry(0.025, 0.03, 0.06, 8), position: [0, 0.035, 0.005], color: GREEN },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.08, 0.015], scale: [0.038, 0.036, 0.048], color: GREEN },
    { geometry: new THREE.BoxGeometry(0.03, 0.012, 0.055), position: [0, 0.072, 0.08], rotation: [0.15, 0, 0], color: BILL },
    ...[-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(0.006, 5, 4), position: [side * 0.032, 0.09, 0.03] as const, color: EYE })),
  ]);
}

/** One wing folded flat along its flank on `side` (+1 right, -1 left), hinged at the shoulder; it swings out and up to flap, its blue patch showing. */
export function mallardWingShape(side: number) {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.012, -0.03, -0.03], scale: [0.014, 0.045, 0.1], color: GREY },
    { geometry: new THREE.BoxGeometry(0.006, 0.02, 0.035), position: [side * 0.026, -0.035, -0.05], color: SPECULUM },
  ]);
}

/** A mallard drake that now and then swims in and flaps up onto the dock on rainy days, preens, shakes, and goes back the way it came (mallardWaddle.ts). */
export function DockMallard() {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(() => ({ body: mallardBodyShape(), head: mallardHeadShape(), right: mallardWingShape(1), left: mallardWingShape(-1) }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const outAt = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    outAt.current ??= time;
    const pose = mallardAt(time - outAt.current, still);
    const duck = root.current;
    if (!duck) return;
    duck.visible = pose.here;
    if (!pose.here) return;
    duck.position.set(pose.x, pose.y, pose.z);
    duck.rotation.set(0, pose.yaw, 0);
    // It rocks from foot to foot as it waddles, and ruffles about its length as it shakes.
    if (body.current) body.current.rotation.set(0, 0, pose.waddle * 0.12 + pose.shake * 0.25, "YXZ");
    if (head.current) {
      // Preening, its head swings round over its shoulder and down into its back.
      head.current.rotation.set(pose.preen * 0.9 + pose.shake * 0.2, pose.preen * 2.6, 0, "YXZ");
    }
    // Each wing swings out from its flank and up about the shoulder.
    const lift = pose.flap * (1.2 + 0.6 * Math.sin(time * 26));
    wings.current.forEach((wing, i) => wing?.rotation.set(0, 0, (i === 0 ? 1 : -1) * lift));
  });
  useSkinnedFigure(root, material);

  return (
    <group ref={root} name="dock-mallard" visible={false}>
      <group scale={MALLARD_SCALE}>
        <group ref={body}>
          <mesh geometry={shapes.body} material={material} castShadow />
          <group ref={head} position={[0, 0.19, 0.12]}>
            <mesh geometry={shapes.head} material={material} />
          </group>
          {[1, -1].map((side, i) => (
            <group
              key={side}
              ref={(wing) => {
                wings.current[i] = wing;
              }}
              position={[side * 0.08, 0.17, 0]}
            >
              <mesh geometry={side > 0 ? shapes.right : shapes.left} material={material} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
