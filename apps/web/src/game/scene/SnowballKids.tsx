import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { kidLimbShape, kidTorsoShape } from "./LeafPile";
import { poseFromHolders } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { KIDS, kidAt, puffAt, snowballAt } from "./snowballFight";
import { toonRamp, useInstancedTwin } from "./toon";

/** Each child's coat, trousers and woolly hat. */
const KITS = [
  { jacket: "#c8453c", trousers: "#2f3d5c", hat: "#2e6e8e" },
  { jacket: "#3d8a5a", trousers: "#4a3a32", hat: "#e0b23c" },
] as const;
const SNOW = "#f6f8fb";
const HIP_Y = 0.5;
const LEG = 0.48;
/** Bits of snow in each burst. */
const PUFF_BITS = 8;
/** Drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.25;

/** Two children having a snowball fight on the far bank on winter days (snowballFight.ts): eight draws. */
export function SnowballKids() {
  const still = useReducedMotion();
  const bodies = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const tilts = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const throwArms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const otherArms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const legs = [
    [useRef<THREE.Group>(null), useRef<THREE.Group>(null)],
    [useRef<THREE.Group>(null), useRef<THREE.Group>(null)],
  ];
  const ball = useRef<THREE.Mesh>(null);
  const puff = useRef<THREE.Group>(null);
  const bits = useRef<(THREE.Group | null)[]>([]);
  const root = useRef<THREE.Group>(null);
  const armMeshes = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const legMeshes = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const bitMeshes = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(
    () => ({
      kits: KITS.map((kit) => ({ torso: kidTorsoShape(kit.jacket, kit.hat), leg: kidLimbShape(LEG, kit.trousers), arm: kidLimbShape(0.32, kit.jacket) })),
      ball: new THREE.SphereGeometry(0.07, 8, 6),
      bit: new THREE.IcosahedronGeometry(0.06, 0),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const instanced = useInstancedTwin(material);
  const snow = useMemo(() => new THREE.MeshToonMaterial({ color: SNOW, gradientMap: toonRamp() }), []);
  const snowTwin = useInstancedTwin(snow);
  useEffect(
    () => () => {
      [...shapes.kits.flatMap((kit) => [kit.torso, kit.leg, kit.arm]), shapes.ball, shapes.bit, material, snow].forEach((item) => item.dispose());
    },
    [shapes, material, snow],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    KIDS.forEach((_, i) => {
      const pose = kidAt(i, time, still);
      // Crouching: the hips drop, the body bends forward over the knees, and the thighs swing forward.
      bodies[i]!.current?.position.setY(-pose.crouch * 0.2);
      if (tilts[i]!.current) tilts[i]!.current.rotation.x = pose.crouch * 0.75;
      legs[i]!.forEach((leg) => {
        if (leg.current) leg.current.rotation.x = -pose.crouch * 0.9;
      });
      // Scooping, both hands reach down for the snow; packing, they come together in front.
      const reach = pose.crouch * 0.9 + pose.pack * 1.1;
      if (throwArms[i]!.current) throwArms[i]!.current.rotation.x = -Math.max(reach, pose.arm);
      if (otherArms[i]!.current) otherArms[i]!.current.rotation.x = -reach - (pose.arm > 0 ? 0.5 : 0) * Math.min(1, pose.arm);
    });
    const point = snowballAt(time, still);
    if (ball.current) {
      ball.current.visible = point !== null;
      if (point) ball.current.position.set(point.x, point.y, point.z);
    }
    const burst = puffAt(time, still);
    if (puff.current) {
      puff.current.visible = burst !== null;
      if (burst) {
        puff.current.position.set(burst.x, burst.y, burst.z);
        bits.current.forEach((bit, k) => {
          if (!bit) return;
          const a = (k / PUFF_BITS) * Math.PI * 2;
          const out = 0.12 + burst.age * 0.45;
          bit.position.set(Math.cos(a) * out, 0.05 + burst.age * (0.35 + (k % 3) * 0.08) - burst.age * burst.age * 0.5, Math.sin(a) * out);
          bit.scale.setScalar(1.2 * (1 - burst.age * 0.8));
        });
      }
    }
    // Each kid's arms, each kid's legs and the burst's bits are one draw apiece, posed from the groups below.
    const top = root.current;
    if (!top) return;
    top.updateMatrixWorld();
    KIDS.forEach((_, i) => {
      poseFromHolders(armMeshes[i]!.current, top, [throwArms[i]!.current, otherArms[i]!.current]);
      poseFromHolders(legMeshes[i]!.current, top, legs[i]!.map((leg) => leg.current));
    });
    poseFromHolders(bitMeshes.current, top, bits.current);
  });
  return (
    <group name="snowball-kids" ref={root}>
      {KIDS.map((kid, i) => (
        <group key={i} position={[kid.x, 0, kid.z]} rotation={[0, kid.yaw, 0]} scale={SCALE}>
          <group ref={bodies[i]}>
            <group position={[0, HIP_Y, 0]}>
              <group ref={tilts[i]}>
                <mesh geometry={shapes.kits[i]!.torso} material={material} castShadow />
                {/* The throwing arm on the right (-x, facing +z), the other on the left. */}
                <group ref={throwArms[i]} position={[-0.13, 0.32, 0]} />
                <group ref={otherArms[i]} position={[0.13, 0.32, 0]} />
              </group>
              {[1, -1].map((side, k) => (
                <group key={side} ref={legs[i]![k]} position={[side * 0.06, 0, 0]} />
              ))}
            </group>
          </group>
        </group>
      ))}
      <mesh ref={ball} geometry={shapes.ball} material={snow} visible={false} castShadow />
      <group ref={puff} visible={false}>
        {Array.from({ length: PUFF_BITS }, (_, k) => (
          <group
            key={k}
            ref={(node) => {
              bits.current[k] = node;
            }}
          />
        ))}
      </group>
      {KIDS.map((_, i) => (
        <group key={i}>
          <instancedMesh ref={armMeshes[i]} args={[shapes.kits[i]!.arm, instanced, 2]} frustumCulled={false} />
          <instancedMesh ref={legMeshes[i]} args={[shapes.kits[i]!.leg, instanced, 2]} frustumCulled={false} />
        </group>
      ))}
      <instancedMesh ref={bitMeshes} args={[shapes.bit, snowTwin, PUFF_BITS]} frustumCulled={false} />
    </group>
  );
}
