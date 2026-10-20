import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeParts, mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { perchedAfter, rodDragonflyAt } from "./dragonflyPerch";
import { toonRamp } from "./toon";
import type { ScenePhase } from "./types";

const THORAX = "#4f7a3c";
const ABDOMEN = "#4a8fc4";
const TAIL_TIP = "#1d2a33";
const EYES = "#2f4a3a";

/** The eyes, thorax and long blue abdomen, facing +z, in one shape. */
export function rodDragonflyBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.006, 0.066], scale: [0.012, 0.009, 0.01], color: EYES },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.005, 0.045], scale: [0.009, 0.009, 0.016], color: THORAX },
    { geometry: new THREE.CapsuleGeometry(0.006, 0.075, 3, 6), position: [0, 0.004, -0.015], rotation: [Math.PI / 2, 0, 0], color: ABDOMEN },
    { geometry: new THREE.CapsuleGeometry(0.004, 0.012, 2, 5), position: [0, 0.004, -0.06], rotation: [Math.PI / 2, 0, 0], color: TAIL_TIP },
  ]);
}

/** Its two pairs of wings, spread flat out to the sides over the thorax, in one shape. */
export function rodDragonflyWingShape() {
  return mergeParts([
    { geometry: new THREE.PlaneGeometry(0.15, 0.024).rotateX(-Math.PI / 2), position: [0, 0.012, 0.052] },
    { geometry: new THREE.PlaneGeometry(0.135, 0.026).rotateX(-Math.PI / 2), position: [0, 0.012, 0.03] },
  ]);
}

type Props = { rodTip: THREE.Vector3; phase: ScenePhase; nibble: boolean };

/** A dragonfly that settles on the rod tip when the line sits quiet on a summer day, and flies off on a nibble or the strike (dragonflyPerch.ts). */
export function RodDragonfly({ rodTip, phase, nibble }: Props) {
  const still = useReducedMotion();
  const fly = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ body: rodDragonflyBodyShape(), wing: rodDragonflyWingShape() }), []);
  const bodyMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const wingMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#eef6f7", transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }),
    [],
  );
  const wings = useRef<THREE.Mesh>(null);
  useEffect(
    () => () => {
      [shapes.body, shapes.wing, bodyMaterial, wingMaterial].forEach((item) => item.dispose());
    },
    [shapes, bodyMaterial, wingMaterial],
  );
  // When the line went quiet, and when it was disturbed and how long the fly had sat by then.
  const clock = useRef<{ quietAt: number | null; disturbedAt: number | null; perchedFor: number }>({ quietAt: null, disturbedAt: null, perchedFor: 0 });

  useFrame((state) => {
    const group = fly.current;
    if (!group) return;
    const time = state.clock.elapsedTime;
    const track = clock.current;
    const quiet = phase === "waiting" && !nibble;
    if (quiet && track.quietAt === null) track.quietAt = time;
    if (!quiet && track.quietAt !== null) {
      track.perchedFor = perchedAfter(time - track.quietAt);
      track.disturbedAt = time;
      track.quietAt = null;
    }
    const pose =
      track.quietAt !== null
        ? rodDragonflyAt(time - track.quietAt, null, 0, still)
        : rodDragonflyAt(0, track.disturbedAt === null ? Infinity : time - track.disturbedAt, track.perchedFor, still);
    group.visible = pose.here;
    if (!pose.here) return;
    group.position.set(rodTip.x + pose.x, rodTip.y + pose.y, rodTip.z + pose.z);
    group.rotation.y = pose.yaw + pose.look;
    // A blur of wings in flight, clear and still at rest.
    wingMaterial.opacity = pose.buzz ? 0.16 + (Math.sin(time * 70) * 0.5 + 0.5) * 0.14 : 0.42;
    if (wings.current) wings.current.rotation.z = pose.buzz ? Math.sin(time * 90) * 0.12 : 0;
  });

  return (
    <group ref={fly} name="rod-dragonfly" visible={false}>
      {/* Drawn larger than life, so it reads from where the camera stands. */}
      <group scale={2.6}>
        {/* Set back so its thorax, where the legs grip, sits on the tip. */}
        <group position={[0, 0, -0.04]}>
          <mesh geometry={shapes.body} material={bodyMaterial} castShadow={false} />
          <mesh ref={wings} geometry={shapes.wing} material={wingMaterial} castShadow={false} />
        </group>
      </group>
    </group>
  );
}
