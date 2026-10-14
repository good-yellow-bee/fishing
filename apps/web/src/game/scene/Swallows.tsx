import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { SWALLOW_COUNT, swallowAt } from "./swallowFlight";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";

const BACK = "#22305a";
const BELLY = "#f1ece0";
/** Drawn larger than life so the birds read as they sweep across the far water. */
const SWALLOW_SCALE = 2.4;
/** Radians the wings swing through a beat. */
const FLAP_SWING = 0.6;

/** One swept-back wing reaching out along +x from the shoulder, front edge toward +z. */
function makeWing() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.03);
  shape.lineTo(0.16, -0.05);
  shape.lineTo(0.2, -0.09);
  shape.lineTo(0.1, -0.05);
  shape.lineTo(0, -0.03);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** The forked tail: two thin streamers behind the body. */
function makeTail() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.035, -0.11);
  shape.lineTo(0.012, -0.05);
  shape.lineTo(0, -0.04);
  shape.lineTo(-0.012, -0.05);
  shape.lineTo(-0.035, -0.11);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** A bird's body, belly and tail baked into one shape, coloured per vertex so all of them share one draw. */
export function swallowBody() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 8, 6), scale: [0.022, 0.02, 0.06], color: BACK },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.006, 0.005], scale: [0.018, 0.015, 0.045], color: BELLY },
    { geometry: makeTail(), position: [0, 0, -0.045], color: BACK },
  ]);
}

/**
 * Swallows sweeping low over the lake on warm, still summer days; motion lives in swallowFlight.ts.
 * Every body is one instanced draw and every wing another.
 */
export function Swallows() {
  const still = useReducedMotion();
  const parts = useMemo(
    () => ({
      body: swallowBody(),
      wing: makeWing(),
      bodyMaterial: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
      wingMaterial: new THREE.MeshBasicMaterial({ color: BACK, side: THREE.DoubleSide }),
    }),
    [],
  );
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const work = useMemo(
    () => ({
      place: new THREE.Matrix4(),
      hinge: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
      rightShoulder: new THREE.Matrix4().makeTranslation(0.012, 0.004, 0.01),
      leftShoulder: new THREE.Matrix4().makeTranslation(-0.012, 0.004, 0.01),
      mirror: new THREE.Matrix4().makeScale(-1, 1, 1),
      at: new THREE.Vector3(),
      turn: new THREE.Quaternion(),
      euler: new THREE.Euler(0, 0, 0, "YXZ"),
      size: new THREE.Vector3().setScalar(SWALLOW_SCALE),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(parts).forEach((thing) => thing.dispose());
    },
    [parts],
  );
  useFrame((state) => {
    const count = settings.particles === "lite" ? SWALLOW_COUNT / 2 : SWALLOW_COUNT;
    for (let i = 0; i < count; i += 1) {
      const pose = swallowAt(i, state.clock.elapsedTime, still);
      work.at.set(pose.x, pose.y, pose.z);
      work.turn.setFromEuler(work.euler.set(0, pose.yaw, pose.bank, "YXZ"));
      work.place.compose(work.at, work.turn, work.size);
      bodies.current?.setMatrixAt(i, work.place);
      const swing = pose.flap * FLAP_SWING;
      // The right wing swings round +z from its shoulder; the left is its mirror, swinging the other way.
      wings.current?.setMatrixAt(i * 2, work.out.multiplyMatrices(work.place, work.rightShoulder).multiply(work.hinge.makeRotationZ(swing)));
      wings.current?.setMatrixAt(
        i * 2 + 1,
        work.out.multiplyMatrices(work.place, work.leftShoulder).multiply(work.hinge.makeRotationZ(-swing)).multiply(work.mirror),
      );
    }
    if (bodies.current) {
      bodies.current.count = count;
      bodies.current.instanceMatrix.needsUpdate = true;
    }
    if (wings.current) {
      wings.current.count = count * 2;
      wings.current.instanceMatrix.needsUpdate = true;
    }
  });
  // They sweep the whole lake, so the instances' combined bounds would need refitting each frame; two draws are cheap.
  return (
    <group name="swallows">
      <instancedMesh ref={bodies} args={[parts.body, parts.bodyMaterial, SWALLOW_COUNT]} frustumCulled={false} />
      <instancedMesh ref={wings} args={[parts.wing, parts.wingMaterial, SWALLOW_COUNT * 2]} frustumCulled={false} />
    </group>
  );
}
