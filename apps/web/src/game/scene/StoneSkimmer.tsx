import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { kidLimbShape, kidTorsoShape } from "./LeafPile";
import { useReducedMotion } from "./reducedMotion";
import { MAX_SKIPS, SKIMMER_AT, SKIMMER_YAW, skimRings, skimmerAt, stoneAt } from "./skimStones";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const JACKET = "#e07b2e";
const HAT = "#2f5f8a";
const SHORTS = "#4a5a6a";
const STONE = "#6c6a66";
const HIP_Y = 0.5;
const LEG = 0.48;
/** The widest a skip's ring spreads, in meters across. */
const RING_MAX = 1.4;
/** Drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.25;

/** A child skimming stones from the edge of the far bank (skimStones.ts). */
export function StoneSkimmer() {
  const still = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const throwArm = useRef<THREE.Group>(null);
  const otherArm = useRef<THREE.Group>(null);
  const stone = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const shapes = useMemo(
    () => ({ torso: kidTorsoShape(JACKET, HAT), leg: kidLimbShape(LEG, SHORTS), arm: kidLimbShape(0.32, JACKET), stone: new THREE.SphereGeometry(0.07, 8, 5), ring: new THREE.RingGeometry(0.8, 1, 32) }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const stoneMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: STONE, gradientMap: toonRamp() }), []);
  const ringMaterials = useMemo(
    () => Array.from({ length: MAX_SKIPS + 1 }, () => new THREE.MeshBasicMaterial({ color: "#eef6f2", transparent: true, depthWrite: false })),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), material, stoneMaterial, ...ringMaterials].forEach((item) => item.dispose());
    },
    [shapes, material, stoneMaterial, ringMaterials],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = skimmerAt(time, still);
    body.current?.position.setY(-pose.stoop * 0.12);
    if (torso.current) torso.current.rotation.x = pose.stoop * 1.0;
    // The throwing arm lifts out to the side, swings back, then slings round in front, sidearm.
    if (throwArm.current) {
      throwArm.current.rotation.z = -pose.lift * 1.35;
      throwArm.current.rotation.y = pose.sling < 0 ? pose.sling * 0.9 : pose.sling * 1.4;
      throwArm.current.rotation.x = -pose.stoop * 0.9;
    }
    // The other hand reaches down for the stone as they stoop.
    if (otherArm.current) otherArm.current.rotation.x = -pose.stoop * 0.9;
    const point = stoneAt(time, still);
    if (stone.current) {
      stone.current.visible = point !== null;
      if (point) stone.current.position.set(point.x, waterHeight(point.x, point.z, time) + point.y + 0.03, point.z);
    }
    const spreading = skimRings(time, still);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const one = spreading[i];
      ring.visible = one !== undefined;
      if (!one) return;
      ring.position.set(one.x, waterHeight(one.x, one.z, time) + 0.04, one.z);
      ring.scale.setScalar(0.08 + (RING_MAX / 2) * (1 - (1 - one.age) ** 2));
      ringMaterials[i]!.opacity = 0.9 * (1 - one.age);
    });
  });
  return (
    <group name="stone-skimmer">
      <group position={[SKIMMER_AT.x, 0, SKIMMER_AT.z]} rotation={[0, SKIMMER_YAW, 0]} scale={SCALE}>
        <group ref={body}>
          <group position={[0, HIP_Y, 0]}>
            <group ref={torso}>
              <mesh geometry={shapes.torso} material={material} castShadow />
              {/* The throwing arm on the right (-x, facing +z). */}
              <group ref={throwArm} position={[-0.13, 0.32, 0]}>
                <mesh geometry={shapes.arm} material={material} />
              </group>
              <group ref={otherArm} position={[0.13, 0.32, 0]}>
                <mesh geometry={shapes.arm} material={material} />
              </group>
            </group>
            {[1, -1].map((side) => (
              <group key={side} position={[side * 0.06, 0, 0]} rotation={[side * 0.12, 0, 0]}>
                <mesh geometry={shapes.leg} material={material} />
              </group>
            ))}
          </group>
        </group>
      </group>
      <mesh ref={stone} geometry={shapes.stone} material={stoneMaterial} scale={[1, 0.45, 1]} visible={false} />
      {ringMaterials.map((ringMaterial, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            rings.current[i] = mesh;
          }}
          geometry={shapes.ring}
          material={ringMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          renderOrder={4}
        />
      ))}
    </group>
  );
}
