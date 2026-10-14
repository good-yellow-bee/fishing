import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { MOON_ROAD_BANDS, moonRoadGlints } from "./moonDisc";
import { useReducedMotion } from "./reducedMotion";
import { glitterOnWater, waterHeight } from "./water";

type Vec3 = [number, number, number];

const GLINT_COLOR = "#e6eefb";

/** A broken silver road of glints from the dock toward the moon, brighter the fuller it is (`strength` 0..1). */
export function MoonRoad({ discPos, strength }: { discPos: Vec3; strength: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.8, 0.32), []);
  const materials = useMemo(
    () =>
      Array.from(
        { length: MOON_ROAD_BANDS },
        () => new THREE.MeshBasicMaterial({ color: GLINT_COLOR, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      ),
    [],
  );
  const [dx, , dz] = discPos;
  const bands = useMemo(() => {
    const glints = moonRoadGlints({ x: DOCK_STAND_X, z: DOCK_STAND_Z }, [dx, 0, dz], glitterOnWater);
    return Array.from({ length: MOON_ROAD_BANDS }, (_, band) => glints.filter((glint) => glint.band === band));
  }, [dx, dz]);
  // Each glint lies across the road, the way light breaks on ripples.
  const angle = Math.atan2(-(dz - DOCK_STAND_Z), dx - DOCK_STAND_X) + Math.PI / 2;
  const helper = useMemo(() => new THREE.Object3D(), []);
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, materials],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    helper.rotation.set(-Math.PI / 2, 0, angle);
    materials.forEach((material, i) => {
      // The bands twinkle out of step, so the road sparkles; held steady for reduced motion.
      const twinkle = still ? 0.6 : Math.sin(t * (1.1 + i * 0.4) + i * 2.3) * 0.5 + 0.5;
      material.opacity = (0.3 + twinkle * 0.55) * strength;
      const mesh = meshes.current[i];
      const glints = bands[i];
      if (!mesh || !glints) return;
      glints.forEach((glint, j) => {
        helper.position.set(glint.x, waterHeight(glint.x, glint.z, t) + 0.07, glint.z);
        helper.scale.setScalar(glint.scale);
        helper.updateMatrix();
        mesh.setMatrixAt(j, helper.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  return bands.map((glints, i) => (
    <instancedMesh
      key={`${i}-${glints.length}-${dx}-${dz}`}
      args={[geometry, materials[i], glints.length]}
      frustumCulled={false}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
    />
  ));
}
