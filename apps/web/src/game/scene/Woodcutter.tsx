import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted, mergeParts, poseLimbs } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { BLOCK_AT, CUTTER_AT, CUTTER_YAW, STACK_AT, chopAt } from "./woodChopping";

const SHIRT_A = "#b03a2e";
const SHIRT_B = "#2b2b2b";
const TROUSERS = "#3d4654";
const SKIN = "#e2b48c";
const BEANIE = "#3f6f8f";
const BOOTS = "#3a2e26";
const BARK = "#6e4a2e";
const WOOD = "#d8b98a";
const HANDLE = "#9a7148";
const STEEL = "#8f969c";
/** The hips' height and the shoulders' above them. */
const HIP_Y = 0.86;
const SHOULDER_Y = 0.56;
/** The chopping block's height, and a log's on it. */
const BLOCK_Y = 0.42;
const LOG_H = 0.4;
/** Drawn a little larger than life, as the cabin is, so the work reads from across the lake. */
const SCALE = 1.2;
/** Where the woodstack stands, seen from the chopping block, at its scale. */
const STACK_FROM_BLOCK = new THREE.Vector3(STACK_AT.x - BLOCK_AT.x, 0, STACK_AT.z - BLOCK_AT.z)
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), -CUTTER_YAW)
  .divideScalar(SCALE)
  .toArray();

/** The woodcutter's body above the hips, in a check shirt and beanie, facing +z. */
export function cutterTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.16, 0.18, 0.62, 8), position: [0, 0.31, 0], color: SHIRT_A },
    ...[0.12, 0.3, 0.48].map((y) => ({ geometry: new THREE.CylinderGeometry(0.172, 0.172, 0.05, 8), position: [0, y, 0] as const, color: SHIRT_B })),
    { geometry: new THREE.SphereGeometry(0.11, 10, 8), position: [0, 0.76, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.118, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.79, 0], color: BEANIE },
  ]);
}

/** The legs and boots, planted apart. */
export function cutterLegsShape() {
  return mergePainted([
    ...[-0.1, 0.1].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.065, 0.055, HIP_Y - 0.06, 6), position: [x, (HIP_Y + 0.06) / 2, 0] as const, rotation: [0, 0, x * 0.6] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.11, 0.07, 0.2), position: [x * 1.25, 0.035, 0.04] as const, color: BOOTS },
    ]),
  ]);
}

/** Both arms hung from the shoulders, the hands together on the axe handle, which runs on down past them to the head. */
export function axeArmsShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.05, 0.045, 0.52, 6), position: [0.13, -0.26, 0], rotation: [0, 0, -0.35], color: SHIRT_A },
    { geometry: new THREE.CylinderGeometry(0.05, 0.045, 0.52, 6), position: [-0.13, -0.26, 0], rotation: [0, 0, 0.35], color: SHIRT_A },
    { geometry: new THREE.SphereGeometry(0.05, 6, 4), position: [0, -0.52, 0], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.02, 0.022, 0.75, 6), position: [0, -0.8, 0], color: HANDLE },
    { geometry: new THREE.BoxGeometry(0.04, 0.12, 0.2), position: [0, -1.12, 0.06], color: STEEL },
  ]);
}

/** The chopping block: a broad round of trunk. */
export function blockShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.26, 0.29, BLOCK_Y, 10), position: [0, BLOCK_Y / 2, 0], color: BARK },
    { geometry: new THREE.CylinderGeometry(0.255, 0.255, 0.01, 10), position: [0, BLOCK_Y + 0.004, 0], color: WOOD },
  ]);
}

/** A whole log, stood on end. */
export function logShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.12, 0.12, LOG_H, 8), position: [0, LOG_H / 2, 0], color: BARK },
    { geometry: new THREE.CylinderGeometry(0.115, 0.115, 0.01, 8), position: [0, LOG_H + 0.003, 0], color: WOOD },
  ]);
}

