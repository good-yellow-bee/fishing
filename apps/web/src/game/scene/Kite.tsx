import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HANDS_Y, TAIL_BOWS, kiteAt, kiteFlyer, kiteTail } from "./kiteFlight";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const SHIRT = "#3f8fce";
const SHORTS = "#e0c35a";
const SKIN = "#e2b48c";
const HAIR = "#6b4128";
const REEL = "#8a6a48";
const KITE_A = "#d8443a";
const KITE_B = "#f2c84b";
const SPAR = "#6b4f33";
const STRING = "#f4f1e8";
const BOWS = ["#d8443a", "#3f8fce", "#f2c84b"];
/** Points along the string, so it can sag a little. */
const STRING_POINTS = 10;

/** The child, facing +z with both hands held out holding the reel. */
export function flyerShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), position: [-0.07, 0.21, 0], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), position: [0.07, 0.21, 0], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.13, 0.12, 0.16, 8), position: [0, 0.48, 0], color: SHORTS },
    { geometry: new THREE.CylinderGeometry(0.11, 0.13, 0.36, 8), position: [0, 0.72, 0], color: SHIRT },
    { geometry: new THREE.SphereGeometry(0.11, 10, 8), position: [0, 1.01, 0], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 1.03, -0.01], color: HAIR },
    { geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), position: [-0.1, 0.86, 0.15], rotation: [1.25, 0, 0.2], color: SHIRT },
    { geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), position: [0.1, 0.86, 0.15], rotation: [1.25, 0, -0.2], color: SHIRT },
    { geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), position: [0, HANDS_Y - 0.03, 0.3], rotation: [0, 0, Math.PI / 2], color: REEL },
  ]);
}

function painted(points: THREE.Vector3Tuple[], color: string) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  // The same attributes as the built-in shapes, so they merge.
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(points.flatMap(() => [0, 0]), 2));
  geometry.computeVertexNormals();
  return { geometry, color };
}

/** The diamond kite in its own plane (x across, y up), facing +z, its four panels in two colours, with its cross spars. */
export function kiteShape() {
  const top: THREE.Vector3Tuple = [0, 0.5, 0];
  const bottom: THREE.Vector3Tuple = [0, -0.62, 0];
  const left: THREE.Vector3Tuple = [-0.38, 0.12, 0];
  const right: THREE.Vector3Tuple = [0.38, 0.12, 0];
  const middle: THREE.Vector3Tuple = [0, 0.12, 0.04];
  return mergePainted([
    painted([top, left, middle], KITE_A),
    painted([top, middle, right], KITE_B),
    painted([left, bottom, middle], KITE_B),
    painted([middle, bottom, right], KITE_A),
    { geometry: new THREE.BoxGeometry(0.02, 1.12, 0.02), position: [0, -0.06, 0.03], color: SPAR },
    { geometry: new THREE.BoxGeometry(0.76, 0.02, 0.02), position: [0, 0.12, 0.03], color: SPAR },
  ]);
}

/** A child on the upwind bank flying a kite out over the lake on a breezy day. */
export function Kite({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const child = useRef<THREE.Group>(null);
  const kite = useRef<THREE.Group>(null);
  const bows = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ flyer: flyerShape(), kite: kiteShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const lines = useMemo(() => {
    const string = new THREE.BufferGeometry();
    string.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STRING_POINTS * 3), 3));
    const tail = new THREE.BufferGeometry();
    tail.setAttribute("position", new THREE.BufferAttribute(new Float32Array((TAIL_BOWS + 1) * 3), 3));
    return { string, tail, material: new THREE.LineBasicMaterial({ color: STRING }) };
  }, []);
  const string = useMemo(() => new THREE.Line(lines.string, lines.material), [lines]);
  const tail = useMemo(() => new THREE.Line(lines.tail, lines.material), [lines]);
  const bow = useMemo(() => new THREE.BoxGeometry(0.14, 0.06, 0.02), []);
  const bowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff" }), []);
  useEffect(
    () => () => {
      [shapes.flyer, shapes.kite, material, lines.string, lines.tail, lines.material, bow, bowMaterial].forEach((item) => item.dispose());
    },
    [shapes, material, lines, bow, bowMaterial],
  );
  useEffect(() => {
    const mesh = bows.current;
    if (!mesh) return;
    for (let i = 0; i < TAIL_BOWS; i += 1) mesh.setColorAt(i, new THREE.Color(BOWS[i % BOWS.length]!));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const flyer = kiteFlyer(wind);
    const at = kiteAt(time, wind, still);
    const yaw = Math.atan2(at.x - flyer.x, at.z - flyer.z);
    // The reel, held out in front of the child toward the kite.
    const hands = { x: flyer.x + Math.sin(yaw) * 0.3, y: HANDS_Y, z: flyer.z + Math.cos(yaw) * 0.3 };
    if (child.current) {
      child.current.position.set(flyer.x, 0, flyer.z);
      child.current.rotation.y = yaw;
    }
    if (kite.current) {
      kite.current.position.set(at.x, at.y, at.z);
      // Its face turned to the child, rocking a little as it swoops.
      kite.current.lookAt(hands.x, hands.y, hands.z);
      kite.current.rotateZ(still ? 0 : Math.sin(time * 0.47) * 0.35);
    }
    const sag = 0.035 * Math.hypot(at.x - hands.x, at.y - hands.y, at.z - hands.z);
    const stringAt = lines.string.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < STRING_POINTS; i += 1) {
      const s = i / (STRING_POINTS - 1);
      stringAt.setXYZ(i, hands.x + (at.x - hands.x) * s, hands.y + (at.y - hands.y) * s - sag * Math.sin(Math.PI * s), hands.z + (at.z - hands.z) * s);
    }
    stringAt.needsUpdate = true;
    const tailAt = lines.tail.getAttribute("position") as THREE.BufferAttribute;
    // The tail hangs from the kite's bottom point.
    tailAt.setXYZ(0, at.x, at.y - 0.55, at.z);
    kiteTail(time, wind, still).forEach((point, i) => {
      tailAt.setXYZ(i + 1, point.x, point.y - 0.55, point.z);
      if (bows.current) {
        scratch.position.set(point.x, point.y - 0.55, point.z);
        scratch.rotation.set(0, yaw, 0);
        scratch.updateMatrix();
        bows.current.setMatrixAt(i, scratch.matrix);
      }
    });
    tailAt.needsUpdate = true;
    if (bows.current) bows.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="kite">
      <group ref={child}>
        <mesh geometry={shapes.flyer} material={material} castShadow />
      </group>
      <group ref={kite}>
        <mesh geometry={shapes.kite} material={material} />
      </group>
      <primitive object={string} frustumCulled={false} />
      <primitive object={tail} frustumCulled={false} />
      <instancedMesh ref={bows} args={[bow, bowMaterial, TAIL_BOWS]} frustumCulled={false} />
    </group>
  );
}
