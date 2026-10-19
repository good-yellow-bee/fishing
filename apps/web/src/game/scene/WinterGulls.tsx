import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOE_TOP, GULL_COUNT, gullAt, gullFloes } from "./gullFloes";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const WHITE = "#f4f5f2";
const MANTLE = "#a9b2b8";
const TIP = "#1e2022";
const RED = "#c23a2c";
const EAR = "#3a3c40";
/** Drawn larger than life so they read across the lake. */
const SCALE = 3;

/** Standing, wings folded: the white body, grey back, black wingtips crossed over the tail, red bill and legs, facing +z. */
export function gullBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 8), position: [0, 0.075, 0], scale: [0.045, 0.042, 0.09], color: WHITE },
    { geometry: new THREE.SphereGeometry(1, 10, 6), position: [0, 0.092, -0.01], scale: [0.047, 0.026, 0.085], color: MANTLE },
    { geometry: new THREE.ConeGeometry(0.018, 0.06, 4), position: [0, 0.09, -0.1], rotation: [-Math.PI / 2 + 0.2, 0, 0], color: TIP },
    { geometry: new THREE.SphereGeometry(0.03, 10, 8), position: [0, 0.122, 0.07], color: WHITE },
    { geometry: new THREE.SphereGeometry(0.008, 5, 4), position: [0.024, 0.124, 0.066], color: EAR },
    { geometry: new THREE.SphereGeometry(0.008, 5, 4), position: [-0.024, 0.124, 0.066], color: EAR },
    { geometry: new THREE.ConeGeometry(0.007, 0.035, 5), position: [0, 0.116, 0.112], rotation: [Math.PI / 2, 0, 0], color: RED },
    ...[-0.015, 0.015].map((x) => ({ geometry: new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4), position: [x, 0.02, 0.005] as const, color: RED })),
  ]);
}

/** One spread wing, grey with a black tip, reaching out along +x from the shoulder. */
export function gullWingShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.13, 0.008, 0.06), position: [0.065, 0, 0], color: MANTLE },
    { geometry: new THREE.BoxGeometry(0.06, 0.007, 0.04), position: [0.155, 0, -0.008], color: TIP },
  ]);
}

/** Black-headed gulls standing on the winter ice floes, now and then wheeling out over the water (gullFloes.ts). */
export function WinterGulls({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const floes = useMemo(() => gullFloes(), []);
  const gulls = useRef<(THREE.Group | null)[]>([]);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(() => ({ body: gullBodyShape(), wing: gullWingShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    floes.forEach((floe, i) => {
      const pose = gullAt(i, floe, wind, time, still);
      const gull = gulls.current[i];
      if (gull) {
        // Standing, it rides the floe on the swell; in the air the swell no longer carries it.
        const water = waterHeight(pose.x, pose.z, still ? 0 : time);
        gull.position.set(pose.x, water + FLOE_TOP + pose.y, pose.z);
        gull.rotation.set(pose.flying * 0.15, pose.yaw, 0);
      }
      const pair = wings.current[i];
      if (pair) {
        pair.visible = pose.flying > 0;
        const beat = 0.15 + Math.sin(time * 9 + i) * 0.55 * pose.flying;
        pair.children[0]?.rotation.set(0, 0, beat);
        pair.children[1]?.rotation.set(0, Math.PI, beat);
      }
    });
  });
  return (
    <group name="winter-gulls">
      {Array.from({ length: GULL_COUNT }, (_, i) => (
        <group key={i} ref={(g) => void (gulls.current[i] = g)}>
          <group scale={SCALE}>
            <mesh geometry={shapes.body} material={material} castShadow />
            <group ref={(g) => void (wings.current[i] = g)} position={[0, 0.095, 0]} visible={false}>
              <group position={[0.035, 0, 0]}>
                <mesh geometry={shapes.wing} material={material} />
              </group>
              <group position={[-0.035, 0, 0]}>
                <mesh geometry={shapes.wing} material={material} />
              </group>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}
