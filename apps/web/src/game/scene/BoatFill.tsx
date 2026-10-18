import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { fillLayout, leafSpots, type FillKind } from "./boatBilge";
import { LEAF_COLORS } from "./leafFall";
import { toonRamp } from "./toon";

const SNOW = "#f2f5f7";
const RAINWATER = "#86a3ae";
const LEAVES = 9;

/**
 * What lies in the bottom of a moored boat: a drift of snow, a puddle of rainwater or a few fallen
 * leaves, sized to the boat model's own hull. Drawn inside the boat's group, so it rocks with it.
 * `shown` hides it while the boat is out in use.
 */
export function BoatFill({
  url,
  scale,
  kind,
  seed = 0,
  across,
  shown,
}: {
  url: string;
  scale: number;
  kind: FillKind;
  seed?: number;
  /** The fill's half-width as a share of the model's width, for a model wider than its hull. */
  across?: number;
  shown?: () => boolean;
}) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const layout = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    return fillLayout(kind, { min: box.min.clone().multiplyScalar(scale), max: box.max.clone().multiplyScalar(scale) }, across);
  }, [scene, scale, kind, across]);
  const parts = useMemo(() => {
    const ramp = toonRamp();
    if (kind === "snow") {
      // A low dome of snow, drifted a little higher in the middle.
      const geometry = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      return { geometry, material: new THREE.MeshToonMaterial({ color: SNOW, gradientMap: ramp }) };
    }
    if (kind === "water") {
      const geometry = new THREE.CircleGeometry(1, 20);
      geometry.rotateX(-Math.PI / 2);
      return { geometry, material: new THREE.MeshToonMaterial({ color: RAINWATER, gradientMap: ramp, transparent: true, opacity: 0.85, depthWrite: false }) };
    }
    const geometry = new THREE.PlaneGeometry(0.2, 0.12);
    geometry.rotateX(-Math.PI / 2);
    return { geometry, material: new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: ramp, side: THREE.DoubleSide }) };
  }, [kind]);
  useEffect(
    () => () => {
      parts.geometry.dispose();
      parts.material.dispose();
    },
    [parts],
  );
  const leaves = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = leaves.current;
    if (!mesh) return;
    const scratch = new THREE.Object3D();
    leafSpots(LEAVES, seed).forEach((leaf, i) => {
      scratch.position.set(leaf.x * layout.across, 0.005 * (i % 3), leaf.z * layout.along);
      scratch.rotation.set(0, leaf.yaw, 0);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
      mesh.setColorAt(i, new THREE.Color(LEAF_COLORS[leaf.colour]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [layout, seed]);
  useFrame(() => {
    if (group.current && shown) group.current.visible = shown();
  });
  return (
    <group ref={group} position={[layout.x, layout.y, layout.z]} name={`boat-${kind}`}>
      {kind === "leaves" ? (
        <instancedMesh ref={leaves} args={[parts.geometry, parts.material, LEAVES]} />
      ) : (
        <mesh geometry={parts.geometry} material={parts.material} scale={[layout.across, kind === "snow" ? 0.07 : 1, layout.along]} renderOrder={kind === "water" ? 3 : 0} />
      )}
    </group>
  );
}
