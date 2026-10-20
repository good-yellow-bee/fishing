import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { PAIR, STORK_SCALE, nestAt, storkAt, storksOut } from "./storkNest";
import { toonRamp, useInstancedTwin } from "./toon";

const STICKS = "#6e5537";
const STICKS_TOP = "#8a6d48";
const SNOW = "#eef2f4";
const WHITE = "#f4f3ee";
const BLACK = "#1e1d1c";
const RED = "#d4442c";
/** Where the neck meets the head, and the shoulders, on a stork standing at the origin facing +z. */
const NECK_TOP = new THREE.Vector3(0, 0.9, 0.24);
const SHOULDER = 0.13;
const SHOULDER_AT = { y: 0.62, z: 0.04 };

/** The nest: a wide, flat pile of sticks, snowed over in winter. */
export function nestShape(season: LakeSeason) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.34, 0.24, 0.14, 10), position: [0, 0.07, 0], color: STICKS },
    { geometry: new THREE.CylinderGeometry(0.3, 0.3, 0.02, 10), position: [0, 0.14, 0], color: season === "winter" ? SNOW : STICKS_TOP },
  ]);
}

/** A stork's body, neck and long red legs, facing +z: white, with black flight feathers folded down its back. */
export function storkBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.58, 0], scale: [0.14, 0.14, 0.28], color: WHITE },
    { geometry: new THREE.BoxGeometry(0.29, 0.1, 0.26), position: [0, 0.6, -0.12], rotation: [0.15, 0, 0], color: BLACK },
    { geometry: new THREE.CylinderGeometry(0.035, 0.05, 0.36, 6), position: [0, 0.76, 0.17], rotation: [0.45, 0, 0], color: WHITE },
    ...[-0.05, 0.05].map((x) => ({ geometry: new THREE.CylinderGeometry(0.013, 0.013, 0.48, 5), position: [x, 0.24, 0.02] as const, color: RED })),
  ]);
}

/** The head and its long red bill, hinged where the neck meets it. */
export function storkHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.055, 8, 6), color: WHITE },
    { geometry: new THREE.ConeGeometry(0.022, 0.2, 6), position: [0, -0.01, 0.13], rotation: [Math.PI / 2, 0, 0], color: RED },
  ]);
}

/** One wing spread out to the right (+x) from the shoulder: white near the body, black flight feathers beyond. */
export function storkWingShape(side: 1 | -1) {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.3, 0.02, 0.22), position: [side * 0.15, 0, 0], color: WHITE },
    { geometry: new THREE.BoxGeometry(0.3, 0.02, 0.2), position: [side * 0.44, 0, -0.01], color: BLACK },
  ]);
}

/** The storks' nest on the barn's ridge on the far hills, and the pair standing in it in spring and summer (storkNest.ts): five draws. */
export function BarnStorks({ season }: { season: LakeSeason }) {
  const still = useReducedMotion();
  const home = storksOut(season);
  const nest = useMemo(() => nestShape(season), [season]);
  const shapes = useMemo(() => ({ body: storkBodyShape(), head: storkHeadShape(), right: storkWingShape(1), left: storkWingShape(-1) }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const instanced = useInstancedTwin(material);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const rights = useRef<THREE.InstancedMesh>(null);
  const lefts = useRef<THREE.InstancedMesh>(null);
  const at = useMemo(nestAt, []);
  useEffect(() => () => nest.dispose(), [nest]);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const scratch = useMemo(
    () => ({ root: new THREE.Matrix4(), part: new THREE.Matrix4(), turn: new THREE.Euler(), quat: new THREE.Quaternion(), at: new THREE.Vector3(), size: new THREE.Vector3().setScalar(STORK_SCALE), one: new THREE.Vector3(1, 1, 1), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }),
    [],
  );
  useFrame(({ clock }) => {
    const [body, head, right, left] = [bodies.current, heads.current, rights.current, lefts.current];
    if (!body || !head || !right || !left) return;
    PAIR.forEach((spot, i) => {
      const pose = storkAt(i, clock.elapsedTime, still);
      scratch.turn.set(0, pose.yaw, 0);
      scratch.root.compose(scratch.at.set(at.x + spot.along, at.y + 0.1 - spot.sink * STORK_SCALE, at.z), scratch.quat.setFromEuler(scratch.turn), scratch.size);
      body.setMatrixAt(i, scratch.root);
      // Thrown back with the bill to the sky to clatter, rattling as it does.
      scratch.turn.set(-1.3 * pose.headBack + pose.rattle, 0, 0);
      scratch.part.compose(NECK_TOP, scratch.quat.setFromEuler(scratch.turn), scratch.one);
      head.setMatrixAt(i, scratch.part.premultiply(scratch.root));
      [right, left].forEach((wing, w) => {
        if (pose.spread <= 0.01) {
          wing.setMatrixAt(i, scratch.hidden);
          return;
        }
        const side = w === 0 ? 1 : -1;
        // Opened out from folded along the back to spread wide and a little raised.
        scratch.turn.set(0, side * (1 - pose.spread) * 1.3, side * 0.25 * pose.spread);
        scratch.part.compose(scratch.at.set(side * SHOULDER, SHOULDER_AT.y, SHOULDER_AT.z), scratch.quat.setFromEuler(scratch.turn), scratch.one);
        wing.setMatrixAt(i, scratch.part.premultiply(scratch.root));
      });
    });
    [body, head, right, left].forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));
  });
  return (
    <group name="barn-storks">
      <mesh geometry={nest} material={material} position={[at.x, at.y - 0.04, at.z]} scale={STORK_SCALE * 1.4} />
      {home && (
        <>
          {/* Posed by hand each frame, so they are never culled by a stale bound. */}
          <instancedMesh ref={bodies} args={[shapes.body, instanced, PAIR.length]} frustumCulled={false} />
          <instancedMesh ref={heads} args={[shapes.head, instanced, PAIR.length]} frustumCulled={false} />
          <instancedMesh ref={rights} args={[shapes.right, instanced, PAIR.length]} frustumCulled={false} />
          <instancedMesh ref={lefts} args={[shapes.left, instanced, PAIR.length]} frustumCulled={false} />
        </>
      )}
    </group>
  );
}
