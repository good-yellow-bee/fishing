import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { sailAt } from "./sailingTrip";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const HULL = "#f2efe6";
const STRIPE = "#2f5f8a";
const DECK = "#b98a55";
const SPAR = "#8a6a48";
const SAIL = "#f6f1e4";
const JIB = "#d4553a";
const JACKET = "#e3b23c";
const SKIN = "#e2b48c";
const CAP = "#2f5f8a";
/** The mast's foot, from the boat's middle, and how tall it stands; the boom's length. */
const MAST_Z = 0.35;
const MAST_FOOT = 0.1;
const MAST_TOP = 2.7;
const BOOM = 1.35;

function triangle(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, c: THREE.Vector3Tuple) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  // The same attributes as the built-in shapes, so they merge.
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** The hull, deck, mast and the jib set before it, facing +z. */
export function hullShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), scale: [0.55, 0.32, 1.3], color: HULL },
    { geometry: new THREE.TorusGeometry(1, 0.04, 4, 24), position: [0, -0.04, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.54, 1.27, 1], color: STRIPE },
    { geometry: new THREE.CylinderGeometry(1, 1, 0.03, 16), position: [0, 0.01, 0], scale: [0.52, 1, 1.24], color: DECK },
    { geometry: new THREE.CylinderGeometry(0.035, 0.04, MAST_TOP - MAST_FOOT, 6), position: [0, (MAST_TOP + MAST_FOOT) / 2, MAST_Z], color: SPAR },
    { geometry: triangle([0, MAST_TOP - 0.45, MAST_Z + 0.02], [0, 0.2, 1.2], [0, 0.32, MAST_Z + 0.06]), color: JIB },
  ]);
}

/** The boom and the mainsail on it, hung from the mast's foot and pointing aft (-z). */
export function mainsailShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.025, 0.025, BOOM, 5), position: [0, 0.3, -BOOM / 2], rotation: [Math.PI / 2, 0, 0], color: SPAR },
    { geometry: triangle([0, 0.33, -0.03], [0, MAST_TOP - MAST_FOOT - 0.05, -0.03], [0, 0.33, -BOOM + 0.05]), color: SAIL },
  ]);
}

/** The sailor sitting out on the gunwale, facing forward. */
export function sailorShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.11, 0.14, 0.4, 8), position: [0, 0.3, 0], rotation: [0.2, 0, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.09, 10, 8), position: [0, 0.58, 0.03], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.095, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.6, 0.03], color: CAP },
  ]);
}

/** A sailing dinghy reaching back and forth on the east side of the lake in the day's `wind`. */
export function Dinghy({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  const hull = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Group>(null);
  const sailor = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ hull: hullShape(), main: mainsailShape(), sailor: sailorShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [shapes.hull, shapes.main, shapes.sailor, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = sailAt(time, wind, still);
    if (boat.current) {
      boat.current.position.set(pose.x, waterHeight(pose.x, pose.z, time) + 0.12, pose.z);
      boat.current.rotation.y = pose.yaw;
    }
    // Heeling rolls the hull, mast, sail and sailor together about the keel.
    if (hull.current) hull.current.rotation.z = pose.heel + (still ? 0 : Math.sin(time * 1.1) * 0.02);
    if (boom.current) boom.current.rotation.y = pose.boom;
    // The sailor sits out on the high side, against the heel.
    if (sailor.current) sailor.current.position.x = pose.heel > 0 ? 0.42 : -0.42;
  });
  return (
    <group ref={boat} name="dinghy">
      <group ref={hull}>
        <mesh geometry={shapes.hull} material={material} castShadow />
        <group ref={boom} position={[0, MAST_FOOT, MAST_Z]}>
          <mesh geometry={shapes.main} material={material} />
        </group>
        <group ref={sailor} position={[0.42, 0, -0.75]}>
          <mesh geometry={shapes.sailor} material={material} />
        </group>
      </group>
    </group>
  );
}
