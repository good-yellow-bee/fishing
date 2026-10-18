import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOAT_AT, ROD_BASE, ROD_LENGTH, ROD_LIFT, SEAT_AT, SEAT_YAW, brollyAt, brollyTilt, rodTip } from "./brollyFishing";
import { floatShape } from "./FogAngler";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const JACKET = "#76854a";
const TROUSERS = "#3b4033";
const BOOTS = "#2b3a2a";
const SKIN = "#d9a882";
const CHAIR = "#4a4a44";
const ROD = "#2a2622";
const CANOPY = "#3f6a45";
const RIB = "#2f4f34";
const CUP = "#c9c3b5";
/** The seat's height, and the shoulder the cup arm hangs from. */
const SEAT_Y = 0.36;
const SHOULDER: THREE.Vector3Tuple = [0.17, 0.5, 0];
/** The umbrella: planted a little behind the seat, its pole and canopy. */
const BROLLY_BACK = 0.35;
const POLE = 1.85;
const CANOPY_R = 1.3;
const LINE_POINTS = 8;
/** How far in front of the seat the rod's butt rests, and the front rest beyond it. */
const BUTT_AHEAD = Math.hypot(ROD_BASE.x - SEAT_AT.x, ROD_BASE.z - SEAT_AT.z);
const FRONT_REST = 0.75;
/** The angler drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.2;

/** The angler sitting on a low chair, facing +z, hood up: thighs out level, shins down to the wellies. */
export function brollySitterShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.4, 0.04, 0.36), position: [0, SEAT_Y - 0.02, 0.02], color: CHAIR },
    ...[-0.18, 0.18].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.015, 0.015, SEAT_Y, 4), position: [x, SEAT_Y / 2, -0.12] as const, color: CHAIR },
      { geometry: new THREE.CylinderGeometry(0.015, 0.015, SEAT_Y, 4), position: [x, SEAT_Y / 2, 0.16] as const, color: CHAIR },
    ]),
    ...[-0.08, 0.08].flatMap((x) => [
      { geometry: new THREE.BoxGeometry(0.12, 0.12, 0.38), position: [x, SEAT_Y + 0.06, 0.15] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.11, SEAT_Y, 0.12), position: [x, SEAT_Y / 2, 0.32] as const, color: BOOTS },
    ]),
  ]);
}

/** The body above the seat, in a hooded waterproof, facing +z. */
export function brollyTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.19, 0.52, 8), position: [0, 0.26, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.64, 0.02], color: SKIN },
    // The hood, up over the head and open at the face.
    { geometry: new THREE.SphereGeometry(0.125, 10, 8, Math.PI * 0.25, Math.PI * 1.5), position: [0, 0.65, 0], color: JACKET },
    // The rod hand, resting on the knee near the butt.
    { geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6), position: [-0.17, 0.32, 0.12], rotation: [0.9, 0, 0.1], color: JACKET },
  ]);
}

/** The cup arm, hanging from the shoulder, the flask cup in the hand. */
export function cupArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.4, 6), position: [0, -0.2, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.04, 6, 4), position: [0, -0.41, 0.02], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8), position: [0, -0.42, 0.07], color: CUP },
  ]);
}

/** The rod, butt at the origin, along +z, and its two rests, the back one at the butt. */
export function brollyRodShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.01, 0.022, ROD_LENGTH, 5), position: [0, 0, ROD_LENGTH / 2], rotation: [Math.PI / 2, 0, 0], color: ROD }]);
}

export function rodRestShape(height: number) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.012, 0.012, height, 4), position: [0, height / 2, 0], color: "#6a5a44" },
    { geometry: new THREE.BoxGeometry(0.1, 0.02, 0.02), position: [0, height, 0], color: "#2a2a2a" },
  ]);
}

