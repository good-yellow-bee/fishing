import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DROPS_PER_PUDDLE, PUDDLES, puddleRing } from "./rainPuddles";
import { useReducedMotion } from "./reducedMotion";

const WATER = "#62788a";
const RING = "#d6e4ea";
/** How far a drop's ring spreads before it is gone, in metres. */
const RING_REACH = 0.16;

/** Rain puddles on the grass by the shack, with raindrop rings spreading on them; `light` dims them at night. */
export function Puddles({ light }: { light: number }) {
  const still = useReducedMotion();
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const pool = useMemo(() => new THREE.CircleGeometry(1, 20), []);
  const ring = useMemo(() => new THREE.RingGeometry(0.75, 1, 16), []);
  const water = useMemo(() => new THREE.MeshBasicMaterial({ color: WATER, transparent: true, opacity: 0.62, depthWrite: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: RING, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), []);
  const count = PUDDLES.length * DROPS_PER_PUDDLE;
  useEffect(() => {
    water.color.set(WATER).multiplyScalar(0.4 + 0.6 * light);
    ringMat.color.set(RING).multiplyScalar(light);
  }, [light, water, ringMat]);
  useEffect(
    () => () => {
      [pool, ring, water, ringMat].forEach((item) => item.dispose());
    },
    [pool, ring, water, ringMat],
  );
  useFrame(({ clock }) => {
    const mesh = rings.current;
    if (!mesh) return;
    if (still) {
      mesh.count = 0;
      return;
    }
    const t = clock.elapsedTime;
    let slot = 0;
    for (let p = 0; p < PUDDLES.length; p += 1) {
      for (let i = 0; i < DROPS_PER_PUDDLE; i += 1) {
        const drop = puddleRing(p, i, t);
        if (drop.age < 0) continue;
        scratch.position.set(drop.x, 0.03, drop.z);
        scratch.rotation.set(-Math.PI / 2, 0, 0);
        scratch.scale.setScalar(0.01 + drop.age * RING_REACH);
        scratch.updateMatrix();
        mesh.setMatrixAt(slot++, scratch.matrix);
      }
    }
    mesh.count = slot;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="puddles">
      {PUDDLES.map((puddle, i) => (
        <mesh key={i} geometry={pool} material={water} position={[puddle.x, 0.02, puddle.z]} rotation={[-Math.PI / 2, 0, puddle.yaw]} scale={[puddle.rx, puddle.rz, 1]} renderOrder={3} />
      ))}
      <instancedMesh ref={rings} args={[ring, ringMat, count]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
