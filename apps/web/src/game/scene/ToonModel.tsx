import { useEffect, useMemo } from "react";
import { useGLTF } from "./loadGltf";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { applyToon, releaseSharedMaterials, shadeColours, shareMaterials } from "./toon";
import { tintPlant, type PlantKind } from "./seasonLook";
import { bakeToon, releaseBaked } from "./toonBake";

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

/** How a model is prepared: toon-lit, tinted and shaded as asked, its plain parts baked into one where it can. */
export type ToonLook = { shadows?: boolean; sitOnGround?: boolean; plant?: Props["plant"]; shade?: number };

/** A prepared copy of a loaded model `scene`; let it go with releaseToonCopy. */
export function prepareToon(scene: THREE.Object3D, { shadows = true, sitOnGround = false, plant, shade = 1 }: ToonLook) {
  const copy = scene.clone(true);
  applyToon(copy, shadows);
  if (plant) tintPlant(copy, plant.season, plant.kind, plant.variant);
  if (shade !== 1) shadeColours(copy, shade);
  // A model of several plain coloured parts draws as one; anything else keeps its parts.
  const next = bakeToon(copy, shadows) ?? copy;
  if (sitOnGround) {
    const box = new THREE.Box3().setFromObject(next);
    next.position.y -= box.min.y;
  }
  // Tinted and shaded first, so copies share only when they truly look alike.
  if (next === copy) shareMaterials(next);
  return next;
}

/** Lets go of a copy from prepareToon. */
export function releaseToonCopy(copy: THREE.Object3D) {
  if (copy.userData.baked) releaseBaked(copy);
  else releaseSharedMaterials(copy);
}

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
  const cloned = useMemo(
    () => prepareToon(scene, { shadows, sitOnGround, plant, shade }),
    [scene, shadows, sitOnGround, plant?.season, plant?.kind, plant?.variant, shade],
  );

  useEffect(() => () => releaseToonCopy(cloned), [cloned]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
