import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dogAt, walkerAt } from "./dogWalk";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const JACKET = "#4f7a4a";
const TROUSERS = "#4a4038";
const SKIN = "#e2b48c";
const CAP = "#8c3b32";
const BOOTS = "#3a2e26";
const COAT = "#a8743f";
const BIB = "#efe6d6";
const NOSE = "#2a2420";
/** The walker's hips and shoulders, and their legs' length. */
const HIP_Y = 0.86;
const LEG = 0.84;
const SHOULDER_Y = 0.56;
const LEG_SWING = 0.38;
const ARM_SWING = 0.45;
/** The dog: its hips' height, its legs, and where its four feet are. */
const DOG_HIP_Y = 0.27;
const DOG_LEG = 0.25;
const DOG_FEET: [number, number][] = [
  [0.075, 0.17],
  [-0.075, 0.17],
  [0.075, -0.17],
  [-0.075, -0.17],
];

/** The walker's body above the hips, with head and cap, facing +z. */
export function walkerTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.17, 0.62, 8), position: [0, 0.31, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.11, 10, 8), position: [0, 0.76, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.115, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.79, 0], color: CAP },
    { geometry: new THREE.CylinderGeometry(0.09, 0.09, 0.015, 10, 1, false, -Math.PI / 2, Math.PI), position: [0, 0.79, 0.07], color: CAP },
  ]);
}

/** One of the walker's legs, hung from the hip, with its boot. */
export function walkerLegShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.065, 0.055, LEG, 6), position: [0, -LEG / 2, 0], color: TROUSERS },
    { geometry: new THREE.BoxGeometry(0.1, 0.07, 0.18), position: [0, -LEG + 0.035, 0.04], color: BOOTS },
  ]);
}

/** One of the walker's arms, hung from the shoulder. */
export function walkerArmShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.05, 0.045, 0.52, 6), position: [0, -0.26, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.045, 6, 4), position: [0, -0.54, 0], color: SKIN },
  ]);
}

/** The dog's body, facing +z, with a pale bib on its chest. */
export function dogBodyShape() {
  return mergePainted([
    { geometry: new THREE.CapsuleGeometry(0.1, 0.32, 4, 8), position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], color: COAT },
    { geometry: new THREE.SphereGeometry(0.085, 8, 6), position: [0, -0.02, 0.17], color: BIB },
  ]);
}

/** The dog's head, from the neck, with its muzzle, nose and floppy ears, looking along +z. */
export function dogHeadShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.055, 0.07, 0.14, 6), position: [0, 0.05, 0.02], rotation: [0.6, 0, 0], color: COAT },
    { geometry: new THREE.SphereGeometry(0.085, 8, 6), position: [0, 0.12, 0.08], color: COAT },
    { geometry: new THREE.BoxGeometry(0.08, 0.07, 0.12), position: [0, 0.09, 0.17], color: COAT },
    { geometry: new THREE.SphereGeometry(0.022, 6, 4), position: [0, 0.11, 0.235], color: NOSE },
    { geometry: new THREE.BoxGeometry(0.03, 0.1, 0.06), position: [0.08, 0.1, 0.06], rotation: [0, 0, 0.3], color: "#7a5230" },
    { geometry: new THREE.BoxGeometry(0.03, 0.1, 0.06), position: [-0.08, 0.1, 0.06], rotation: [0, 0, -0.3], color: "#7a5230" },
  ]);
}

/** One of the dog's legs, hung from its hip or shoulder. */
export function dogLegShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.028, 0.024, DOG_LEG, 5), position: [0, -DOG_LEG / 2, 0], color: COAT }]);
}

/** The dog's tail, from its root, curving up and back. */
export function dogTailShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.015, 0.03, 0.2, 5), position: [0, 0.08, -0.06], rotation: [-0.7, 0, 0], color: COAT }]);
}

/** Someone walking their dog along the far bank, the dog running on ahead, nosing about and running on again. */
export function DogWalker() {
  const still = useReducedMotion();
  const walker = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const legs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const dog = useRef<THREE.Group>(null);
  const dogBody = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const paws = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shapes = useMemo(
    () => ({
      torso: walkerTorsoShape(),
      leg: walkerLegShape(),
      arm: walkerArmShape(),
      dog: dogBodyShape(),
      head: dogHeadShape(),
      paw: dogLegShape(),
      tail: dogTailShape(),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const person = walkerAt(time, still);
    if (walker.current) {
      walker.current.position.set(person.x, 0, person.z);
      walker.current.rotation.y = person.yaw;
    }
    const dip = 0.03 * (1 - Math.abs(person.stride));
    if (upper.current) upper.current.position.y = HIP_Y - dip;
    [1, -1].forEach((side, i) => {
      const swing = person.stride * side * LEG_SWING;
      const leg = legs[i]!.current;
      if (leg) {
        leg.rotation.x = -swing;
        leg.position.y = HIP_Y - dip;
      }
      const arm = arms[i]!.current;
      if (arm) arm.rotation.x = swing * (ARM_SWING / LEG_SWING);
    });
    const pup = dogAt(time, still);
    if (dog.current) {
      dog.current.position.set(pup.x, 0, pup.z);
      dog.current.rotation.y = pup.yaw;
    }
    const reach = 0.35 + 0.35 * pup.run;
    if (dogBody.current) {
      // Bounding along when it runs, and dipping its shoulders to the ground to sniff.
      dogBody.current.position.y = DOG_HIP_Y + 0.04 + (still ? 0 : Math.abs(pup.stride) * 0.035 * pup.run);
      dogBody.current.rotation.x = 0.12 * pup.sniff;
    }
    if (head.current) head.current.rotation.x = -0.25 + 1.05 * pup.sniff;
    if (tail.current) tail.current.rotation.z = still ? 0 : Math.sin(time * (pup.sniff > 0.5 ? 16 : 9)) * 0.5;
    paws.forEach((paw, i) => {
      // A trot: each front leg moves with the back leg on the other side.
      const pair = i === 0 || i === 3 ? 1 : -1;
      if (paw.current) paw.current.rotation.x = -pup.stride * pair * reach * (1 - pup.sniff * 0.8);
    });
  });
  return (
    <group name="dog-walker">
      <group ref={walker}>
        <group ref={upper} position={[0, HIP_Y, 0]}>
          <mesh geometry={shapes.torso} material={material} castShadow />
          {[1, -1].map((side, i) => (
            <group key={side} ref={arms[i]} position={[side * 0.2, SHOULDER_Y, 0]}>
              <mesh geometry={shapes.arm} material={material} />
            </group>
          ))}
        </group>
        {[1, -1].map((side, i) => (
          <group key={side} ref={legs[i]} position={[side * 0.09, HIP_Y, 0]}>
            <mesh geometry={shapes.leg} material={material} />
          </group>
        ))}
      </group>
      <group ref={dog} scale={1.25}>
        <group ref={dogBody} position={[0, DOG_HIP_Y + 0.04, 0]}>
          <mesh geometry={shapes.dog} material={material} castShadow />
          <group ref={head} position={[0, 0.04, 0.22]}>
            <mesh geometry={shapes.head} material={material} />
          </group>
          <group ref={tail} position={[0, 0.05, -0.24]}>
            <mesh geometry={shapes.tail} material={material} />
          </group>
        </group>
        {DOG_FEET.map(([x, z], i) => (
          <group key={i} ref={paws[i]} position={[x, DOG_HIP_Y, z]}>
            <mesh geometry={shapes.paw} material={material} />
          </group>
        ))}
      </group>
    </group>
  );
}