/** Half a log, its flat split face on +x, standing on end with its bottom edge at the origin. */
export function halfShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.12, 0.12, LOG_H, 8, 1, false, -Math.PI, Math.PI), position: [0, LOG_H / 2, 0], color: BARK },
    { geometry: new THREE.BoxGeometry(0.005, LOG_H, 0.24), position: [0, LOG_H / 2, 0], color: WOOD },
  ]);
}

/** The stack of split logs against the cabin wall, between two stakes. */
export function stackShape() {
  const pieces = [];
  for (let row = 0; row < 4; row += 1) {
    for (let i = 0; i < 6 - (row % 2); i += 1) {
      pieces.push({
        geometry: new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6),
        position: [-0.55 + i * 0.21 + (row % 2) * 0.1, 0.1 + row * 0.18, 0] as const,
        rotation: [Math.PI / 2, i * 0.7, 0] as const,
        color: row % 2 === 0 ? BARK : "#7d5838",
      });
    }
  }
  return mergePainted([
    ...pieces,
    { geometry: new THREE.BoxGeometry(0.06, 0.9, 0.06), position: [-0.7, 0.45, 0], color: BARK },
    { geometry: new THREE.BoxGeometry(0.06, 0.9, 0.06), position: [0.7, 0.45, 0], color: BARK },
  ]);
}

/** Someone splitting firewood on a block beside the far cabin on fall and winter days. */
export function Woodcutter() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const arms = useRef<THREE.Group>(null);
  const log = useRef<THREE.Mesh>(null);
  const halves = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  // The split halves are drawn as two instances posed from the groups above: one draw.
  const halfMeshes = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(
    () => ({
      torso: cutterTorsoShape(),
      legs: cutterLegsShape(),
      arms: axeArmsShape(),
      // The block and the woodstack never move: one draw, placed from the block.
      yard: mergeParts([{ geometry: blockShape() }, { geometry: stackShape(), position: STACK_FROM_BLOCK, rotation: [0, Math.PI / 2, 0] }]),
      log: logShape(),
      half: halfShape(),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const pose = chopAt(clock.elapsedTime, still);
    if (body.current) body.current.rotation.y = CUTTER_YAW + pose.turn;
    if (upper.current) upper.current.rotation.x = 0.7 * pose.stoop;
    // A turn of -x swings the arms up in front.
    if (arms.current) arms.current.rotation.x = -pose.swing;
    if (log.current) log.current.visible = pose.log;
    if (halfMeshes.current) halfMeshes.current.visible = pose.split !== null;
    halves.forEach((half, i) => {
      const group = half.current;
      if (!group) return;
      const k = pose.split ?? 0;
      // Each half, its split face to the middle, topples outward off the block and lands split face up.
      const side = i === 0 ? 1 : -1;
      group.position.set(side * (0.005 + 0.3 * k), BLOCK_Y * (1 - k) + 0.12 * k, 0);
      group.rotation.set(0, side > 0 ? Math.PI : 0, (Math.PI / 2) * k);
    });
    poseLimbs(halfMeshes.current, halves);
  });
  return (
    <group name="woodcutter">
      <group ref={body} position={[CUTTER_AT.x, 0, CUTTER_AT.z]} rotation={[0, CUTTER_YAW, 0]} scale={SCALE}>
        <mesh geometry={shapes.legs} material={material} castShadow />
        <group ref={upper} position={[0, HIP_Y, 0]}>
          <mesh geometry={shapes.torso} material={material} castShadow />
          <group ref={arms} position={[0, SHOULDER_Y, 0.05]}>
            <mesh geometry={shapes.arms} material={material} />
          </group>
        </group>
      </group>
      <group position={[BLOCK_AT.x, 0, BLOCK_AT.z]} rotation={[0, CUTTER_YAW, 0]} scale={SCALE}>
        <mesh geometry={shapes.yard} material={material} castShadow />
        <mesh ref={log} geometry={shapes.log} material={material} position={[0, BLOCK_Y, 0]} />
        {halves.map((half, i) => (
          <group key={i} ref={half} />
        ))}
        <instancedMesh ref={halfMeshes} args={[shapes.half, material, 2]} frustumCulled={false} />
      </group>
    </group>
  );
}
