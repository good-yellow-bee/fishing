import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { BAT_COUNT, batAt, lampMoths, lampSwoopAt } from "./batFlight";
import { useReducedMotion } from "./reducedMotion";

/** Meters wingtip to wingtip, drawn larger than life so the silhouettes read at a distance. */
const BAT_SPAN = 0.95;
/** Radians the wings swing up and down through a beat. */
const FLAP_SWING = 0.9;
const BAT_COLOR = "#231c22";

/** One wing, a scalloped triangle reaching out along +x from the body. */
function makeWing() {
  const half = BAT_SPAN / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.08);
  shape.lineTo(half, 0.04);
  shape.lineTo(half * 0.78, -0.07);
  shape.lineTo(half * 0.55, -0.03);
  shape.lineTo(half * 0.32, -0.09);
  shape.lineTo(0, -0.06);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  // Lay it flat, front edge toward +z, the way the pose's yaw faces.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** A few bats flickering low over the water in front of the dock; motion lives in batFlight.ts. Bodies and wings are one instanced mesh apiece: two draws. */
export function Bats() {
  const still = useReducedMotion();
  const wing = useMemo(makeWing, []);
  const body = useMemo(() => new THREE.SphereGeometry(1, 8, 6).scale(0.05, 0.05, 0.09), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: BAT_COLOR, side: THREE.DoubleSide }), []);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ root: new THREE.Matrix4(), part: new THREE.Matrix4(), turn: new THREE.Euler(), quat: new THREE.Quaternion(), at: new THREE.Vector3(), one: new THREE.Vector3(1, 1, 1), mirror: new THREE.Vector3(-1, 1, 1), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }), []);
  useEffect(
    () => () => {
      [wing, body, material].forEach((item) => item.dispose());
    },
    [wing, body, material],
  );
  // The second bat's visits to the headlamp's moths, eased so it never jumps when the lamp goes on or off, and held on where they last were.
  const lampVisit = useRef({ weight: 0, x: 0, y: 0, z: 0 });
  useFrame((state, delta) => {
    const visit = lampVisit.current;
    if (lampMoths.on) {
      visit.x = lampMoths.x;
      visit.y = lampMoths.y;
      visit.z = lampMoths.z;
    }
    const target = still ? 0 : lampSwoopAt(state.clock.elapsedTime, lampMoths);
    visit.weight += (target - visit.weight) * (1 - Math.exp(-3 * Math.min(delta, 0.1)));
    const [bodyMesh, wingMesh] = [bodies.current, wings.current];
    if (!bodyMesh || !wingMesh) return;
    for (let index = 0; index < BAT_COUNT; index += 1) {
      // Lite effects keep the first half of the colony.
      if (settings.particles === "lite" && index >= BAT_COUNT / 2) {
        bodyMesh.setMatrixAt(index, scratch.hidden);
        wingMesh.setMatrixAt(index * 2, scratch.hidden);
        wingMesh.setMatrixAt(index * 2 + 1, scratch.hidden);
        continue;
      }
      const pose = batAt(index, state.clock.elapsedTime, still, index === 1 ? lampVisit.current.weight : 0, lampVisit.current);
      scratch.turn.set(0, pose.yaw, 0);
      scratch.root.compose(scratch.at.set(pose.x, pose.y, pose.z), scratch.quat.setFromEuler(scratch.turn), scratch.one);
      bodyMesh.setMatrixAt(index, scratch.root);
      const swing = pose.flap * FLAP_SWING;
      // The right wing as drawn, the left its mirror, each swung about the body's line.
      [1, -1].forEach((side, w) => {
        scratch.turn.set(0, 0, side * swing);
        scratch.part.compose(scratch.at.set(0, 0, 0), scratch.quat.setFromEuler(scratch.turn), side === 1 ? scratch.one : scratch.mirror);
        wingMesh.setMatrixAt(index * 2 + w, scratch.part.premultiply(scratch.root));
      });
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    wingMesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      {/* The bats flit about the lake, so they are never culled by a stale bound. */}
      <instancedMesh ref={bodies} args={[body, material, BAT_COUNT]} frustumCulled={false} />
      <instancedMesh ref={wings} args={[wing, material, BAT_COUNT * 2]} frustumCulled={false} />
    </>
  );
}
