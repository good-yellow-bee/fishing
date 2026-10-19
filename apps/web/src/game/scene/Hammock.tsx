import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAKE_CENTER_Z } from "@stillwater/shared";
import { footPush, hammockSwing, hammockTies, pageTurn } from "./hammockSway";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const STRIPES = ["#e0573f", "#f3d36b", "#3f8fce", "#f3d36b"];
const ROPE = "#c9b48a";
const SKIN = "#e2b48c";
const SHIRT = "#f2efe6";
const SHORTS = "#4a6b8a";
const HAIR = "#3b2a1c";
const COVER = "#2f7d5b";
const PAGE = "#fbf7ea";
/** How far in from each tie the fabric's spreader bars hang, how far below the ties, and how deep the fabric sags between them. */
const ROPE_IN = 0.45;
const BAR_DROP = 0.32;
const SAG = 0.32;
const WIDTH = 0.72;
const PANELS = 10;

type Tree = { position: readonly [number, number, number]; scale: number };

/** How far below the ties the fabric is at `x` along it, from -half to half. */
function sagAt(x: number, half: number) {
  const k = x / half;
  return -BAR_DROP - SAG * (1 - k * k);
}

function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, color: string): PaintedPart {
  const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  const euler = new THREE.Euler().setFromQuaternion(tilt);
  return {
    geometry: new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 5),
    position: from.clone().add(to).multiplyScalar(0.5).toArray(),
    rotation: [euler.x, euler.y, euler.z],
    color,
  };
}

/** The hammock and its reader in its own frame: the ties at x = ±length/2, y = 0, the reader's head toward +x, the open book toward +z. */
export function hammockShape(length: number) {
  const tie = length / 2;
  const half = tie - ROPE_IN;
  const parts: PaintedPart[] = [];
  for (let i = 0; i < PANELS; i++) {
    const x0 = -half + (i / PANELS) * 2 * half;
    const x1 = -half + ((i + 1) / PANELS) * 2 * half;
    const y0 = sagAt(x0, half);
    const y1 = sagAt(x1, half);
    parts.push({
      geometry: new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0) + 0.01, 0.03, WIDTH),
      position: [(x0 + x1) / 2, (y0 + y1) / 2, 0],
      rotation: [0, 0, Math.atan2(y1 - y0, x1 - x0)],
      color: STRIPES[i % STRIPES.length]!,
    });
  }
  for (const end of [-1, 1]) {
    const bar = new THREE.Vector3(end * half, -BAR_DROP, 0);
    parts.push({ geometry: new THREE.BoxGeometry(0.04, 0.04, WIDTH + 0.08), position: bar.toArray(), color: ROPE });
    for (const side of [-1, 1]) parts.push(rod(new THREE.Vector3(end * tie, 0, 0), bar.clone().add(new THREE.Vector3(0, 0, side * WIDTH * 0.45)), 0.012, ROPE));
  }
  // The reader, lying along the fabric with their head raised toward +x.
  const on = (x: number, up: number) => sagAt(x, half) + up;
  parts.push(
    { geometry: new THREE.CylinderGeometry(0.15, 0.13, 0.62, 8), position: [0.18, on(0.18, 0.13), 0], rotation: [0, 0, Math.PI / 2 + 0.25], color: SHIRT },
    { geometry: new THREE.CylinderGeometry(0.14, 0.13, 0.22, 8), position: [-0.22, on(-0.22, 0.11), 0], rotation: [0, 0, Math.PI / 2], color: SHORTS },
    { geometry: new THREE.CylinderGeometry(0.055, 0.05, 0.62, 6), position: [-0.62, on(-0.62, 0.1), 0.08], rotation: [0, 0, Math.PI / 2 - 0.2], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.12, 10, 8), position: [0.62, on(0.62, 0.3), 0], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0.65, on(0.62, 0.31), 0], rotation: [0, 0, -1.1], color: HAIR },
    // Forearms up holding the book open over the chest, and its left half.
    rod(new THREE.Vector3(0.28, on(0.28, 0.22), 0.13), new THREE.Vector3(0.38, on(0.38, 0.52), 0.13), 0.04, SKIN),
    rod(new THREE.Vector3(0.28, on(0.28, 0.22), -0.13), new THREE.Vector3(0.38, on(0.38, 0.52), -0.13), 0.04, SKIN),
    { geometry: new THREE.BoxGeometry(0.03, 0.26, 0.17), position: [0.4, on(0.4, 0.56), 0.09], rotation: [0.25, 0, 0.35], color: COVER },
    { geometry: new THREE.BoxGeometry(0.03, 0.26, 0.17), position: [0.4, on(0.4, 0.56), -0.09], rotation: [-0.25, 0, 0.35], color: COVER },
  );
  return { geometry: mergePainted(parts), half, book: new THREE.Vector3(0.4, on(0.4, 0.56), 0), hip: new THREE.Vector3(-0.3, on(-0.3, 0.12), -0.08) };
}

/** Someone reading in a hammock slung between two trees across the lake on warm days (hammockSway.ts). */
export function Hammock({ trees }: { trees: readonly [Tree, Tree] }) {
  const still = useReducedMotion();
  const sling = useRef<THREE.Group>(null);
  const page = useRef<THREE.Group>(null);
  const leg = useRef<THREE.Group>(null);
  const frame = useMemo(() => {
    const [a, b] = hammockTies(trees[0], trees[1]);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    // Local +z faces the lake, so the reader and their book face the dock.
    const facing = (-dz * -mid.x + dx * (LAKE_CENTER_Z - mid.z)) / length >= 0 ? 1 : -1;
    return { position: [mid.x, a.y, mid.z] as const, yaw: Math.atan2(-dz, dx), length, facing };
  }, [trees]);
  const shape = useMemo(() => hammockShape(frame.length), [frame.length]);
  const pageShape = useMemo(() => mergePainted([{ geometry: new THREE.BoxGeometry(0.008, 0.24, 0.16), position: [0, 0, 0.08], color: PAGE }]), []);
  const legShape = useMemo(() => mergePainted([{ geometry: new THREE.CylinderGeometry(0.055, 0.05, 0.6, 6), position: [0, -0.3, 0], color: SKIN }]), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      shape.geometry.dispose();
      pageShape.dispose();
      legShape.dispose();
      material.dispose();
    },
    [shape, pageShape, legShape, material],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sling.current) sling.current.rotation.x = hammockSwing(t, still);
    // The page swings over from the right half to the left about the spine.
    if (page.current) page.current.rotation.x = 0.25 - pageTurn(t, still) * Math.PI * 0.9;
    // One leg hangs over the edge, reaching out to push off the near trunk.
    if (leg.current) {
      const push = footPush(t, still);
      leg.current.rotation.set(-0.5 - push * 0.4, 0, -0.35 - push * 0.75);
    }
  });
  return (
    <group name="hammock" position={[...frame.position]} rotation={[0, frame.yaw, 0]} scale={[1, 1, frame.facing]}>
      <group ref={sling}>
        <mesh geometry={shape.geometry} material={material} />
        <group position={shape.book.toArray()} rotation={[0, 0, 0.35]}>
          <group ref={page}>
            <mesh geometry={pageShape} material={material} />
          </group>
        </group>
        <group ref={leg} position={shape.hip.toArray()}>
          <mesh geometry={legShape} material={material} />
        </group>
      </group>
    </group>
  );
}
