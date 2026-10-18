import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { canoeAt } from "./canoeTrip";
import { mergePainted } from "./mergeParts";
import { toonRamp } from "./toon";
import { ToonModel } from "./ToonModel";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const CANOE_URL = "/models/canoe.glb";
const JACKET = "#c8562e";
const TROUSERS = "#3d4a5a";
const SKIN = "#e2b48c";
const HAT = "#e3cf6a";
const WOOD = "#a8743e";
/** How high the paddler's seat sits above the waterline, and the shoulder above the seat. */
const SEAT_Y = 0.12;
const SHOULDER_Y = 0.52;

/** The paddler sitting in the middle of the canoe, facing +z (the bow). */
export function paddlerShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.3, 0.12, 0.42), position: [0, SEAT_Y + 0.06, 0.12], color: TROUSERS },
    { geometry: new THREE.CylinderGeometry(0.13, 0.16, 0.46, 8), position: [0, SEAT_Y + 0.3, -0.02], rotation: [0.15, 0, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, SEAT_Y + 0.64, 0.02], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.11, 0.12, 0.07, 10), position: [0, SEAT_Y + 0.72, 0.02], color: HAT },
    { geometry: new THREE.CylinderGeometry(0.17, 0.17, 0.015, 12), position: [0, SEAT_Y + 0.69, 0.04], color: HAT },
  ]);
}

/** The paddle, hung from its grip: the shaft runs down from the hands and the blade is at the bottom. */
export function paddleShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.018, 0.018, 1.15, 5), position: [0, -0.35, 0], color: WOOD },
    { geometry: new THREE.BoxGeometry(0.06, 0.06, 0.1), position: [0, 0.22, 0], color: WOOD },
    { geometry: new THREE.BoxGeometry(0.03, 0.42, 0.16), position: [0, -1.0, 0], color: WOOD },
  ]);
}

/** Someone out for a paddle along the far shore on a fine day. */
export function Canoeist() {
  const still = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  const paddle = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ paddler: paddlerShape(), paddle: paddleShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shapes.paddler.dispose();
      shapes.paddle.dispose();
      material.dispose();
    },
    [shapes, material],
  );
  useFrame((state) => {
    const time = still ? 40 : state.clock.elapsedTime;
    const pose = canoeAt(time);
    const hull = boat.current;
    if (hull) {
      hull.position.set(pose.x, waterHeight(pose.x, pose.z, time), pose.z);
      hull.rotation.y = pose.yaw;
      // A paddler's pull rocks the canoe a touch toward the blade.
      hull.rotation.z = pose.side * 0.03 * (1 - Math.abs(pose.stroke));
    }
    const arm = paddle.current;
    if (arm) {
      arm.position.x = -pose.side * 0.24;
      // Reach forward, pull back past the hip, lifting the blade out as it comes forward again.
      arm.rotation.x = pose.stroke * 0.6;
      arm.rotation.z = -pose.side * 0.22;
    }
  });
  return (
    <group ref={boat} name="canoeist">
      <ToonModel url={CANOE_URL} scale={2.6} shadows={false} />
      <mesh geometry={shapes.paddler} material={material} />
      <group ref={paddle} position={[0, SEAT_Y + SHOULDER_Y - 0.12, 0.08]}>
        <mesh geometry={shapes.paddle} material={material} />
      </group>
    </group>
  );
}
