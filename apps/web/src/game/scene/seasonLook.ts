import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";

/** How a plant takes the season: pines hold their needles, broadleaves turn, grass and reeds go to straw. */
export type PlantKind = "evergreen" | "leafy" | "grass";

const hsl = { h: 0, s: 0, l: 0 };
const SNOW = new THREE.Color("#e8eef2");

/** Green or teal enough to be foliage, so trunks, stems and rocks keep their colour. */
export function isLeafColor(color: THREE.Color) {
  return color.g > color.r * 1.05 && color.g >= color.b * 0.8;
}

/**
 * The season's version of one plant colour. Summer is the models' own look.
 * `variant` (0..1) spreads fall broadleaves between red and orange so a shore
 * of oaks does not turn one flat colour.
 */
export function seasonPlantColor(source: THREE.Color, season: LakeSeason, kind: PlantKind, variant = 0.5): THREE.Color {
  const color = source.clone();
  if (season === "summer" || !isLeafColor(source)) return color;
  color.getHSL(hsl);
  if (season === "spring") {
    // Fresh growth: a step toward yellow-green and a touch lighter.
    color.setHSL(hsl.h - 0.03, Math.min(1, hsl.s * 1.1), Math.min(0.8, hsl.l + 0.05));
  } else if (season === "fall") {
    if (kind === "evergreen") color.setHSL(hsl.h, hsl.s * 0.85, hsl.l * 0.9);
    else if (kind === "leafy") color.setHSL(0.015 + variant * 0.085, Math.max(0.62, hsl.s), Math.min(0.55, Math.max(0.36, hsl.l)));
    else color.setHSL(0.11, 0.42, Math.max(0.42, hsl.l));
  } else {
    // Winter: frost on the needles, bare grey-white crowns, pale dead grass.
    if (kind === "evergreen") color.setHSL(hsl.h, hsl.s * 0.6, hsl.l).lerp(SNOW, 0.3);
    else if (kind === "leafy") color.setHSL(hsl.h, 0.08, 0.62).lerp(SNOW, 0.35);
    else color.setHSL(0.1, 0.22, 0.66);
  }
  return color;
}


const GROUND_TINT: Record<LakeSeason, { color: string; amount: number }> = {
  spring: { color: "#7aa64e", amount: 0.18 },
  summer: { color: "#000000", amount: 0 },
  fall: { color: "#8c7a44", amount: 0.32 },
  winter: { color: "#dfe7ec", amount: 0.62 },
};

/** Grass ground and hills: brighter in spring, gold in fall, under snow in winter. Night keeps its darkness. */
export function seasonGroundColor(hex: string, season: LakeSeason): string {
  const tint = GROUND_TINT[season];
  const base = new THREE.Color(hex);
  if (tint.amount === 0) return hex;
  const target = new THREE.Color(tint.color);
  // Scale the tint to the base's brightness so a winter night is snowy but still dark.
  const light = Math.max(base.r, base.g, base.b) / Math.max(target.r, target.g, target.b);
  target.multiplyScalar(Math.min(1, light * 1.6));
  return `#${base.lerp(target, tint.amount).getHexString()}`;
}

const WATER_TINT: Record<LakeSeason, { color: string; amount: number }> = {
  spring: { color: "#3f7d64", amount: 0.3 },
  summer: { color: "#000000", amount: 0 },
  fall: { color: "#5c5a38", amount: 0.32 },
  winter: { color: "#6a7f8e", amount: 0.5 },
};

/** Lake water: a greener spring, tea-stained in fall, cold steel in winter. The tint takes the base's brightness, so dusk and night stay dark. */
export function seasonWaterColor(hex: string, season: LakeSeason): string {
  const tint = WATER_TINT[season];
  if (tint.amount === 0) return hex;
  const base = new THREE.Color(hex);
  const target = new THREE.Color(tint.color);
  const light = (base.r + base.g + base.b) / (target.r + target.g + target.b);
  target.multiplyScalar(light);
  return `#${base.lerp(target, tint.amount).getHexString()}`;
}

/** Tints a cloned model's foliage in place. Materials are the clone's own, so this never touches the cached GLTF. */
export function tintPlant(root: THREE.Object3D, season: LakeSeason, kind: PlantKind, variant: number) {
  if (season === "summer") return;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      const tinted = material as THREE.MeshToonMaterial;
      if (tinted.color instanceof THREE.Color) tinted.color.copy(seasonPlantColor(tinted.color, season, kind, variant));
    }
  });
}
