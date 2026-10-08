import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RAIN_COUNT, rainRipple, rainStreak } from "./skyWeather";

export function LakeRain() {
  const cores = useRef<THREE.InstancedMesh>(null);
  const shells = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const hits = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const coreGeo = useMemo(() => new THREE.PlaneGeometry(0.28, 1), []);
  const shellGeo = useMemo(() => new THREE.PlaneGeometry(0.96, 1), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.42, 1, 28), []);
  const hitGeo = useMemo(() => new THREE.CircleGeometry(1, 20), []);
  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#e7f8ff",
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const shellMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#041018",
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#06202c",
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const hitMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(
    () => () => {
      coreGeo.dispose();
      shellGeo.dispose();
      ringGeo.dispose();
      hitGeo.dispose();
      coreMat.dispose();
      shellMat.dispose();
      ringMat.dispose();
      hitMat.dispose();
    },
    [coreGeo, shellGeo, ringGeo, hitGeo, coreMat, shellMat, ringMat, hitMat],
  );

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    const core = cores.current;
    const shell = shells.current;
    const ring = rings.current;
    const hit = hits.current;
    if (!core || !shell || !ring || !hit) return;
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
      core.setMatrixAt(i, scratch.matrix);
      shell.setMatrixAt(i, scratch.matrix);

      const splash = rainRipple(i, time);
      if (splash) {
        scratch.position.set(splash.x, splash.y, splash.z);
        scratch.rotation.set(-Math.PI / 2, 0, 0);
        scratch.scale.set(splash.radius, splash.radius, 1);
        scratch.updateMatrix();
        ring.setMatrixAt(i, scratch.matrix);
        const burst = splash.open < 0.5 ? 0.42 + (1 - splash.open) * 0.55 : 0;
        scratch.scale.set(burst, burst, 1);
        scratch.updateMatrix();
        hit.setMatrixAt(i, scratch.matrix);
      } else {
        scratch.scale.set(0, 0, 0);
        scratch.updateMatrix();
        ring.setMatrixAt(i, scratch.matrix);
        hit.setMatrixAt(i, scratch.matrix);
      }
    }
    core.instanceMatrix.needsUpdate = true;
    shell.instanceMatrix.needsUpdate = true;
    ring.instanceMatrix.needsUpdate = true;
    hit.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="lake-rain">
      <instancedMesh ref={shells} args={[shellGeo, shellMat, RAIN_COUNT]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={cores} args={[coreGeo, coreMat, RAIN_COUNT]} frustumCulled={false} renderOrder={5} />
      <instancedMesh ref={rings} args={[ringGeo, ringMat, RAIN_COUNT]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={hits} args={[hitGeo, hitMat, RAIN_COUNT]} frustumCulled={false} renderOrder={5} />
    </group>
  );
}
