import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { anglerAshore } from "./bankAngler";
import { hedgehogAt, hedgehogStart, hedgehogStep, type HedgehogState } from "./hedgehogWalk";
import { mergePainted } from "./mergeParts";
import { anglerPose } from "./pose";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { toonRamp } from "./toon";
import type { ScenePhase } from "./types";

const SPINES = "#5e4a36";
const TIPS = "#d8ccb4";
const FACE = "#b8946a";
const DARK = "#191512";
/** Drawn larger than life, so it reads at the angler's feet. */
const SCALE = 2;

/** The spiny back: a dome of brown with pale-tipped spines raked back, facing +z. */
export function hedgehogBackShape() {
  const spines = [];
  for (let row = 0; row < 4; row += 1) {
    for (let k = 0; k < 7; k += 1) {
      const a = ((k + (row % 2) * 0.5) / 7) * Math.PI - Math.PI / 2;
      const z = 0.05 - row * 0.035;
      spines.push({
        geometry: new THREE.ConeGeometry(0.008, 0.035, 4),
        position: [Math.sin(a) * 0.055, 0.05 + Math.cos(a) * 0.035, z] as const,
        rotation: [-1.1, 0, -a * 0.8] as const,
        color: k % 2 ? TIPS : SPINES,
      });
    }
  }
  return mergePainted([{ geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.04, 0], scale: [0.065, 0.05, 0.085], color: SPINES }, ...spines]);
}

/** The pointed pale face with its black nose and eyes, and the four little feet, from the front of the body. */
export function hedgehogFaceShape() {
  return mergePainted([
    { geometry: new THREE.ConeGeometry(0.03, 0.07, 8), position: [0, 0.03, 0.085], rotation: [Math.PI / 2, 0, 0], color: FACE },
    { geometry: new THREE.SphereGeometry(0.008, 6, 4), position: [0, 0.03, 0.122], color: DARK },
    ...[-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(0.005, 5, 4), position: [side * 0.018, 0.045, 0.085] as const, color: DARK })),
    ...[
      [0.035, 0.05],
      [-0.035, 0.05],
      [0.035, -0.04],
      [-0.035, -0.04],
    ].map(([x, z]) => ({ geometry: new THREE.SphereGeometry(1, 5, 4), position: [x, 0.008, z] as const, scale: [0.01, 0.01, 0.014] as const, color: FACE })),
  ]);
}

/** A hedgehog snuffling past behind the angler on the bank on dry evenings and nights, curling up at any fuss (hedgehogWalk.ts). */
export function BankHedgehog({ phase }: { phase: ScenePhase }) {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const face = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ back: hedgehogBackShape(), face: hedgehogFaceShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.back, shapes.face, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const state = useRef<HedgehogState | null>(null);
  const scaled = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    // A strike, a fish on, or the angler walking past: something to curl up at.
    const fuss = phase === "hookset" || phase === "fight" || anglerPose.moving;
    state.current = hedgehogStep(state.current ?? hedgehogStart(time), time, Math.min(delta, 0.1), anglerPose, anglerAshore(), fuss);
    const pose = hedgehogAt(state.current, time, still);
    const animal = root.current;
    if (!animal) return;
    animal.visible = pose.here;
    if (!pose.here) return;
    animal.position.set(pose.x, pose.y, pose.z);
    animal.rotation.y = pose.yaw;
    // It grows into view at the ends of its way, and bobs on its short legs as it trots.
    if (scaled.current) {
      scaled.current.scale.setScalar(SCALE * pose.show);
      scaled.current.position.y = pose.trot * 0.004 * SCALE * Math.abs(Math.sin(pose.stride * 14));
    }
    // Curled up, the back closes into a ball over its tucked-in face.
    if (back.current) back.current.scale.set(1 + pose.curl * 0.1, 1 + pose.curl * 0.45, 1 - pose.curl * 0.25);
    if (face.current) {
      face.current.visible = pose.curl < 0.5;
      face.current.rotation.x = still ? 0 : pose.sniff * 0.25 * Math.sin(time * 18);
    }
  });
  useSkinnedFigure(root, material);
  return (
    <group ref={root} name="bank-hedgehog" visible={false}>
      <group ref={scaled} scale={SCALE}>
        <group ref={back}>
          <mesh geometry={shapes.back} material={material} castShadow />
        </group>
        <group ref={face}>
          <mesh geometry={shapes.face} material={material} />
        </group>
      </group>
    </group>
  );
}
