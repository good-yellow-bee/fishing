import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FRY, fryAt, fryRing, frySwirl } from "./fryScatter";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const SILVER = "#dfe7ea";
const BACK = "#6f8a8f";
const RING = "#e2eff3";
/** Drawn larger than life so the spray reads from the dock. */
const FRY_SCALE = 4;

/** A little fish, nose along +x: a slim silver body with a darker back and a tail. */
export function fryShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 6, 4), scale: [0.045, 0.014, 0.011], color: SILVER },
    { geometry: new THREE.SphereGeometry(1, 6, 4), position: [0, 0.006, 0], scale: [0.04, 0.008, 0.008], color: BACK },
    { geometry: new THREE.ConeGeometry(0.012, 0.022, 4), position: [-0.052, 0, 0], rotation: [0, 0, Math.PI / 2], color: SILVER },
  ]);
}

/** Now and then fry spray out of the open water as something hunts them from below, with a boil where it turned (fryScatter.ts). `light` dims the rings toward night. */
export function FryBurst({ light }: { light: number }) {
  const still = useReducedMotion();
  const fish = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const shapes = useMemo(() => ({ fry: fryShape(), ring: new THREE.RingGeometry(0.82, 1, 20) }), []);
  const materials = useMemo(
    () => ({
      fry: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      ring: new THREE.MeshBasicMaterial({ color: RING, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    }),
    [],
  );
  useEffect(() => {
    materials.ring.color.set(RING).multiplyScalar(light);
  }, [light, materials]);
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, materials],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const air = fish.current;
    const water = rings.current;
    if (!air || !water) return;
    let flying = 0;
    let ringing = 0;
    const placeRing = (ring: NonNullable<ReturnType<typeof fryRing>>, spin: number) => {
      scratch.position.set(ring.x, waterHeight(ring.x, ring.z, time) + 0.012, ring.z);
      scratch.rotation.set(-Math.PI / 2, 0, spin, "XYZ");
      scratch.scale.set(ring.radius, ring.radius, 1);
      scratch.updateMatrix();
      water.setMatrixAt(ringing++, scratch.matrix);
    };
    for (let i = 0; i < FRY; i++) {
      const fry = fryAt(i, time, still);
      if (fry) {
        scratch.position.set(fry.x, waterHeight(fry.x, fry.z, time) + fry.y, fry.z);
        scratch.rotation.set(0, -fry.heading, fry.pitch, "YZX");
        scratch.scale.setScalar(FRY_SCALE);
        scratch.updateMatrix();
        air.setMatrixAt(flying++, scratch.matrix);
      }
      const ring = fryRing(i, time, still);
      if (ring) placeRing(ring, 0);
    }
    const swirl = frySwirl(time, still);
    if (swirl) placeRing(swirl, time * 2);
    air.count = flying;
    water.count = ringing;
    air.instanceMatrix.needsUpdate = true;
    water.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="fry-burst">
      <instancedMesh ref={fish} args={[shapes.fry, materials.fry, FRY]} frustumCulled={false} />
      <instancedMesh ref={rings} args={[shapes.ring, materials.ring, FRY + 1]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
