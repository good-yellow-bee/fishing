import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { useReducedMotion } from "./reducedMotion";
import { LUMPS, POWDER, lumpAt, powderAt, shedAt, shedTrees } from "./snowShed";
import { toonRamp } from "./toon";

const SNOW = "#f4f7fb";
/** Each powder grain's width in the world, in metres. */
const GRAIN_SIZE = 0.8;

type Tree = { position: readonly [number, number, number]; scale: number };

/** Loads of snow slipping off the trees across the lake on winter days (snowShed.ts): falling lumps and a drifting puff of powder. */
export function ShedSnow({ trees, wind }: { trees: readonly Tree[]; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const lumps = useRef<THREE.InstancedMesh>(null);
  const far = useMemo(() => shedTrees(trees), [trees]);
  const lump = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: SNOW, gradientMap: toonRamp() }), []);
  const powder = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(POWDER * 3), 3));
    // Four channels, so each grain carries its own thickness.
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(POWDER * 4), 4));
    const texture = makeSoftSpotTexture(0.3);
    const points = new THREE.PointsMaterial({ map: texture, size: GRAIN_SIZE, vertexColors: true, transparent: true, depthWrite: false });
    return { geometry, points, texture };
  }, []);
  useEffect(
    () => () => {
      lump.dispose();
      material.dispose();
      powder.geometry.dispose();
      powder.points.dispose();
      powder.texture.dispose();
    },
    [lump, material, powder],
  );
  const hold = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(SNOW), []);
  useFrame(({ clock }) => {
    const mesh = lumps.current;
    if (!mesh) return;
    // With motion reduced the trees just keep their snow.
    const shed = still ? null : shedAt(clock.elapsedTime, far);
    for (let k = 0; k < LUMPS; k++) {
      const at = shed && lumpAt(shed.from, k, shed.age);
      hold.position.set(at?.x ?? 0, at?.y ?? -10, at?.z ?? 0);
      hold.scale.setScalar(at?.size || 1e-4);
      hold.rotation.set(k, (shed?.age ?? 0) * 3 + k, 0);
      hold.updateMatrix();
      mesh.setMatrixAt(k, hold.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    const at = powder.geometry.getAttribute("position") as THREE.BufferAttribute;
    const glow = powder.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let k = 0; k < POWDER; k++) {
      const grain = shed ? powderAt(shed.from, k, shed.age, wind) : null;
      at.setXYZ(k, grain?.x ?? 0, grain?.y ?? -10, grain?.z ?? 0);
      glow.setXYZW(k, tint.r, tint.g, tint.b, grain?.alpha ?? 0);
    }
    at.needsUpdate = true;
    glow.needsUpdate = true;
  });
  return (
    <group name="shed-snow">
      <instancedMesh ref={lumps} args={[lump, material, LUMPS]} frustumCulled={false} />
      <points geometry={powder.geometry} material={powder.points} frustumCulled={false} renderOrder={3} />
    </group>
  );
}
