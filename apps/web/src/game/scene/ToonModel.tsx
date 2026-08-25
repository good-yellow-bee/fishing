import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { applyToon, disposeMaterials } from "./toon";

type Props = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  shadows?: boolean;
  sitOnGround?: boolean;
};

export function ToonModel({
  url,
  position,
  rotation,
  scale = 1,
  shadows = true,
  sitOnGround = false,
}: Props) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const next = scene.clone(true);
    applyToon(next, shadows);
    if (sitOnGround) {
      const box = new THREE.Box3().setFromObject(next);
      next.position.y -= box.min.y;
    }
    return next;
  }, [scene, shadows, sitOnGround]);

  useEffect(() => () => disposeMaterials(cloned), [cloned]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
