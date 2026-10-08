import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RAIN_COUNT, rainRipple, rainStreak } from "./skyWeather";

/** Thin, see-through streaks and rings, so a shower never hides the line or the fish. */
export function LakeRain() {
  const streaks = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const streakGeo = useMemo(() => new THREE.PlaneGeometry(0.035, 1), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.86, 1, 24), []);
  const streakMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#d4e3ea",
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
        color: "#e2eff3",
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

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
    const streak = streaks.current;
    const ring = rings.current;
    if (!streak || !ring) return;
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      const drop = rainStreak(i, time);
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
      streak.setMatrixAt(i, scratch.matrix);

      const splash = rainRipple(i, time);
      if (splash) {
        scratch.position.set(splash.x, splash.y, splash.z);
        scratch.rotation.set(-Math.PI / 2, 0, 0);
        scratch.scale.set(splash.radius, splash.radius, 1);
      } else {
        scratch.scale.set(0, 0, 0);
      }
      scratch.updateMatrix();
      ring.setMatrixAt(i, scratch.matrix);
    }
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
