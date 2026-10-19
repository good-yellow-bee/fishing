import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { GLIDER_SCALE, gliderAt } from "./paraglideRidge";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const CELLS = ["#e8552e", "#f2c230", "#e8552e", "#2f7fc0", "#e8552e", "#f2c230", "#e8552e"];
const LINE = "#d8d4cc";
const SUIT = "#3a4a5c";
const HELMET = "#f0eee8";

/** A paraglider facing +z: an arched wing of coloured cells over the pilot, slung in a harness by two fans of lines. */
export function gliderShape() {
  const span = 1.2;
  const rise = 0.75;
  const parts: PaintedPart[] = CELLS.map((color, i) => {
    // Each cell sits on the wing's arch, tipped to follow it.
    const angle = ((i - (CELLS.length - 1) / 2) / CELLS.length) * 2.1;
    return {
      geometry: new THREE.BoxGeometry(span / CELLS.length + 0.01, 0.05, 0.3),
      position: [Math.sin(angle) * span * 0.55, rise - (1 - Math.cos(angle)) * span * 0.55, 0] as const,
      rotation: [0, 0, angle] as const,
      color,
    };
  });
  [-1, 1].forEach((side) => {
    const tip = new THREE.Vector3(side * span * 0.45, rise - 0.12, 0);
    const length = tip.length();
    parts.push({
      geometry: new THREE.CylinderGeometry(0.006, 0.006, length, 3),
      position: [tip.x / 2, tip.y / 2, 0],
      rotation: [0, 0, -Math.atan2(tip.x, tip.y)],
      color: LINE,
    });
  });
  parts.push(
    { geometry: new THREE.BoxGeometry(0.1, 0.14, 0.16), position: [0, -0.04, -0.02], color: SUIT },
    { geometry: new THREE.SphereGeometry(0.05, 6, 4), position: [0, 0.07, 0.01], color: HELMET },
  );
  return mergePainted(parts);
}

/** A paraglider soaring the far hills' ridge on fine, breezy days (paraglideRidge.ts): one draw. */
export function Paraglider() {
  const still = useReducedMotion();
  const glider = useRef<THREE.Mesh>(null);
  const shape = useMemo(() => gliderShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
    },
    [shape, material],
  );
  useFrame(({ clock }) => {
    const mesh = glider.current;
    if (!mesh) return;
    const pose = gliderAt(clock.elapsedTime, still);
    mesh.position.set(pose.x, pose.y, pose.z);
    // Yaw first, then the bank about its own heading.
    mesh.rotation.set(0, pose.yaw, pose.bank, "YXZ");
  });
  return <mesh ref={glider} name="paraglider" geometry={shape} material={material} scale={GLIDER_SCALE} />;
}
