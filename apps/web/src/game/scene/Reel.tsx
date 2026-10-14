import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fightView } from "./fightMotion";
import { mergePainted } from "./mergeParts";
import { handleRadians, haulStep, spoolRadians } from "./reelMotion";
import { toonRamp } from "./toon";

/** The spool (drum, rim, line guides) and the crank (arm, knob) each bake into one painted shape so they turn as one. */
export function reelShapes() {
  return {
    drum: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.034, 14), rotation: [0, 0, Math.PI / 2], color: "#d7dee2" },
      { geometry: new THREE.CylinderGeometry(0.072, 0.072, 0.01, 14), position: [0.022, 0, 0], rotation: [0, 0, Math.PI / 2], color: "#7f8b93" },
      { geometry: new THREE.BoxGeometry(0.036, 0.016, 0.016), position: [0, 0.058, 0], color: "#243036" },
      { geometry: new THREE.BoxGeometry(0.036, 0.016, 0.016), position: [0, -0.02, 0.05], color: "#243036" },
    ]),
    crank: mergePainted([
      { geometry: new THREE.BoxGeometry(0.014, 0.16, 0.016), position: [0, 0.08, 0], color: "#1c2422" },
      { geometry: new THREE.SphereGeometry(0.032, 12, 10), position: [0.02, 0.15, 0], color: "#d08a3a" },
    ]),
  };
}

export function Reel() {
  const crank = useRef<THREE.Group>(null);
  const drum = useRef<THREE.Group>(null);
  const hauled = useRef(0);
  const prevPump = useRef(0);
  const ramp = toonRamp();
  const shapes = useMemo(reelShapes, []);
  const painted = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: ramp }), [ramp]);
  useEffect(
    () => () => {
      shapes.drum.dispose();
      shapes.crank.dispose();
      painted.dispose();
    },
    [shapes, painted],
  );

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
        <mesh geometry={shapes.drum} material={painted} />
      </group>
      <group ref={crank} position={[0.038, 0, 0]}>
        <mesh geometry={shapes.crank} material={painted} />
      </group>
    </group>
  );
}
