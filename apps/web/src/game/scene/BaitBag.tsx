import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aboard } from "./boat";
import { bagSpot } from "./bucketSpot";
import { mergePainted, rod, type PaintedPart } from "./mergeParts";
import { anglerPose } from "./pose";
import { toonRamp } from "./toon";

const CLOTH = "#6f7d52";
const CORD = "#d9cba4";
const GROUNDBAIT = "#7d6644";
/** The bag's widest radius, and where its drawstring pulls the neck in. */
const R = 0.06;
const NECK = 0.082;

const lathe = (points: readonly (readonly [number, number])[]) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 10);

/** The drawstring's two ends, from the knot at the neck down to a bead each. */
function cordEnds(from: THREE.Vector3, ends: readonly THREE.Vector3[]): PaintedPart[] {
  return ends.flatMap((end) => [rod(from, end, 0.0025, CORD), { geometry: new THREE.SphereGeometry(0.006, 5, 4), position: [end.x, end.y, end.z] as const, color: CORD }]);
}

/** Plump with groundbait: round, drawn in at the neck, its frill opening a little on the crumb inside. */
function plumpShape() {
  return mergePainted([
    { geometry: lathe([[0.001, 0], [R * 0.75, 0.003], [R, 0.028], [R * 0.95, 0.052], [R * 0.68, 0.072], [R * 0.27, NECK]]), color: CLOTH },
    { geometry: lathe([[R * 0.24, NECK], [R * 0.36, NECK + 0.012], [R * 0.5, NECK + 0.02]]), color: CLOTH },
    { geometry: new THREE.CircleGeometry(R * 0.36, 10).rotateX(-Math.PI / 2), position: [0, NECK + 0.012, 0], color: GROUNDBAIT },
    { geometry: new THREE.TorusGeometry(R * 0.29, 0.004, 4, 12).rotateX(Math.PI / 2), position: [0, NECK + 0.002, 0], color: CORD },
    ...cordEnds(new THREE.Vector3(0.012, NECK, 0.012), [new THREE.Vector3(0.03, 0.05, 0.05), new THREE.Vector3(0.045, 0.04, 0.035)]),
  ]);
}

/** Empty: slumped flat on the ground, its neck lying out to one side with the drawstring loose. */
function slumpedShape() {
  return mergePainted([
    { geometry: lathe([[0.001, 0], [R * 1.05, 0.002], [R * 1.15, 0.008], [R * 0.9, 0.016], [R * 0.35, 0.02], [0.001, 0.021]]), scale: [1, 1, 0.85], color: CLOTH },
    { geometry: new THREE.CylinderGeometry(R * 0.3, R * 0.45, 0.06, 8).rotateZ(Math.PI / 2), position: [R * 1.35, 0.008, 0], scale: [1, 0.45, 1], color: CLOTH },
    { geometry: new THREE.TorusGeometry(R * 0.3, 0.004, 4, 12).rotateY(Math.PI / 2), position: [R * 1.4, 0.01, 0], scale: [1, 0.5, 1], color: CORD },
    ...cordEnds(new THREE.Vector3(R * 1.4, 0.005, R * 0.25), [new THREE.Vector3(R * 1.9, 0.003, R * 0.7), new THREE.Vector3(R * 1.2, 0.003, R * 0.95)]),
  ]);
}

/** The groundbait bag beside the bait bucket while the angler stands still: plump with a handful or more left, slumped flat once it is empty (bucketSpot.ts). */
export function BaitBag({ handfuls }: { handfuls: number }) {
  const group = useRef<THREE.Group>(null);
  const plump = useMemo(plumpShape, []);
  const slumped = useMemo(slumpedShape, []);
  // Both sides, so the open frill's inside shows from above.
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [plump, slumped, material].forEach((item) => item.dispose());
    },
    [plump, slumped, material],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const spot = !anglerPose.moving && !aboard() ? bagSpot(anglerPose.x, anglerPose.z, anglerPose.yaw) : null;
    g.visible = spot !== null;
    if (!spot) return;
    g.position.set(spot.x, spot.y, spot.z);
    g.rotation.y = anglerPose.yaw;
  });
  return (
    <group ref={group} name="groundbait-bag" visible={false}>
      <mesh geometry={handfuls > 0 ? plump : slumped} material={material} castShadow />
    </group>
  );
}
