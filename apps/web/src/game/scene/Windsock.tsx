import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOCK_PLANKS } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { WINDSOCK_AT, WINDSOCK_POLE, windsockPose } from "./sockPose";

/** Meters along the sock, from its hoop to its tail. */
const SOCK_LENGTH = 0.62;

/** The three stripes bake into one painted shape; each band narrows a little toward the tail, and the cylinder's top is its hoop end. */
export function sockShape() {
  return mergePainted(
    [0, 1, 2].map((band) => ({
      geometry: new THREE.CylinderGeometry(0.1 - band * 0.022, 0.1 - (band + 1) * 0.022, SOCK_LENGTH / 3, 12, 1, true),
      position: [0, 0, (band + 0.5) * (SOCK_LENGTH / 3)] as const,
      rotation: [Math.PI / 2, 0, 0] as const,
      color: band % 2 === 0 ? "#e2602e" : "#f3ede0",
    })),
  );
}

/** A striped windsock on a pole by the pier that shows the day's wind, the same wind that walks the float. */
export function Windsock({ wind }: { wind: { x: number; z: number } }) {
  const swivel = useRef<THREE.Group>(null);
  const sock = useRef<THREE.Group>(null);
  const shape = useMemo(sockShape, []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }), []);
  useEffect(
    () => () => {
      shape.dispose();
      cloth.dispose();
    },
    [shape, cloth],
  );

  useFrame((state) => {
    const pose = windsockPose(wind, state.clock.elapsedTime);
    if (swivel.current) swivel.current.rotation.y = pose.yaw + pose.flutter * 0.6;
    // The sock runs along local +z from the hoop; tipping about x lets it droop toward the ground.
    if (sock.current) sock.current.rotation.x = pose.droop + pose.flutter;
  });

  return (
    <group position={[WINDSOCK_AT.x, DOCK_PLANKS.top, WINDSOCK_AT.z]}>
      <mesh position={[0, WINDSOCK_POLE / 2, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, WINDSOCK_POLE, 8]} />
        <meshStandardMaterial color="#6a432c" roughness={0.9} />
      </mesh>
      <group ref={swivel} position={[0, WINDSOCK_POLE - 0.06, 0]}>
        <group ref={sock}>
          <mesh geometry={shape} material={cloth} castShadow />
        </group>
      </group>
    </group>
  );
}
