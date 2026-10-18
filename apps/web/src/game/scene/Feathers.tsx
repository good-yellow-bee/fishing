import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FEATHER_COUNT, featherAt } from "./featherDrift";
import { mergePainted } from "./mergeParts";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const NO_WIND = { x: 0, z: 0 };
/** Drawn larger than life: a true-size feather is a speck from the dock. */
const FEATHER_SCALE = 3;
const COLORS = ["#f6f3ec", "#dcd8cf"] as const;

/** A curved white swan feather, 16 cm long, lying flat along +z: a quill with its vane to either side. */
export function featherGeometry() {
  const vane = new THREE.Shape();
  vane.moveTo(0, -0.07);
  vane.quadraticCurveTo(0.035, -0.02, 0.012, 0.09);
  vane.quadraticCurveTo(-0.03, 0.03, 0, -0.07);
  return mergePainted([
    // Curled up off the water along its quill, as a floating feather lies, so the light catches it.
    { geometry: new THREE.ShapeGeometry(vane, 5), rotation: [-Math.PI / 2, 0.55, 0], position: [0, 0.008, 0], color: "#ffffff" },
    { geometry: new THREE.BoxGeometry(0.006, 0.004, 0.17), position: [0.004, 0.002, -0.005], color: "#c9c2b4" },
  ]);
}

/** Moulted swan feathers drifting on the open water from summer into fall; motion lives in featherDrift.ts. */
export function Feathers({ wind = NO_WIND }: { wind?: { x: number; z: number } }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(featherGeometry, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const colors = useMemo(() => COLORS.map((c) => new THREE.Color(c)), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const feathers = mesh.current;
    if (!feathers) return;
    const time = clock.elapsedTime;
    let slot = 0;
    for (let i = 0; i < FEATHER_COUNT; i += 1) {
      const feather = featherAt(i, time, wind);
      if (!feather || feather.size <= 0) continue;
      scratch.position.set(feather.x, waterHeight(feather.x, feather.z, time) + 0.02, feather.z);
      scratch.rotation.set(0, feather.yaw, 0);
      scratch.scale.setScalar(feather.size * FEATHER_SCALE);
      scratch.updateMatrix();
      feathers.setMatrixAt(slot, scratch.matrix);
      feathers.setColorAt(slot, colors[feather.color]!);
      slot += 1;
    }
    feathers.count = slot;
    feathers.instanceMatrix.needsUpdate = true;
    if (feathers.instanceColor) feathers.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="feathers" args={[geometry, material, FEATHER_COUNT]} frustumCulled={false} />;
}
