import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fightView } from "./fightMotion";
import { handleRadians, haulStep, spoolRadians } from "./reelMotion";
import { toonRamp } from "./toon";

export function Reel() {
  const crank = useRef<THREE.Group>(null);
  const drum = useRef<THREE.Group>(null);
  const hauled = useRef(0);
  const prevPump = useRef(0);
  const ramp = toonRamp();

  useFrame(() => {
    if (!fightView.active) {
      hauled.current = 0;
      prevPump.current = 0;
    } else {
      hauled.current += haulStep(prevPump.current, fightView.pump, fightView.reeling, fightView.surge);
      prevPump.current = fightView.pump;
    }
    const meters = hauled.current;
    if (crank.current) crank.current.rotation.x = handleRadians(meters);
    if (drum.current) drum.current.rotation.x = spoolRadians(meters);
  });

  return (
    <group position={[0.12, 0.16, 0.02]} scale={1.85}>
      <mesh position={[-0.045, 0, 0]}>
        <boxGeometry args={[0.028, 0.07, 0.04]} />
        <meshToonMaterial color="#3a322c" gradientMap={ramp} />
      </mesh>
      <group ref={drum}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.034, 14]} />
          <meshToonMaterial color="#d7dee2" gradientMap={ramp} />
        </mesh>
        <mesh position={[0.022, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.072, 0.072, 0.01, 14]} />
          <meshToonMaterial color="#7f8b93" gradientMap={ramp} />
        </mesh>
        <mesh position={[0, 0.058, 0]}>
          <boxGeometry args={[0.036, 0.016, 0.016]} />
          <meshToonMaterial color="#243036" gradientMap={ramp} />
        </mesh>
        <mesh position={[0, -0.02, 0.05]}>
          <boxGeometry args={[0.036, 0.016, 0.016]} />
          <meshToonMaterial color="#243036" gradientMap={ramp} />
        </mesh>
      </group>
      <group ref={crank} position={[0.038, 0, 0]}>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.014, 0.16, 0.016]} />
          <meshToonMaterial color="#1c2422" gradientMap={ramp} />
        </mesh>
        <mesh position={[0.02, 0.15, 0]}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <meshToonMaterial color="#d08a3a" gradientMap={ramp} />
        </mesh>
      </group>
    </group>
  );
}
