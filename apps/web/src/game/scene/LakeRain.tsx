import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { RAIN_COUNT, rainRipple, rainStreak } from "./skyWeather";
import { waterHeight } from "./water";

const STREAK_COLOR = "#d4e3ea";
const RING_COLOR = "#e2eff3";

/** Thin, see-through streaks and rings, so a shower never hides the line or the fish. */
export function LakeRain({ light }: { light: number }) {
  const streaks = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const still = useReducedMotion();
  const streakGeo = useMemo(() => new THREE.PlaneGeometry(0.035, 1), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.86, 1, 24), []);
  const streakMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: STREAK_COLOR,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: RING_COLOR,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Unlit and untoned to keep the day look, so the hour's light dims it here.
  useEffect(() => {
    streakMat.color.set(STREAK_COLOR).multiplyScalar(light);
    ringMat.color.set(RING_COLOR).multiplyScalar(light);
  }, [light, streakMat, ringMat]);

  useEffect(
    () => () => {
      streakGeo.dispose();
      ringGeo.dispose();
      streakMat.dispose();
      ringMat.dispose();
    },
    [streakGeo, ringGeo, streakMat, ringMat],
  );

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    // Reduced motion holds the shower as it was at one moment: streaks hang, rings stay one size on the moving water.
    const at = still ? STILL_TIME : time;
    const streak = streaks.current;
    const ring = rings.current;
    if (!streak || !ring) return;
    // Lite particles keep every other drop, so the shower thins evenly instead of leaving a gap.
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < RAIN_COUNT; i += stride, slot += 1) {
      const drop = rainStreak(i, at);
      if (drop) {
        const yaw = Math.atan2(camera.position.x - drop.x, camera.position.z - drop.z);
        scratch.position.set(drop.x, drop.y, drop.z);
        scratch.rotation.set(0, yaw, 0);
        scratch.scale.set(1, drop.length, 1);
      } else {
        scratch.position.set(0, -40, 0);
        scratch.rotation.set(0, 0, 0);
        scratch.scale.set(0, 0, 0);
      }
      scratch.updateMatrix();
      streak.setMatrixAt(slot, scratch.matrix);

      const splash = rainRipple(i, at);
      if (splash) {
        const swell = still ? waterHeight(splash.x, splash.z, time) - waterHeight(splash.x, splash.z, at) : 0;
        scratch.position.set(splash.x, splash.y + swell, splash.z);
        scratch.rotation.set(-Math.PI / 2, 0, 0);
        scratch.scale.set(splash.radius, splash.radius, 1);
      } else {
        scratch.scale.set(0, 0, 0);
      }
      scratch.updateMatrix();
      ring.setMatrixAt(slot, scratch.matrix);
    }
    streak.count = slot;
    ring.count = slot;
    streak.instanceMatrix.needsUpdate = true;
    ring.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="lake-rain">
      <instancedMesh ref={streaks} args={[streakGeo, streakMat, RAIN_COUNT]} frustumCulled={false} renderOrder={5} />
      <instancedMesh ref={rings} args={[ringGeo, ringMat, RAIN_COUNT]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
