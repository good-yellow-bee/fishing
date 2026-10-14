import { DOCK_PLANKS } from "@stillwater/shared";
import { DOCK_POST_CAPS, DOCK_PRINTS } from "./snowyDock";
import { toonRamp } from "./toon";

const SNOW_COLOR = "#e8eef2";
const PRINT_COLOR = "#b7c3cc";
const SNOW_DEPTH = 0.025;
/** The snow stops short of the rails, where the wind keeps the boards bare. */
const EDGE = 0.08;

/** Winter's snow on the dock: a thin layer on the planks with the angler's footprints in it, and a cap on each post. */
export function DockSnow() {
  const width = DOCK_PLANKS.maxX - DOCK_PLANKS.minX - EDGE * 2;
  const length = DOCK_PLANKS.maxZ - DOCK_PLANKS.minZ - EDGE * 2;
  return (
    <group>
      <mesh position={[(DOCK_PLANKS.minX + DOCK_PLANKS.maxX) / 2, DOCK_PLANKS.top + SNOW_DEPTH / 2, (DOCK_PLANKS.minZ + DOCK_PLANKS.maxZ) / 2]} receiveShadow>
        <boxGeometry args={[width, SNOW_DEPTH, length]} />
        <meshToonMaterial color={SNOW_COLOR} gradientMap={toonRamp()} />
      </mesh>
      {DOCK_PRINTS.map((print, i) => (
        <mesh key={i} position={[print.x, DOCK_PLANKS.top + SNOW_DEPTH + 0.002, print.z]} rotation={[-Math.PI / 2, 0, print.yaw]} scale={[0.07, 0.13, 1]}>
          <circleGeometry args={[1, 12]} />
          <meshToonMaterial color={PRINT_COLOR} gradientMap={toonRamp()} />
        </mesh>
      ))}
      {DOCK_POST_CAPS.map((cap, i) => (
        <mesh key={`cap-${i}`} position={[cap.x, cap.y + 0.03, cap.z]} castShadow receiveShadow>
          <boxGeometry args={[cap.size + 0.04, 0.06, cap.size + 0.04]} />
          <meshToonMaterial color={SNOW_COLOR} gradientMap={toonRamp()} />
        </mesh>
      ))}
    </group>
  );
}
