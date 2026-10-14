import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { mergePainted } from "./mergeParts";
import { sipView } from "./sipMotion";
import { CUP_HEIGHT, CUP_SPOT, STEAM_BLOBS, THERMOS_SPOT, steamBlob } from "./steamWisp";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const FLASK = "#3f6b4f";
const STEEL = "#c9cfd2";
const STEAM = "#f1f5f7";
const COFFEE = "#5a3a24";

/** The flask (body, cap, base ring) and the cup (with its coffee) each bake into one painted shape. */
export function thermosShapes() {
  return {
    flask: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.26, 12), position: [0, 0.13, 0], color: FLASK },
      { geometry: new THREE.CylinderGeometry(0.035, 0.045, 0.035, 10), position: [0, 0.275, 0], color: STEEL },
      { geometry: new THREE.CylinderGeometry(0.057, 0.057, 0.02, 12), position: [0, 0.05, 0], color: STEEL },
    ]),
    cup: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.045, 0.038, CUP_HEIGHT, 12), position: [0, CUP_HEIGHT / 2, 0], color: STEEL },
      { geometry: new THREE.CircleGeometry(0.04, 12), position: [0, CUP_HEIGHT - 0.008, 0], rotation: [-Math.PI / 2, 0, 0], color: COFFEE },
    ]),
  };
}

/** A thermos and its steel cup on the dock; on cold mornings and in winter a wisp of steam curls up from the cup. `light` dims the steam at night. */
export function Thermos({ steaming, light }: { steaming: boolean; light: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: STEAM, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }),
    [],
  );
  const shapes = useMemo(thermosShapes, []);
  const painted = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const blobs = useRef<Array<THREE.Mesh | null>>([]);
  const cup = useRef<THREE.Group>(null);
  useEffect(() => {
    material.color.set(STEAM).multiplyScalar(Math.max(0.35, light));
  }, [light, material]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      shapes.flask.dispose();
      shapes.cup.dispose();
      painted.dispose();
    },
    [geometry, material, shapes, painted],
  );
  useFrame((state) => {
    const t = still ? 1.2 : state.clock.elapsedTime;
    const count = settings.particles === "lite" ? Math.ceil(STEAM_BLOBS / 2) : STEAM_BLOBS;
    // The cup leaves the planks while the angler has it up for a sip.
    if (cup.current) cup.current.visible = !sipView.holding;
    blobs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = steaming && i < count && !sipView.holding;
      if (!mesh.visible) return;
      const blob = steamBlob(i, t);
      mesh.position.set(CUP_SPOT.x + blob.x, CUP_SPOT.y + CUP_HEIGHT + blob.y, CUP_SPOT.z + blob.z);
      // One shared material, so each blob fades by shrinking as it thins.
      mesh.scale.setScalar(blob.scale * (0.4 + 0.6 * blob.opacity));
    });
  });
  return (
    <group name="thermos">
      <mesh position={[THERMOS_SPOT.x, THERMOS_SPOT.y, THERMOS_SPOT.z]} geometry={shapes.flask} material={painted} castShadow />
      <group ref={cup}>
        <mesh position={[CUP_SPOT.x, CUP_SPOT.y, CUP_SPOT.z]} geometry={shapes.cup} material={painted} castShadow />
      </group>
      {Array.from({ length: STEAM_BLOBS }, (_, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          visible={false}
          renderOrder={5}
          ref={(mesh) => {
            blobs.current[i] = mesh;
          }}
        />
      ))}
    </group>
  );
}
