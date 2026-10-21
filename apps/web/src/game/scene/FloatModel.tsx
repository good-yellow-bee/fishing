import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSettings } from "../settings";
import { recolourFloatUvs, type FloatColour } from "./floatColour";
import { useGLTF } from "./loadGltf";
import { applyToon, disposeMaterials } from "./toon";

const BUOY_URL = "/models/buoy.glb";
useGLTF.preload(BUOY_URL);
/** Top of the buoy model at its 0.32 scale, where the night tip sits. */
export const GLOW_TIP_Y = 0.46;

/** The float, its body painted `colour`, or the colour picked in Settings. */
export function FloatModel({ colour }: { colour?: FloatColour }) {
  const picked = useSettings().floatColour;
  const paint = colour ?? picked;
  const { scene } = useGLTF(BUOY_URL);
  const model = useMemo(() => {
    const next = scene.clone(true);
    next.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      // The clone shares geometry with the cached model, so repaint a copy.
      obj.geometry = obj.geometry.clone();
      const uv = obj.geometry.getAttribute("uv") as THREE.BufferAttribute | undefined;
      if (uv) recolourFloatUvs(uv.array as Float32Array, paint);
    });
    applyToon(next);
    return next;
  }, [scene, paint]);
  useEffect(
    () => () => {
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      disposeMaterials(model);
    },
    [model],
  );
  return (
    <group scale={0.32}>
      <primitive object={model} />
    </group>
  );
}
