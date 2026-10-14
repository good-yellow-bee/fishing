import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { FIREFLY_COUNT, firefly } from "./fireflies";
import { MIST_COUNT, mistNearFade, mistPuff } from "./mist";
import { useReducedMotion } from "./reducedMotion";

const FIREFLY_COLOR = "#e4f58c";
const FIREFLY_SIZE = 0.5;

/** A round soft spot, bright in the middle; shared by the firefly halos and the mist puffs. */
export function makeSoftSpotTexture(inner: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(inner, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Night lights over the reeds. Additive and unfogged, so they read across the dark water. Lite effects keep every other one. */
export function Fireflies() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color(FIREFLY_COLOR), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.18), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [texture],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
    [geometry, texture, material],
  );

  useFrame(({ clock, camera }) => {
    const flies = mesh.current;
    if (!flies) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < FIREFLY_COUNT; i += stride, slot += 1) {
      const fly = firefly(i, time, still);
      scratch.position.set(fly.x, fly.y, fly.z);
      scratch.quaternion.copy(camera.quaternion);
      scratch.scale.setScalar(FIREFLY_SIZE * (0.55 + fly.glow * 0.45));
      scratch.updateMatrix();
      flies.setMatrixAt(slot, scratch.matrix);
      // Additive: darker colour is a dimmer light.
      flies.setColorAt(slot, color.copy(base).multiplyScalar(fly.glow));
    }
    flies.count = slot;
    flies.instanceMatrix.needsUpdate = true;
    if (flies.instanceColor) flies.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} name="fireflies" args={[geometry, material, FIREFLY_COUNT]} frustumCulled={false} renderOrder={6} />;
}

/**
 * Soft flat puffs lying on the water in two sheets. Fogged like the lake, so far
 * mist melts into the fog bank. Lite effects draw every other puff.
 */
export function LakeMist({ amount, color }: { amount: number; color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.5), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [texture],
  );

  useEffect(() => {
    material.color.set(color);
    material.opacity = amount;
  }, [amount, color, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
    [geometry, texture, material],
  );

  useFrame(({ clock, camera }) => {
    const puffs = mesh.current;
    if (!puffs) return;
    const time = clock.elapsedTime;
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < MIST_COUNT; i += stride, slot += 1) {
      const puff = mistPuff(i, time, still);
      scratch.position.set(puff.x, puff.y, puff.z);
      scratch.rotation.set(-Math.PI / 2, 0, puff.spin);
      const size = puff.size * mistNearFade(puff.x - camera.position.x, puff.z - camera.position.z);
      scratch.scale.set(size, size, 1);
      scratch.updateMatrix();
      puffs.setMatrixAt(slot, scratch.matrix);
    }
    puffs.count = slot;
    puffs.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} name="lake-mist" args={[geometry, material, MIST_COUNT]} frustumCulled={false} renderOrder={3} />;
}
