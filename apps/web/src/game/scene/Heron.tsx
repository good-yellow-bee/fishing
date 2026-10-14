import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted, mergeParts } from "./mergeParts";
import { anglerPose } from "./pose";
import { heronFlight, heronLanding, heronWade, stepHeron, type HeronPose, type HeronState } from "./heronMotion";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

/** Feet sit this far under the surface while wading. */
const WADE_DEPTH = -0.12;

const BODY = "#8d969c";
const PALE = "#d4d9db";
const CAP = "#2b2f33";
const BEAK = "#d9a43a";

/** Parts that never move apart bake into one shape each: body and breast, the neck with its head, cap and bill, the held fish, the legs. */
export function heronShapes() {
  return {
    // Body, tilted a little nose-down, with a pale breast.
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.78, 0], rotation: [0.25, 0, 0], scale: [0.17, 0.19, 0.36], color: BODY },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.74, 0.16], scale: [0.12, 0.14, 0.16], color: PALE },
    ]),
    neck: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.03, 0.045, 0.42, 8), position: [0, 0.2, 0.05], rotation: [0.25, 0, 0], color: PALE },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.42, 0.1], scale: [0.065, 0.07, 0.09], color: PALE },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.46, 0.06], scale: [0.05, 0.03, 0.08], color: CAP },
      { geometry: new THREE.ConeGeometry(0.025, 0.22, 6), position: [0, 0.41, 0.27], rotation: [Math.PI / 2, 0, 0], color: BEAK },
    ]),
    fish: mergeParts([
      { geometry: new THREE.SphereGeometry(1, 8, 6), scale: [0.11, 0.032, 0.026] },
      { geometry: new THREE.ConeGeometry(0.035, 0.05, 4), position: [-0.12, 0, 0], rotation: [0, 0, -Math.PI / 2], scale: [1, 1, 0.4] },
    ]),
    legs: mergeParts([-0.05, 0.05].map((x) => ({ geometry: new THREE.CylinderGeometry(0.014, 0.014, 0.66, 5), position: [x, -0.33, 0] as const }))),
    wing: new THREE.BoxGeometry(1, 1, 1),
  };
}

/** Made of a few primitives, like the ducks, so it costs no model download. About 1.1 m tall standing. */
export function Heron() {
  const root = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const fish = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef<HeronState>({ mode: "wading" });
  const still = useReducedMotion();
  const mats = useMemo(() => {
    const toon = (color: string) => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp() });
    return {
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      wing: toon("#6f7a82"),
      leg: toon("#6b5a3c"),
      fish: toon("#b9c4bd"),
    };
  }, []);
  const shapes = useMemo(heronShapes, []);
  useEffect(
    () => () => {
      [...Object.values(mats), ...Object.values(shapes)].forEach((thing) => thing.dispose());
    },
    [mats, shapes],
  );

  useFrame((frame) => {
    const group = root.current;
    if (!group) return;
    const time = frame.clock.elapsedTime;
    const wading = heronWade(time, still);
    state.current = stepHeron(state.current, time, anglerPose, wading);
    const current = state.current;
    let pose: HeronPose | null = wading;
    if (current.mode === "flying") pose = heronFlight(time - current.since, current.from);
    else if (current.mode === "landing") pose = heronLanding(time - current.since, wading);
    else if (current.mode === "away") pose = null;
    group.visible = pose !== null;
    if (ring.current) ring.current.visible = false;
    if (!pose) return;
    group.position.set(pose.x, pose.flying ? pose.y : WADE_DEPTH, pose.z);
    group.rotation.y = pose.yaw;
    // A slight forward lean in flight, neck tucked back.
    group.rotation.x = pose.flying ? 0.12 : 0;
    // Holding a catch, the head comes up and back to work the fish down.
    const lift = pose.fish >= 0 ? -0.4 * Math.sin(pose.fish * Math.PI) : 0;
    if (neck.current) neck.current.rotation.x = pose.flying ? -0.9 : pose.stab * 1.15 + lift;
    if (fish.current) {
      fish.current.visible = pose.fish >= 0;
      // Crosswise in the bill, then gone down the throat in the last third.
      fish.current.scale.setScalar(pose.fish < 0.66 ? 1 : Math.max(0.01, 1 - (pose.fish - 0.66) / 0.34));
    }
    if (ring.current && ringMaterial.current && pose.ring >= 0) {
      // Where the bill went in, a long reach ahead of the feet.
      const x = pose.x + Math.sin(pose.yaw) * 0.75;
      const z = pose.z + Math.cos(pose.yaw) * 0.75;
      ring.current.visible = true;
      ring.current.position.set(x, waterHeight(x, z, time) + 0.03, z);
      ring.current.scale.setScalar(0.25 + pose.ring * 1.1);
      ringMaterial.current.opacity = (1 - pose.ring) * 0.5;
    }
    if (legs.current) legs.current.rotation.x = pose.flying ? 1.35 : 0;
    const flap = pose.flying ? 0.15 + pose.wing * 0.75 : 0;
    if (leftWing.current) {
      leftWing.current.visible = pose.flying;
      leftWing.current.rotation.z = flap;
    }
    if (rightWing.current) {
      rightWing.current.visible = pose.flying;
      rightWing.current.rotation.z = -flap;
    }
  });

  return (
    <>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.37, 24]} />
        <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={root} name="heron">
        <mesh geometry={shapes.body} material={mats.painted} castShadow />
        {/* Neck pivots at the shoulder: stand tall, stab forward, tuck back in flight. */}
        <group ref={neck} position={[0, 0.86, 0.24]}>
          <mesh geometry={shapes.neck} material={mats.painted} />
          {/* A small fish held crosswise near the bill's tip. */}
          <group ref={fish} position={[0, 0.41, 0.34]} visible={false}>
            <mesh geometry={shapes.fish} material={mats.fish} />
          </group>
        </group>
        {/* Legs hang from the hip and trail behind in flight. */}
        <group ref={legs} position={[0, 0.66, -0.04]}>
          <mesh geometry={shapes.legs} material={mats.leg} />
        </group>
        {/* Broad wings, shown only in flight. */}
        <group ref={leftWing} position={[0.12, 0.84, 0]} visible={false}>
          <mesh geometry={shapes.wing} material={mats.wing} position={[0.42, 0, 0]} scale={[0.84, 0.03, 0.34]} />
        </group>
        <group ref={rightWing} position={[-0.12, 0.84, 0]} visible={false}>
          <mesh geometry={shapes.wing} material={mats.wing} position={[-0.42, 0, 0]} scale={[0.84, 0.03, 0.34]} />
        </group>
      </group>
    </>
  );
}
