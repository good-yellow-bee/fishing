import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { DOCK_PELLETS, WATER_PELLETS, dockPellet, waterSpout } from "./hailBurst";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const ICE = "#f4f8fb";
const SPRAY = "#e6f0f4";

/** A burst of hail now and then in a spring or summer shower: pellets bouncing on the dock and spouting off the water in front of it (hailBurst.ts). `light` dims it at night. */
export function HailShower({ light }: { light: number }) {
  const still = useReducedMotion();
  const pellets = useRef<THREE.InstancedMesh>(null);
  const spouts = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const shapes = useMemo(
    () => ({
      pellet: new THREE.IcosahedronGeometry(1, 1),
      // A little jet of spray, its base on the water and its tip at the top.
      spout: new THREE.ConeGeometry(1, 1, 6, 1, true).translate(0, 0.5, 0),
      ring: new THREE.RingGeometry(0.8, 1, 16),
    }),
    [],
  );
  const materials = useMemo(
    () => ({
      pellet: new THREE.MeshBasicMaterial({ color: ICE, toneMapped: false }),
      spout: new THREE.MeshBasicMaterial({ color: SPRAY, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
      ring: new THREE.MeshBasicMaterial({ color: SPRAY, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    }),
    [],
  );
  useEffect(() => {
    // Bright as ice by day, dimmed with the light.
    materials.pellet.color.set(ICE).multiplyScalar(Math.min(1, 0.35 + light));
    materials.spout.color.set(SPRAY).multiplyScalar(light);
    materials.ring.color.set(SPRAY).multiplyScalar(light);
  }, [light, materials]);
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, materials],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    const dock = pellets.current;
    if (dock) {
      let slot = 0;
      for (let i = 0; i < DOCK_PELLETS; i += stride) {
        const p = dockPellet(i, time, still);
        if (!p) continue;
        scratch.position.set(p.x, p.y, p.z);
        scratch.rotation.set(0, 0, 0);
        scratch.scale.setScalar(p.size);
        scratch.updateMatrix();
        dock.setMatrixAt(slot++, scratch.matrix);
      }
      dock.count = slot;
      dock.instanceMatrix.needsUpdate = true;
    }
    const spout = spouts.current;
    const ring = rings.current;
    if (spout && ring) {
      let slot = 0;
      for (let i = 0; i < WATER_PELLETS; i += stride) {
        const s = waterSpout(i, time, still);
        if (!s) continue;
        const y = waterHeight(s.x, s.z, time);
        scratch.position.set(s.x, y, s.z);
        scratch.rotation.set(0, 0, 0);
        // The jet leaps and falls back, thinning as it goes.
        scratch.scale.set(0.05 * (0.5 + s.fade), Math.max(s.height, 0.001), 0.05 * (0.5 + s.fade));
        scratch.updateMatrix();
        spout.setMatrixAt(slot, scratch.matrix);
        scratch.position.set(s.x, y + 0.01, s.z);
        scratch.rotation.set(-Math.PI / 2, 0, 0);
        scratch.scale.set(s.ring, s.ring, 1);
        scratch.updateMatrix();
        ring.setMatrixAt(slot, scratch.matrix);
        slot++;
      }
      spout.count = slot;
      ring.count = slot;
      spout.instanceMatrix.needsUpdate = true;
      ring.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group name="hail">
      <instancedMesh ref={pellets} args={[shapes.pellet, materials.pellet, DOCK_PELLETS]} frustumCulled={false} />
      <instancedMesh ref={spouts} args={[shapes.spout, materials.spout, WATER_PELLETS]} frustumCulled={false} renderOrder={5} />
      <instancedMesh ref={rings} args={[shapes.ring, materials.ring, WATER_PELLETS]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
