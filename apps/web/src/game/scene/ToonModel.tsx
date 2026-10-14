import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { applyToon, releaseSharedMaterials, shadeColours, shareMaterials } from "./toon";
import { tintPlant, type PlantKind } from "./seasonLook";

type Props = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  shadows?: boolean;
  sitOnGround?: boolean;
  /** Plants take the season's colours; anything else ignores it. */
  plant?: { season: LakeSeason; kind: PlantKind; variant: number };
  /** Multiplies the colours, e.g. to darken wood soaked by rain. */
  shade?: number;
};

export function ToonModel({
  url,
  position,
  rotation,
  scale = 1,
  shadows = true,
  sitOnGround = false,
  plant,
  shade = 1,
}: Props) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const next = scene.clone(true);
    applyToon(next, shadows);
    if (plant) tintPlant(next, plant.season, plant.kind, plant.variant);
    if (shade !== 1) shadeColours(next, shade);
    if (sitOnGround) {
      const box = new THREE.Box3().setFromObject(next);
      next.position.y -= box.min.y;
    }
    // Tinted and shaded first, so copies share only when they truly look alike.
    shareMaterials(next);
    return next;
  }, [scene, shadows, sitOnGround, plant?.season, plant?.kind, plant?.variant, shade]);

  useEffect(() => () => releaseSharedMaterials(cloned), [cloned]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
