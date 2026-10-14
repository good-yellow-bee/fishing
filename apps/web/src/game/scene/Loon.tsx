import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pitchTurn } from "./bodyPitch";
import { fx, onLoonCall } from "../fx";
import { loonCallLift, loonPose, soundPlace } from "./loonMotion";
import { mergePainted } from "./mergeParts";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const BODY = "#1b1f22";
const HEAD = "#16241f";
const WHITE = "#e9ece6";

const EYE = "#b3261e";

/** The body and its white flank bake into one shape, and the neck, collar, head, bill and eyes into another, hinged at the neck's base. */
export function loonShapes() {
  return {
    // Long low body, white below the waterline peeking at the sides.
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.08, 0], scale: [0.2, 0.13, 0.42], color: BODY },
      { geometry: new THREE.SphereGeometry(1, 12, 6), position: [0, 0.02, 0.02], scale: [0.21, 0.07, 0.38], color: WHITE },
    ]),
    neck: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.1, 0.02], scale: [0.07, 0.13, 0.07], color: HEAD },
      { geometry: new THREE.TorusGeometry(0.068, 0.012, 6, 14), position: [0, 0.1, 0.03], rotation: [Math.PI / 2, 0, 0], color: WHITE },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.22, 0.06], scale: 0.085, color: HEAD },
      { geometry: new THREE.ConeGeometry(0.024, 0.13, 6), position: [0, 0.215, 0.19], rotation: [Math.PI / 2, 0, 0], color: BODY },
      { geometry: new THREE.SphereGeometry(1, 6, 5), position: [0.06, 0.235, 0.1], scale: 0.014, color: EYE },
      { geometry: new THREE.SphereGeometry(1, 6, 5), position: [-0.06, 0.235, 0.1], scale: 0.014, color: EYE },
    ]),
  };
}

/** The loon whose call carries across the lake: paddles a slow loop on open water, dives, and comes up elsewhere. */
export function Loon() {
  const group = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const calledAt = useRef(-Infinity);
  const shapes = useMemo(loonShapes, []);
  const painted = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.neck, painted].forEach((thing) => thing.dispose());
    },
    [shapes, painted],
  );
  const clock = useRef(0);
  const right = useMemo(() => new THREE.Vector3(), []);
  const lastPlace = useRef(0);

  // The call raises its head; the time comes from the frame clock, so read it there.
  useEffect(() => onLoonCall(() => (calledAt.current = clock.current)), []);

  useFrame((state) => {
    const loon = group.current;
    if (!loon) return;
    const time = state.clock.elapsedTime;
    clock.current = time;
    const pose = loonPose(time);
    const surface = waterHeight(pose.x, pose.z, time);
    loon.visible = pose.under < 1;
    loon.position.set(pose.x, surface - pose.under * 0.35, pose.z);
    loon.rotation.set(pitchTurn(pose.pitch), pose.yaw, 0, "YXZ");
    if (neck.current) neck.current.rotation.x = -0.55 * loonCallLift(time - calledAt.current);
    if (ring.current && ringMaterial.current) {
      ring.current.visible = pose.ring >= 0;
      if (pose.ring >= 0) {
        ring.current.position.set(pose.x, surface + 0.03, pose.z);
        ring.current.scale.setScalar(0.4 + pose.ring * 1.6);
        ringMaterial.current.opacity = (1 - pose.ring) * 0.45;
      }
    }
    // Twice a second is plenty for where the call should come from.
    if (time - lastPlace.current > 0.5) {
      lastPlace.current = time;
      right.set(1, 0, 0).applyQuaternion(state.camera.quaternion);
      const place = soundPlace(state.camera.position, right, pose.x, pose.z);
      fx.ambient.setLoonPlace(place.pan, place.gain);
    }
  });

  return (
    <>
      <group ref={group} name="loon" scale={1.35}>
        <mesh geometry={shapes.body} material={painted} />
        {/* Hinged at the base of the neck, so a call tips the head back. */}
        <group ref={neck} position={[0, 0.14, 0.3]}>
          <mesh geometry={shapes.neck} material={painted} />
        </group>
      </group>
      <group ref={ring} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.44, 24]} />
          <meshBasicMaterial ref={ringMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}
