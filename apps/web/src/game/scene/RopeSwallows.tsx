import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { liveRopePoint, liveRopes } from "./mooringRope";
import { useReducedMotion } from "./reducedMotion";
import { PERCH_LIFT, PERCH_ROPE, SWALLOW_COUNT, flushedOff, ropeSwallowAt } from "./swallowPerch";
import { makeWing, swallowBody } from "./Swallows";

const BACK = "#22305a";
/** A little larger than life, so they read on the rope from the dock camera. */
const SCALE = 2.2;
/** Radians the wings swing through a beat. */
const FLAP_SWING = 0.7;
/** Sat up on the rope, nose raised and tail down. */
const PERCH_PITCH = -0.45;

/**
 * Swallows that now and then perch in a row on the moored rowboat's bow line (swallowPerch.ts),
 * riding the rope as PlayerBoat lays it, and bursting off it if the boat is untied under them.
 * Every body is one instanced draw and every wing another.
 */
export function RopeSwallows() {
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
      fold: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
      rightShoulder: new THREE.Matrix4().makeTranslation(0.012, 0.004, 0.01),
      leftShoulder: new THREE.Matrix4().makeTranslation(-0.012, 0.004, 0.01),
      mirror: new THREE.Matrix4().makeScale(-1, 1, 1),
      hidden: new THREE.Matrix4().makeScale(0, 0, 0),
      at: new THREE.Vector3(),
      turn: new THREE.Quaternion(),
      euler: new THREE.Euler(0, 0, 0, "YXZ"),
      size: new THREE.Vector3().setScalar(SCALE),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(parts).forEach((thing) => thing.dispose());
    },
    [parts],
  );
  // Where each bird last was on or near the rope, and when the boat was untied under them (null while it is tied up).
  const flush = useMemo(() => ({ last: Array.from({ length: SWALLOW_COUNT }, () => new THREE.Vector3()), seen: new Array<boolean>(SWALLOW_COUNT).fill(false), at: null as number | null }), []);
  useFrame((state) => {
    const body = bodies.current;
    const wing = wings.current;
    if (!body || !wing) return;
    const time = state.clock.elapsedTime;
    if (liveRopes.up) flush.at = null;
    else if (flush.at === null) flush.at = time;
    for (let i = 0; i < SWALLOW_COUNT; i += 1) {
      const tied = liveRopes.up;
      // Untied under them, any that were about burst off from where they were.
      const pose = tied ? ropeSwallowAt(i, time, still) : flushedOff(i, time - flush.at!, still || !flush.seen[i]);
      if (!pose.here) {
        flush.seen[i] = false;
        body.setMatrixAt(i, work.hidden);
        wing.setMatrixAt(i * 2, work.hidden);
        wing.setMatrixAt(i * 2 + 1, work.hidden);
        continue;
      }
      if (tied) {
        const perch = liveRopePoint(PERCH_ROPE, pose.along);
        // The body's middle sits a little above its feet on the rope.
        work.at.set(perch.x + pose.x, perch.y + PERCH_LIFT * SCALE + pose.y, perch.z + pose.z);
        flush.last[i]!.copy(work.at);
        flush.seen[i] = true;
      } else {
        const from = flush.last[i]!;
        work.at.set(from.x + pose.x, from.y + pose.y, from.z + pose.z);
      }
      const pitch = pose.flying ? 0 : PERCH_PITCH + pose.bob * 0.25;
      work.turn.setFromEuler(work.euler.set(pitch, pose.yaw + pose.look, 0, "YXZ"));
      work.place.compose(work.at, work.turn, work.size);
      body.setMatrixAt(i, work.place);
      // In flight the wings beat out to the sides; at rest they fold back along the body.
      const swing = pose.flap * FLAP_SWING;
      const fold = pose.flying ? 0 : Math.PI / 2 - 0.12;
      wing.setMatrixAt(
        i * 2,
        work.out.multiplyMatrices(work.place, work.rightShoulder).multiply(work.fold.makeRotationY(fold)).multiply(work.hinge.makeRotationZ(swing)),
      );
      wing.setMatrixAt(
        i * 2 + 1,
        work.out
          .multiplyMatrices(work.place, work.leftShoulder)
          .multiply(work.fold.makeRotationY(-fold))
          .multiply(work.hinge.makeRotationZ(-swing))
          .multiply(work.mirror),
      );
    }
    body.instanceMatrix.needsUpdate = true;
    wing.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="rope-swallows">
      <instancedMesh ref={bodies} args={[parts.body, parts.bodyMaterial, SWALLOW_COUNT]} frustumCulled={false} />
      <instancedMesh ref={wings} args={[parts.wing, parts.wingMaterial, SWALLOW_COUNT * 2]} frustumCulled={false} />
    </group>
  );
}
