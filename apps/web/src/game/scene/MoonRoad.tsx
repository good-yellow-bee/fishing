import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MOON_ROAD_BANDS, MOON_ROAD_GLINTS, moonRoadGlints, type RoadGlint } from "./moonDisc";
import { MOON_ROAD_FAR, MOON_ROAD_NEAR, ROAD_RELAY, roadBands, roadFrom } from "./glintRoad";
import { mirrorStale } from "./mirrorImage";
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
  // Laid from the eye, so the road runs toward the moon from whichever bank you stand on.
  const road = useRef<{ eye: { x: number; y: number; z: number } | null; bands: RoadGlint[][]; angle: number }>({ eye: null, bands: [], angle: 0 });
  useEffect(() => {
    road.current.eye = null;
  }, [dx, dz]);
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
    const eye = state.camera.position;
    if (mirrorStale(road.current.eye, eye, ROAD_RELAY)) {
      const from = roadFrom(eye);
      road.current = {
        eye: { x: eye.x, y: eye.y, z: eye.z },
        bands: roadBands(moonRoadGlints(from, [dx, 0, dz], glitterOnWater, MOON_ROAD_NEAR, MOON_ROAD_FAR), MOON_ROAD_BANDS),
        // Each glint lies across the road, the way light breaks on ripples.
        angle: Math.atan2(-(dz - from.z), dx - from.x) + Math.PI / 2,
      };
    }
    helper.rotation.set(-Math.PI / 2, 0, road.current.angle);
    materials.forEach((material, i) => {
      // The bands twinkle out of step, so the road sparkles; held steady for reduced motion.
      const twinkle = still ? 0.6 : Math.sin(t * (1.1 + i * 0.4) + i * 2.3) * 0.5 + 0.5;
      material.opacity = (0.3 + twinkle * 0.55) * strength;
      const mesh = meshes.current[i];
      const glints = road.current.bands[i];
      if (!mesh || !glints) return;
      mesh.count = glints.length;
      glints.forEach((glint, j) => {
        helper.position.set(glint.x, waterHeight(glint.x, glint.z, t) + 0.07, glint.z);
        helper.scale.setScalar(glint.scale);
        helper.updateMatrix();
        mesh.setMatrixAt(j, helper.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  return materials.map((material, i) => (
    <instancedMesh
      key={i}
      args={[geometry, material, Math.ceil(MOON_ROAD_GLINTS / MOON_ROAD_BANDS)]}
      frustumCulled={false}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
    />
  ));
}
