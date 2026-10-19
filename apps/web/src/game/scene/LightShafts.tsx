import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SHAFT_COUNT, shaftGlow, shaftLayout } from "./shaftLight";
import { useReducedMotion } from "./reducedMotion";

type Vec3 = [number, number, number];

/** How bright a fully lit shaft is at full strength; the light is added, so it stays faint. */
const SHAFT_BRIGHTNESS = 0.42;

/** A shaft of light in mist: soft at the sides, coming in over the bank and thinning toward the water. */
export function shaftTexture() {
  const w = 32;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const down = ctx.createLinearGradient(0, 0, 0, h);
  down.addColorStop(0, "rgba(255,255,255,0)");
  down.addColorStop(0.15, "rgba(255,255,255,1)");
  down.addColorStop(0.7, "rgba(255,255,255,0.8)");
  down.addColorStop(1, "rgba(255,255,255,0.25)");
  ctx.fillStyle = down;
  ctx.fillRect(0, 0, w, h);
  const sides = ctx.createLinearGradient(0, 0, w, 0);
  sides.addColorStop(0, "rgba(0,0,0,1)");
  sides.addColorStop(0.5, "rgba(0,0,0,0)");
  sides.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Shafts of low dawn sunlight slanting down through the morning mist onto the lake, in one additive
 * draw. Each turns about its own line to face the eye, and swells and thins as the mist drifts
 * (shaftLight.ts); reduced motion holds them steady.
 */
export function LightShafts({ discPos, color, strength }: { discPos: Vec3; color: string; strength: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(shaftTexture, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    [texture],
  );
  const shafts = useMemo(() => shaftLayout(discPos), [discPos]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const work = useMemo(
    () => ({
      matrix: new THREE.Matrix4(),
      mid: new THREE.Vector3(),
      up: new THREE.Vector3(),
      right: new THREE.Vector3(),
      facing: new THREE.Vector3(),
      color: new THREE.Color(),
      base: new THREE.Color(),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
    [geometry, texture, material],
  );
  useFrame(({ camera, clock }) => {
    const beams = mesh.current;
    if (!beams) return;
    work.base.set(color).multiplyScalar(SHAFT_BRIGHTNESS * strength);
    shafts.forEach((shaft, i) => {
      // The plane's height runs from the water up to the top; its width turns to face the eye.
      work.mid.set((shaft.from[0] + shaft.to[0]) / 2, (shaft.from[1] + shaft.to[1]) / 2, (shaft.from[2] + shaft.to[2]) / 2);
      work.up.set(shaft.from[0] - shaft.to[0], shaft.from[1] - shaft.to[1], shaft.from[2] - shaft.to[2]);
      const length = work.up.length();
      work.up.divideScalar(length);
      work.facing.subVectors(camera.position, work.mid);
      work.right.crossVectors(work.up, work.facing).normalize();
      work.facing.crossVectors(work.right, work.up);
      work.right.multiplyScalar(shaft.width);
      work.up.multiplyScalar(length);
      work.matrix.makeBasis(work.right, work.up, work.facing).setPosition(work.mid);
      beams.setMatrixAt(i, work.matrix);
      beams.setColorAt(i, work.color.copy(work.base).multiplyScalar(shaftGlow(i, clock.elapsedTime, still)));
    });
    beams.instanceMatrix.needsUpdate = true;
    if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, SHAFT_COUNT]} frustumCulled={false} renderOrder={3} />;
}
