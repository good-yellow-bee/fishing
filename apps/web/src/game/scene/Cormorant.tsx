import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lastSplash } from "./duckFlush";
import { mergePainted } from "./mergeParts";
import { CORMORANT_ROCK, cormorantPose, cormorantStartle } from "./cormorantPerch";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const BLACK = "#1d2120";
const SHEEN = "#2c3a33";
const THROAT = "#d9b25a";
const BILL = "#5b5a52";
/** A touch larger than life, so its shape reads from the dock. */
const SCALE = 1.6;

/** The body, tail, neck, head, throat and bill never move apart, nor do a wing's arm and drooping hand, so each bakes into one shape. */
export function cormorantShapes() {
  const wing = (side: 1 | -1) =>
    mergePainted([
      // Hinged at the shoulder: folded it lies along the flank, opened it hangs out like a cloak drying.
      { geometry: new THREE.BoxGeometry(0.3, 0.2, 0.025), position: [side * 0.15, 0, -0.02], rotation: [0, 0, side * 0.25], color: SHEEN },
      // The hand droops from the wrist, so the open wings read as a hung-out "W".
      { geometry: new THREE.BoxGeometry(0.22, 0.17, 0.02), position: [side * 0.37, -0.02, -0.02], rotation: [0, 0, side * -0.6], color: BLACK },
    ]);
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.25, 0], scale: [0.1, 0.17, 0.09], color: BLACK },
      // Stiff tail, propped behind.
      { geometry: new THREE.BoxGeometry(1, 1, 1), position: [0, 0.09, -0.1], rotation: [-0.5, 0, 0], scale: [0.05, 0.12, 0.02], color: BLACK },
      { geometry: new THREE.CylinderGeometry(0.032, 0.045, 0.2, 8), position: [0, 0.45, 0.04], rotation: [0.25, 0, 0], color: BLACK },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.56, 0.06], scale: [0.045, 0.045, 0.06], color: BLACK },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.545, 0.1], scale: 0.03, color: THROAT },
      { geometry: new THREE.ConeGeometry(0.014, 0.1, 6), position: [0, 0.555, 0.15], rotation: [Math.PI / 2, 0, 0], color: BILL },
    ]),
    left: wing(1),
    right: wing(-1),
  };
}

/** A cormorant drying its wings on a rock in the far water, slipping in to fish now and then; motion lives in cormorantPerch.ts. */
export function Cormorant() {
  const bird = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([null, null]);
  const shift = useRef(0);
  const spread = useRef(0);
  const shapes = useMemo(cormorantShapes, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.left, shapes.right, material].forEach((thing) => thing.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }, delta) => {
    const group = bird.current;
    if (!group) return;
    const time = clock.elapsedTime;
    shift.current = cormorantStartle(time, shift.current, lastSplash);
    const pose = cormorantPose(time + shift.current);
    const surface = pose.swimming ? waterHeight(pose.x, pose.z, time) : 0;
    group.visible = pose.under < 1;
    group.position.set(pose.x, pose.y + surface - (pose.swimming ? 0.18 : 0) - pose.under * 0.4, pose.z);
    group.rotation.set(pose.under * 0.7, pose.yaw, 0, "YXZ");
    // Upright on the rock; on the water it lies forward, low, with the neck up.
    if (body.current) body.current.rotation.x = pose.swimming ? 0.5 : 0.1;
    // Eased, so a startled bird snaps its wings shut quickly rather than in one frame.
    spread.current += (pose.spread - spread.current) * Math.min(1, delta * 10);
    wings.current.forEach((wing, i) => {
      if (!wing) return;
      const side = i === 0 ? 1 : -1;
      // Folded: swung back along the flank. Open: out to the side and a little up.
      wing.rotation.set(0, side * (1 - spread.current) * 1.35, side * spread.current * 0.35);
    });
  });
  return (
    <group ref={bird} name="cormorant" position={[CORMORANT_ROCK.x, 0, CORMORANT_ROCK.z]} scale={SCALE}>
      <group ref={body}>
        <mesh geometry={shapes.body} material={material} />
        <group ref={(g) => void (wings.current[0] = g)} position={[0.07, 0.3, -0.02]}>
          <mesh geometry={shapes.left} material={material} />
        </group>
        <group ref={(g) => void (wings.current[1] = g)} position={[-0.07, 0.3, -0.02]}>
          <mesh geometry={shapes.right} material={material} />
        </group>
      </group>
    </group>
  );
}
