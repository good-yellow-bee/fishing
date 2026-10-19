import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { barnOwlAt } from "./owlQuarter";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const BUFF = "#ead6ac";
const FACE = "#f6f1e6";
const WING_UNDER = "#efe6d4";
const EYE = "#2a2420";
/** Drawn larger than life so it reads over the far hills. */
const SCALE = 2.4;
/** How far it turns from straight along the fields toward the lake, quartering, so its wingspan shows from the dock. */
const QUARTER = 0.65;
/** How far the wings sweep up and down with each beat, in radians. */
const BEAT = 0.55;

/** The owl's body and its pale heart-shaped face, facing +z. */
export function owlBodyShape() {
  return mergePainted([
    { geometry: new THREE.CapsuleGeometry(0.07, 0.16, 3, 8), position: [0, 0, -0.02], rotation: [Math.PI / 2 - 0.25, 0, 0], color: BUFF },
    { geometry: new THREE.SphereGeometry(0.075, 10, 8), position: [0, 0.07, 0.12], color: BUFF },
    { geometry: new THREE.CircleGeometry(0.06, 10), position: [0, 0.065, 0.19], color: FACE },
    ...[-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(0.012, 5, 4), position: [side * 0.022, 0.075, 0.195] as const, color: EYE })),
  ]);
}

/** One broad rounded wing reaching out along +x from the shoulder, buff above and pale beneath. */
export function owlWingShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.34, 0.012, 0.15), position: [0.17, 0.004, 0], color: BUFF },
    { geometry: new THREE.BoxGeometry(0.33, 0.006, 0.14), position: [0.17, -0.006, 0], color: WING_UNDER },
  ]);
}

/** A barn owl quartering the mown hay fields on the far hills at dusk (owlQuarter.ts): a draw for the body, one for both wings. */
export function BarnOwl() {
  const still = useReducedMotion();
  const body = useRef<THREE.Mesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ body: owlBodyShape(), wing: owlWingShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.wing, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const scratch = useMemo(
    () => ({ place: new THREE.Object3D(), wing: new THREE.Matrix4(), out: new THREE.Matrix4(), step: new THREE.Matrix4(), flip: new THREE.Matrix4().makeRotationY(Math.PI) }),
    [],
  );
  useFrame(({ clock }) => {
    const owl = body.current;
    const pair = wings.current;
    if (!owl || !pair) return;
    const pose = barnOwlAt(clock.elapsedTime, still);
    const { place } = scratch;
    place.position.set(pose.x, pose.y, pose.z);
    place.rotation.set(0, pose.heading * (Math.PI / 2 - QUARTER), 0);
    place.scale.setScalar(SCALE);
    place.updateMatrix();
    owl.matrix.copy(place.matrix);
    [1, -1].forEach((side, i) => {
      // From the shoulder, beating about the body's long axis; the left wing is the right turned half round, reaching out along -x.
      scratch.wing.makeRotationZ(side * pose.wing * BEAT).premultiply(scratch.step.makeTranslation(side * 0.05, 0.04, 0));
      if (side < 0) scratch.wing.multiply(scratch.flip);
      scratch.wing.multiply(scratch.step.makeScale(pose.spread, 1, 1));
      scratch.out.multiplyMatrices(place.matrix, scratch.wing);
      pair.setMatrixAt(i, scratch.out);
    });
    pair.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="barn-owl">
      <mesh ref={body} geometry={shapes.body} material={material} matrixAutoUpdate={false} />
      <instancedMesh ref={wings} args={[shapes.wing, material, 2]} frustumCulled={false} />
    </group>
  );
}
