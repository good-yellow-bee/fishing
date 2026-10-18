import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TADPOLES_PER_SCHOOL, TADPOLE_SCHOOLS, tadpoleSpot } from "./tadpoleSchools";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const COUNT = TADPOLE_SCHOOLS.length * TADPOLES_PER_SCHOOL;
/** Drawn larger than life, so a school reads from the bank as a cloud of dark commas. */
const TADPOLE_SCALE = 1.7;

/** A round head and a tapering tail behind it (toward -z), as one shape. */
function tadpoleGeometry() {
  const head = new THREE.SphereGeometry(1, 8, 6).toNonIndexed();
  head.scale(0.016, 0.01, 0.02);
  const tail = new THREE.ConeGeometry(1, 1, 5).toNonIndexed();
  tail.rotateX(-Math.PI / 2);
  tail.scale(0.008, 0.004, 0.04);
  tail.translate(0, 0, -0.035);
  const shape = mergeGeometries([head, tail]);
  head.dispose();
  tail.dispose();
  if (!shape) throw new Error("tadpole");
  return shape;
}

/** Spring's tadpoles milling in schools in the warm shallows, all in one draw (tadpoleSchools.ts). */
export function Tadpoles() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(tadpoleGeometry, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#151510", transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const school = mesh.current;
    if (!school) return;
    const time = clock.elapsedTime;
    for (let s = 0; s < TADPOLE_SCHOOLS.length; s += 1) {
      for (let i = 0; i < TADPOLES_PER_SCHOOL; i += 1) {
        const spot = tadpoleSpot(s, i, time, still);
        scratch.position.set(spot.x, waterHeight(spot.x, spot.z, still ? 0 : time) - 0.012, spot.z);
        scratch.rotation.set(0, spot.yaw, 0);
        scratch.scale.setScalar(TADPOLE_SCALE);
        scratch.updateMatrix();
        school.setMatrixAt(s * TADPOLES_PER_SCHOOL + i, scratch.matrix);
      }
    }
    school.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="tadpoles" args={[geometry, material, COUNT]} frustumCulled={false} renderOrder={2} />;
}