/** The big green umbrella: its pole, and its canopy with ribs showing at the rim. */
export function brollyShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.022, 0.022, POLE + 0.25, 6), position: [0, (POLE + 0.25) / 2 - 0.2, 0], color: "#2a2a2a" },
    { geometry: new THREE.ConeGeometry(CANOPY_R, 0.48, 12, 1, true), position: [0, POLE, 0], color: CANOPY },
    { geometry: new THREE.CylinderGeometry(CANOPY_R + 0.01, CANOPY_R + 0.01, 0.05, 12, 1, true), position: [0, POLE - 0.22, 0], color: RIB },
  ]);
}

/** An angler under a big green umbrella on the far bank in the rain, the rod out on its rests (brollyFishing.ts). */
export function BrollyFisher({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const torso = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Mesh>(null);
  const shapes = useMemo(
    () => ({
      sitter: brollySitterShape(),
      torso: brollyTorsoShape(),
      arm: cupArmShape(),
      rod: brollyRodShape(),
      backRest: rodRestShape(ROD_BASE.y),
      frontRest: rodRestShape(ROD_BASE.y + FRONT_REST * Math.tan(ROD_LIFT)),
      brolly: brollyShape(),
      float: floatShape(),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINE_POINTS * 3), 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#d8d6cf", transparent: true, opacity: 0.8 }));
  }, []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, line.geometry, line.material as THREE.Material].forEach((item) => item.dispose());
    },
    [shapes, material, line],
  );
  const tilt = brollyTilt(wind);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = brollyAt(time, still);
    if (torso.current) torso.current.rotation.x = pose.lean * 0.4;
    // The cup comes up from the lap to the lips: the arm swings forward and up, the elbow in.
    if (arm.current) arm.current.rotation.x = -(0.5 + pose.sip * 1.9);
    if (rod.current) rod.current.rotation.x = -(ROD_LIFT - pose.nod);
    const tip = rodTip(pose.nod);
    const y = waterHeight(FLOAT_AT.x, FLOAT_AT.z, still ? 0 : time) - pose.dip;
    bob.current?.position.set(FLOAT_AT.x, y, FLOAT_AT.z);
    // The line runs from the rod tip down to the float, sagging a little.
    const span = Math.hypot(FLOAT_AT.x - tip.x, FLOAT_AT.z - tip.z);
    const points = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < LINE_POINTS; i += 1) {
      const s = i / (LINE_POINTS - 1);
      points.setXYZ(i, tip.x + (FLOAT_AT.x - tip.x) * s, tip.y + (y - tip.y) * s - 0.06 * span * Math.sin(Math.PI * s), tip.z + (FLOAT_AT.z - tip.z) * s);
    }
    points.needsUpdate = true;
  });
  return (
    <group name="brolly-fisher">
      <group position={[SEAT_AT.x, 0, SEAT_AT.z]} rotation={[0, SEAT_YAW, 0]}>
        <group scale={SCALE}>
          <mesh geometry={shapes.sitter} material={material} castShadow />
          <group ref={torso} position={[0, SEAT_Y, -0.02]}>
            <mesh geometry={shapes.torso} material={material} castShadow />
            <group ref={arm} position={SHOULDER}>
              <mesh geometry={shapes.arm} material={material} />
            </group>
          </group>
        </group>
        <mesh geometry={shapes.backRest} material={material} position={[0, 0, BUTT_AHEAD]} />
        <mesh geometry={shapes.frontRest} material={material} position={[0, 0, BUTT_AHEAD + FRONT_REST]} />
        <group ref={rod} position={[0, ROD_BASE.y, BUTT_AHEAD]}>
          <mesh geometry={shapes.rod} material={material} />
        </group>
      </group>
      {/* The umbrella stands in the world's frame, tipped into the wind. */}
      <mesh geometry={shapes.brolly} material={material} position={[SEAT_AT.x - Math.sin(SEAT_YAW) * BROLLY_BACK, 0, SEAT_AT.z - Math.cos(SEAT_YAW) * BROLLY_BACK]} rotation={[tilt.z, 0, -tilt.x]} castShadow />
      <mesh ref={bob} geometry={shapes.float} material={material} />
      <primitive object={line} frustumCulled={false} />
    </group>
  );
}
