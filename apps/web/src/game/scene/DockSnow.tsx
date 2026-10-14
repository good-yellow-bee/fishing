import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DOCK_PLANKS } from "@stillwater/shared";
import { mergeParts } from "./mergeParts";
import { DOCK_POST_CAPS, DOCK_PRINTS } from "./snowyDock";
import { toonRamp } from "./toon";

const SNOW_COLOR = "#e8eef2";
const PRINT_COLOR = "#b7c3cc";
const SNOW_DEPTH = 0.025;
/** The snow stops short of the rails, where the wind keeps the boards bare. */
const EDGE = 0.08;

/** The footprints bake into one shape and the post caps into another, so each costs one draw. */
export function dockSnowShapes() {
  return {
    prints: mergeParts(
      DOCK_PRINTS.map((print) => ({
        geometry: new THREE.CircleGeometry(1, 12),
        position: [print.x, DOCK_PLANKS.top + SNOW_DEPTH + 0.002, print.z] as const,
        rotation: [-Math.PI / 2, 0, print.yaw] as const,
        scale: [0.07, 0.13, 1] as const,
      })),
    ),
    caps: mergeParts(
      DOCK_POST_CAPS.map((cap) => ({
        geometry: new THREE.BoxGeometry(cap.size + 0.04, 0.06, cap.size + 0.04),
        position: [cap.x, cap.y + 0.03, cap.z] as const,
      })),
    ),
  };
}

/** Winter's snow on the dock: a thin layer on the planks with the angler's footprints in it, and a cap on each post. */
export function DockSnow() {
  const width = DOCK_PLANKS.maxX - DOCK_PLANKS.minX - EDGE * 2;
  const length = DOCK_PLANKS.maxZ - DOCK_PLANKS.minZ - EDGE * 2;
  const shapes = useMemo(dockSnowShapes, []);
  useEffect(
    () => () => {
      shapes.prints.dispose();
      shapes.caps.dispose();
    },
    [shapes],
  );
  return (
    <group>
      <mesh position={[(DOCK_PLANKS.minX + DOCK_PLANKS.maxX) / 2, DOCK_PLANKS.top + SNOW_DEPTH / 2, (DOCK_PLANKS.minZ + DOCK_PLANKS.maxZ) / 2]} receiveShadow>
        <boxGeometry args={[width, SNOW_DEPTH, length]} />
        <meshToonMaterial color={SNOW_COLOR} gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={shapes.prints}>
        <meshToonMaterial color={PRINT_COLOR} gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={shapes.caps} castShadow receiveShadow>
        <meshToonMaterial color={SNOW_COLOR} gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}
