import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { BEE_COUNT, beeAt, flowersIn, type Flower } from "./meadowFlowers";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const STEM = "#5f8f45";
const BLACK = "#1f1c18";
const AMBER = "#e8b62e";
const BUFF = "#f1e4c4";
const WING = "#e8eef2";
/** Bumblebees are drawn several times life size, so they read from the shack. */
const BEE_SCALE = 5;

/** Every flower's stem and head in one painted shape. */
export function flowersShape(flowers: readonly Flower[]) {
  return mergePainted(
    flowers.flatMap((flower) => [
      { geometry: new THREE.CylinderGeometry(0.006, 0.008, flower.height, 4), position: [flower.x, flower.height / 2, flower.z] as const, color: STEM },
      { geometry: new THREE.SphereGeometry(1, 8, 4), position: [flower.x, flower.height, flower.z] as const, scale: [0.04, 0.014, 0.04] as const, color: flower.color },
      { geometry: new THREE.SphereGeometry(0.011, 6, 4), position: [flower.x, flower.height + 0.009, flower.z] as const, color: AMBER },
    ]),
  );
}

/** A bumblebee facing +z: banded amber and black with a pale tail, and its wings apart so they can whirr. */
export function beeShapes() {
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, 0.004], scale: [0.007, 0.007, 0.006], color: AMBER },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, -0.004], scale: [0.0075, 0.0072, 0.006], color: BLACK },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, -0.01], scale: [0.0062, 0.006, 0.005], color: BUFF },
      { geometry: new THREE.SphereGeometry(0.0045, 8, 6), position: [0, 0, 0.011], color: BLACK },
    ]),
    wing: mergePainted([{ geometry: new THREE.BoxGeometry(0.012, 0.0008, 0.007), position: [0.006, 0, 0], color: WING }]),
  };
}

type BeeParts = { root: THREE.Group | null; wings: (THREE.Group | null)[] };

/** The season's wildflowers round the shack, and bumblebees working them while `bees`. */
export function Wildflowers({ season, bees }: { season: LakeSeason; bees: boolean }) {
  const still = useReducedMotion();
  const flowers = useMemo(() => flowersIn(season), [season]);
  const shape = useMemo(() => (flowers.length > 0 ? flowersShape(flowers) : null), [flowers]);
  const bee = useMemo(beeShapes, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const parts = useMemo<BeeParts[]>(() => Array.from({ length: BEE_COUNT }, () => ({ root: null, wings: [null, null] })), []);
  useEffect(() => () => shape?.dispose(), [shape]);
  useEffect(
    () => () => {
      [bee.body, bee.wing, material].forEach((item) => item.dispose());
    },
    [bee, material],
  );
  useFrame(({ clock }) => {
    if (!bees) return;
    const time = still ? 0.5 : clock.elapsedTime;
    parts.forEach((part, i) => {
      const pose = beeAt(i, time, flowers);
      if (!part.root) return;
      part.root.visible = pose !== null;
      if (!pose) return;
      part.root.position.set(pose.x, pose.y, pose.z);
      part.root.rotation.y = pose.yaw;
      // A blur of wings in flight; on a flower they twitch now and then.
      const beat = pose.flying ? Math.sin(time * 90 + i) * 0.7 : Math.max(0, Math.sin(time * 3 + i)) * 0.3;
      part.wings.forEach((wing, side) => {
        if (wing) wing.rotation.set(0, side === 0 ? -0.3 : Math.PI + 0.3, beat * (side === 0 ? 1 : -1));
      });
    });
  });
  return (
    <group name="wildflowers">
      {shape && <mesh geometry={shape} material={material} />}
      {bees &&
        parts.map((part, i) => (
          <group
            key={i}
            ref={(node) => {
              part.root = node;
            }}
            scale={BEE_SCALE}
          >
            <mesh geometry={bee.body} material={material} />
            {[0, 1].map((side) => (
              <group
                key={side}
                ref={(node) => {
                  part.wings[side] = node;
                }}
                position={[side === 0 ? 0.003 : -0.003, 0.006, 0.002]}
              >
                <mesh geometry={bee.wing} material={material} />
              </group>
            ))}
          </group>
        ))}
    </group>
  );
}
