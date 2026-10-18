import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COOT_COUNT, cootAt } from "./cootSquabble";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const BODY = "#2a2c30";
const HEAD = "#141518";
const SHIELD = "#f4f1ea";
const WING = "#3a3d44";
const SPRAY = "#e8f2f4";
/** Drawn larger than life so they read from the dock across the lake. */
const SCALE = 1.9;
/** Spray drops kicked up behind each pattering coot. */
const DROPS = 5;

/** The body afloat, its rump up, facing +z. */
export function cootBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 8), position: [0, 0.05, 0], scale: [0.09, 0.07, 0.14], color: BODY },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.08, -0.11], rotation: [0.5, 0, 0], scale: [0.06, 0.04, 0.06], color: BODY },
  ]);
}

/** The neck, head and the white bill and shield, from the base of the neck. */
export function cootHeadShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.028, 0.038, 0.08, 6), position: [0, 0.035, 0], rotation: [0.3, 0, 0], color: HEAD },
    { geometry: new THREE.SphereGeometry(0.038, 8, 6), position: [0, 0.085, 0.02], color: HEAD },
    { geometry: new THREE.ConeGeometry(0.021, 0.055, 6), position: [0, 0.08, 0.078], rotation: [Math.PI / 2, 0, 0], color: SHIELD },
    { geometry: new THREE.BoxGeometry(0.03, 0.045, 0.012), position: [0, 0.105, 0.052], color: SHIELD },
  ]);
}

/** A coot pair by the lily bed at the lake's west end, squabbling in spring (cootSquabble.ts). */
export function Coots({ squabbling }: { squabbling: boolean }) {
  const still = useReducedMotion();
  const coots = useRef<(THREE.Group | null)[]>([]);
  const heads = useRef<(THREE.Group | null)[]>([]);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const drops = useRef<(THREE.InstancedMesh | null)[]>([]);
  const shapes = useMemo(
    () => ({ body: cootBodyShape(), head: cootHeadShape(), wing: new THREE.SphereGeometry(1, 8, 6), drop: new THREE.SphereGeometry(0.018, 5, 4) }),
    [],
  );
  const materials = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      wing: new THREE.MeshToonMaterial({ color: WING, gradientMap: toonRamp() }),
      spray: new THREE.MeshBasicMaterial({ color: SPRAY, transparent: true, opacity: 0.85 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, materials],
  );
  const at = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    for (let i = 0; i < COOT_COUNT; i++) {
      const pose = cootAt(i, time, squabbling, still);
      const coot = coots.current[i];
      if (coot) {
        coot.position.set(pose.x, -pose.under * 0.3 + pose.patter * 0.05, pose.z);
        coot.rotation.set(-pose.patter * 0.35 + pose.under * 0.6, pose.yaw, 0);
        coot.visible = pose.under < 0.95;
      }
      const head = heads.current[i];
      if (head) head.position.z = 0.1 + pose.nod * 0.015;
      const wing = wings.current[i];
      if (wing) {
        wing.visible = pose.patter > 0.02;
        const flap = pose.patter * (0.9 + 0.5 * Math.sin(time * 30));
        wing.children[0]?.rotation.set(0, 0, flap);
        wing.children[1]?.rotation.set(0, 0, -flap);
      }
      const spray = drops.current[i];
      if (spray) {
        spray.visible = pose.patter > 0.02;
        for (let k = 0; k < DROPS; k++) {
          // Each drop flicks up and back from the pattering feet and falls again.
          const life = (time * 3.2 + k / DROPS) % 1;
          const side = (k % 2 ? 1 : -1) * (0.03 + 0.02 * k);
          at.makeTranslation(side, pose.patter * (0.12 * Math.sin(Math.PI * life)), -0.1 - life * 0.25);
          spray.setMatrixAt(k, at);
        }
        spray.instanceMatrix.needsUpdate = true;
      }
    }
  });
  return (
    <group name="coots">
      {Array.from({ length: COOT_COUNT }, (_, i) => (
        <group key={i} ref={(g) => void (coots.current[i] = g)}>
          <group scale={SCALE}>
            <mesh geometry={shapes.body} material={materials.painted} castShadow />
            <group ref={(g) => void (heads.current[i] = g)} position={[0, 0.08, 0.1]}>
              <mesh geometry={shapes.head} material={materials.painted} />
            </group>
            <group ref={(g) => void (wings.current[i] = g)} position={[0, 0.09, 0]} visible={false}>
              {[1, -1].map((side) => (
                <group key={side} position={[side * 0.07, 0, 0]}>
                  <mesh geometry={shapes.wing} material={materials.wing} position={[side * 0.08, 0, -0.02]} scale={[0.09, 0.012, 0.06]} />
                </group>
              ))}
            </group>
            <instancedMesh ref={(m) => void (drops.current[i] = m)} args={[shapes.drop, materials.spray, DROPS]} visible={false} />
          </group>
        </group>
      ))}
    </group>
  );
}
