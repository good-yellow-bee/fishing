import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { applyToon, disposeMaterials } from "./toon";
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
};

export function ToonModel({
  url,
  position,
  rotation,
  scale = 1,
  shadows = true,
  sitOnGround = false,
  plant,
}: Props) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const next = scene.clone(true);
    applyToon(next, shadows);
    if (plant) tintPlant(next, plant.season, plant.kind, plant.variant);
    if (sitOnGround) {
      const box = new THREE.Box3().setFromObject(next);
      next.position.y -= box.min.y;
    }
    return next;
  }, [scene, shadows, sitOnGround, plant?.season, plant?.kind, plant?.variant]);

  useEffect(() => () => disposeMaterials(cloned), [cloned]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
