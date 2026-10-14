import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DOCK_ICICLES } from "./icicleRow";

const ICE = "#d8eef7";

/** Winter icicles hanging along the inside of the dock's side walls, pale and glassy. */
export function Icicles() {
  const geometry = useMemo(() => {
    // A cone pointing down, its base at the origin.
    const cone = new THREE.ConeGeometry(1, 1, 6);
    cone.rotateX(Math.PI);
    cone.translate(0, -0.5, 0);
    return cone;
  }, []);
  const material = useMemo(
    () => new THREE.MeshPhongMaterial({ color: ICE, emissive: "#6f8a96", shininess: 90, specular: "#ffffff", transparent: true, opacity: 0.85 }),
    [],
  );
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, DOCK_ICICLES.length);
    const scratch = new THREE.Object3D();
    DOCK_ICICLES.forEach((icicle, i) => {
      scratch.position.set(icicle.x, icicle.y, icicle.z);
      scratch.scale.set(icicle.width, icicle.length, icicle.width);
      scratch.updateMatrix();
      m.setMatrixAt(i, scratch.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.name = "icicles";
    return m;
  }, [geometry, material]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
    [geometry, material, mesh],
  );
  return <primitive object={mesh} />;
}
