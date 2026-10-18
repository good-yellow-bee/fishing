import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { PUFF_COUNT, smokePuff } from "./campfireSmoke";

const NO_WIND = { x: 0, z: 0 };
const HERE = { x: 0, z: 0 };
/** The smoke's grey by hour: pale in the dawn light, dim against the dark. */
export const SMOKE_COLOR = { dawn: "#c9c6c0", day: "#d8d6d0", dusk: "#8d8782", night: "#6a6662" } as const;
export type SmokeHour = keyof typeof SMOKE_COLOR;

/**
 * Smoke puffs fade one by one, so each instance carries its own opacity, which a basic material
 * cannot; this one reads it from a per-instance attribute.
 */
function smokeMaterial(map: THREE.Texture) {
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float puffAlpha;\nvarying float vPuffAlpha;\n${shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvPuffAlpha = puffAlpha;",
    )}`;
    shader.fragmentShader = `varying float vPuffAlpha;\n${shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.a *= vPuffAlpha;",
    )}`;
  };
  material.customProgramCacheKey = () => "campfire-smoke";
  return material;
}

/**
 * A trail of camera-facing smoke puffs rising from where its parent group stands and leaning away
 * on the day's wind, `scale` times the size of the campfire's.
 */
export function SmokePlume({ hour, wind = NO_WIND, scale = 1 }: { hour: SmokeHour; wind?: { x: number; z: number }; scale?: number }) {
  const puffs = useRef<THREE.InstancedMesh>(null);
  const puffSpot = useMemo(() => makeSoftSpotTexture(0.6), []);
  const smoke = useMemo(() => smokeMaterial(puffSpot), [puffSpot]);
  const puffGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute("puffAlpha", new THREE.InstancedBufferAttribute(new Float32Array(PUFF_COUNT), 1));
    return geometry;
  }, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  useEffect(
    () => () => {
      [puffSpot, smoke, puffGeometry].forEach((item) => item.dispose());
    },
    [puffSpot, smoke, puffGeometry],
  );
  useEffect(() => {
    smoke.color.set(SMOKE_COLOR[hour]);
  }, [smoke, hour]);

  useFrame(({ clock, camera }) => {
    const mesh = puffs.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    const alpha = mesh.geometry.getAttribute("puffAlpha") as THREE.InstancedBufferAttribute;
    for (let i = 0; i < PUFF_COUNT; i += 1) {
      const puff = smokePuff(i, time, wind, HERE, scale);
      scratch.position.set(puff.x, puff.y, puff.z);
      scratch.quaternion.copy(camera.quaternion);
      scratch.scale.setScalar(puff.size);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
      alpha.setX(i, puff.alpha);
    }
    mesh.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = true;
  });

  return <instancedMesh ref={puffs} args={[puffGeometry, smoke, PUFF_COUNT]} frustumCulled={false} renderOrder={6} />;
}
