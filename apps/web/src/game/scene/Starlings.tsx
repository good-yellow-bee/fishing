import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { FLOCK_SIZE, LITE_FLOCK, starlingAt } from "./murmuration";
import { useReducedMotion } from "./reducedMotion";
import { skyPointReflection } from "./starField";
import { waterHeight } from "./water";

const STARLING = "#1c1a1e";
/** Each bird's size on screen in pixels, in the sky and in the mirror. */
const SKY_PX = 2.6;
const MIRROR_PX = 2.2;
const MIRROR_OPACITY = 0.6;
/** Where a bird with no mirror on the water is parked: far below, out of sight. */
const PARKED = -1000;

/** A murmuration of starlings wheeling over the far shore at dusk in fall, and its mirror on the lake (murmuration.ts). */
export function Starlings() {
  const still = useReducedMotion();
  const parts = useMemo(() => {
    const geometry = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(FLOCK_SIZE * 3), 3));
      return g;
    };
    return {
      sky: geometry(),
      lake: geometry(),
      skyMaterial: new THREE.PointsMaterial({ color: STARLING, size: SKY_PX, sizeAttenuation: false, fog: false, depthWrite: false }),
      lakeMaterial: new THREE.PointsMaterial({ color: STARLING, size: MIRROR_PX, sizeAttenuation: false, transparent: true, opacity: MIRROR_OPACITY, fog: false, depthWrite: false }),
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(parts).forEach((item) => item.dispose());
    },
    [parts],
  );
  useFrame(({ clock, camera }) => {
    // Reduced motion holds the cloud as it is a minute in, mid-turn.
    const now = still ? 60 : clock.elapsedTime;
    const shown = settings.particles === "lite" ? LITE_FLOCK : FLOCK_SIZE;
    const sky = parts.sky.getAttribute("position") as THREE.BufferAttribute;
    const lake = parts.lake.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < FLOCK_SIZE; i++) {
      if (i >= shown) {
        sky.setXYZ(i, 0, PARKED, 0);
        lake.setXYZ(i, 0, PARKED, 0);
        continue;
      }
      const bird = starlingAt(i, now);
      sky.setXYZ(i, bird.x, bird.y, bird.z);
      const hit = skyPointReflection([bird.x, bird.y, bird.z], camera.position);
      if (hit) lake.setXYZ(i, hit.x, waterHeight(hit.x, hit.z, now) + 0.03, hit.z);
      else lake.setXYZ(i, 0, PARKED, 0);
    }
    sky.needsUpdate = true;
    lake.needsUpdate = true;
  });
  return (
    <group name="starlings">
      <points geometry={parts.sky} material={parts.skyMaterial} frustumCulled={false} renderOrder={-1} />
      <points geometry={parts.lake} material={parts.lakeMaterial} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
