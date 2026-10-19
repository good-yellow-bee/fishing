import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { WATCHERS, eyePair } from "./eyeShine";
import { useReducedMotion } from "./reducedMotion";

const GREEN = new THREE.Color("#a8ff8f");
const AMBER = new THREE.Color("#ffc35a");
/** Drawn far larger than life, so a glint reads across the lake. */
const EYE_SIZE = 0.2;

/** Now and then at night a pair of eyes shines at the edge of the far bank (eyeShine.ts). */
export function NightEyes() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ eye: new THREE.Object3D(), right: new THREE.Vector3(), color: new THREE.Color(), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(() => makeSoftSpotTexture(0.3), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
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
    const eyes = mesh.current;
    if (!eyes) return;
    const time = clock.elapsedTime;
    const { eye, right, color } = scratch;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    for (let i = 0; i < WATCHERS; i++) {
      const pair = eyePair(i, time, still);
      for (const side of [-1, 1]) {
        const slot = i * 2 + (side > 0 ? 1 : 0);
        if (!pair || pair.glow <= 0) {
          eyes.setMatrixAt(slot, scratch.hidden);
          continue;
        }
        eye.position.set(pair.x, pair.y, pair.z).addScaledVector(right, (side * pair.spread) / 2);
        eye.quaternion.copy(camera.quaternion);
        eye.scale.setScalar(EYE_SIZE);
        eye.updateMatrix();
        eyes.setMatrixAt(slot, eye.matrix);
        eyes.setColorAt(slot, color.copy(GREEN).lerp(AMBER, pair.hue).multiplyScalar(pair.glow));
      }
    }
    eyes.instanceMatrix.needsUpdate = true;
    if (eyes.instanceColor) eyes.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="night-eyes" args={[geometry, material, WATCHERS * 2]} frustumCulled={false} renderOrder={6} />;
}
