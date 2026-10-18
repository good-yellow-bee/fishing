import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { LINE_FROM, LINE_TO, LINE_Y, WASHING, garmentSwing, linePoint, type Garment } from "./washingLine";

const WOOD = "#7a5638";
const ROPE = "#d8d0bc";
const PEG = "#c9a978";
const THIN = 0.012;

/** The two T-posts the line is tied between. */
export function postsShape() {
  const posts = [LINE_FROM, LINE_TO];
  return mergePainted(
    posts.flatMap((post) => [
      { geometry: new THREE.CylinderGeometry(0.04, 0.05, LINE_Y + 0.12, 6), position: [post.x, (LINE_Y + 0.12) / 2, post.z] as const, color: WOOD },
      { geometry: new THREE.BoxGeometry(0.05, 0.05, 0.36), position: [post.x, LINE_Y + 0.02, post.z] as const, color: WOOD },
    ]),
  );
}

/** The rope, sagging between the posts. */
export function ropeShape() {
  const points = Array.from({ length: 9 }, (_, k) => {
    const p = linePoint(k / 8);
    return new THREE.Vector3(p.x, p.y, p.z);
  });
  return mergePainted([{ geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.008, 4), color: ROPE }]);
}

/** One garment, hung from its top edge at the origin and hanging down -y, face toward z, with its pegs. */
export function garmentShape({ kind, color, width: w, height: h }: Garment) {
  const pegs = (kind === "sock" ? [0] : [-w / 2 + 0.05, w / 2 - 0.05]).map((x) => ({
    geometry: new THREE.BoxGeometry(0.02, 0.07, 0.03),
    position: [x, 0, 0] as const,
    color: PEG,
  }));
  const parts =
    kind === "shirt"
      ? [
          { geometry: new THREE.BoxGeometry(w * 0.62, h, THIN), position: [0, -h / 2, 0] as const, color },
          ...[-1, 1].map((side) => ({
            geometry: new THREE.BoxGeometry(w * 0.26, h * 0.42, THIN),
            position: [side * w * 0.38, -h * 0.22, 0] as const,
            rotation: [0, 0, side * 0.5] as const,
            color,
          })),
          { geometry: new THREE.BoxGeometry(w * 0.2, 0.04, THIN * 1.5), position: [0, -0.02, 0] as const, color: "#f2efe6" },
        ]
      : kind === "sock"
        ? [
            { geometry: new THREE.BoxGeometry(w, h, THIN * 2), position: [0, -h / 2, 0] as const, color },
            { geometry: new THREE.BoxGeometry(w, w * 1.3, THIN * 2), position: [w * 0.45, -h + w * 0.4, 0] as const, color },
          ]
        : [
            { geometry: new THREE.BoxGeometry(w, h, THIN), position: [0, -h / 2, 0] as const, color },
            // A stripe across the towel's hem.
            { geometry: new THREE.BoxGeometry(w, 0.04, THIN * 1.4), position: [0, -h * 0.85, 0] as const, color: "#d26a3c" },
          ];
  return mergePainted([...parts, ...pegs]);
}

/** A washing line by the shack, with the washing pegged out on it and blowing on the wind when it is out (`washing`). */
export function Clothesline({ washing, wind }: { washing: boolean; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const shapes = useMemo(() => ({ posts: postsShape(), rope: ropeShape(), garments: WASHING.map(garmentShape) }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const hangers = useMemo<(THREE.Group | null)[]>(() => WASHING.map(() => null), []);
  useEffect(
    () => () => {
      [shapes.posts, shapes.rope, ...shapes.garments, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    if (!washing) return;
    hangers.forEach((hanger, i) => {
      if (hanger) hanger.rotation.x = garmentSwing(i, clock.elapsedTime, wind, still);
    });
  });
  return (
    <group name="clothesline">
      <mesh geometry={shapes.posts} material={material} castShadow />
      <mesh geometry={shapes.rope} material={material} />
      {washing &&
        WASHING.map((garment, i) => {
          const at = linePoint(garment.at);
          return (
            <group
              key={i}
              ref={(node) => {
                hangers[i] = node;
              }}
              position={[at.x, at.y, at.z]}
            >
              <mesh geometry={shapes.garments[i]} material={material} castShadow />
            </group>
          );
        })}
    </group>
  );
}
