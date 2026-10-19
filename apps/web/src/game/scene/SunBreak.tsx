import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { shaftTexture } from "./LightShafts";
import { useReducedMotion } from "./reducedMotion";
import { shaftDirection } from "./shaftLight";
import { BEAMS, beamFoot, sunBreakAt } from "./sunGap";

type Vec3 = [number, number, number];

/** Watery sunlight: the light is added, so these stay faint. */
const PATCH_GLOW = 0.55;
const BEAM_GLOW = 0.2;
/** How high above the water the beams come down from. */
const BEAM_TOP = 7;
const SUN = "#fff1cf";

/** A patch of sunlight sliding across the lake through a gap in the grey on overcast days, with faint beams slanting down to it (sunGap.ts). */
export function SunBreak({ discPos, wind }: { discPos: Vec3; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const patch = useRef<THREE.Mesh>(null);
  const beams = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ patch: new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), beam: new THREE.PlaneGeometry(1, 1) }), []);
  const textures = useMemo(() => ({ spot: makeSoftSpotTexture(0.35), shaft: shaftTexture() }), []);
  const materials = useMemo(
    () => ({
      patch: new THREE.MeshBasicMaterial({ map: textures.spot, color: SUN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      beam: new THREE.MeshBasicMaterial({ map: textures.shaft, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
    }),
    [textures],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(textures), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, textures, materials],
  );
  const work = useMemo(
    () => ({ matrix: new THREE.Matrix4(), mid: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3(), facing: new THREE.Vector3(), color: new THREE.Color() }),
    [],
  );
  const dir = useMemo(() => shaftDirection(discPos), [discPos]);
  useFrame(({ clock, camera }) => {
    const sun = sunBreakAt(clock.elapsedTime, wind, still);
    const lit = patch.current;
    const rays = beams.current;
    if (!lit || !rays) return;
    lit.visible = !!sun;
    rays.visible = !!sun;
    if (!sun) return;
    lit.position.set(sun.x, 0.04, sun.z);
    lit.scale.setScalar(sun.radius * 1.6);
    materials.patch.opacity = PATCH_GLOW * sun.strength;
    const reach = BEAM_TOP / -dir[1];
    work.color.set(SUN).multiplyScalar(BEAM_GLOW * sun.strength);
    for (let i = 0; i < BEAMS; i += 1) {
      const foot = beamFoot(i);
      const x = sun.x + foot.x * sun.radius;
      const z = sun.z + foot.z * sun.radius;
      // From the water up toward the hidden sun; the width turns to face the eye, as the dawn shafts do.
      work.up.set(-dir[0] * reach, BEAM_TOP, -dir[2] * reach);
      work.mid.set(x, 0, z).addScaledVector(work.up, 0.5);
      work.facing.subVectors(camera.position, work.mid);
      const length = work.up.length();
      work.up.divideScalar(length);
      work.right.crossVectors(work.up, work.facing).normalize();
      work.facing.crossVectors(work.right, work.up);
      work.right.multiplyScalar(foot.width * sun.radius * 0.22);
      work.up.multiplyScalar(length);
      work.matrix.makeBasis(work.right, work.up, work.facing).setPosition(work.mid);
      rays.setMatrixAt(i, work.matrix);
      rays.setColorAt(i, work.color);
    }
    rays.instanceMatrix.needsUpdate = true;
    if (rays.instanceColor) rays.instanceColor.needsUpdate = true;
  });
  return (
    <group name="sun-break">
      <mesh ref={patch} geometry={shapes.patch} material={materials.patch} renderOrder={3} visible={false} />
      <instancedMesh ref={beams} args={[shapes.beam, materials.beam, BEAMS]} frustumCulled={false} renderOrder={3} visible={false} />
    </group>
  );
}
