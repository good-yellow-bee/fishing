import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { DUCKWEED_BEDS, duckweedSpecks } from "./duckweedBeds";
import { filmTexture } from "./filmCanvas";
import { MIRROR_PX, MIRROR_SPAN_X, mirrorCanvasPoint } from "./mirrorImage";

/** Fine enough for single fronds to show up close. */
const FILM_SCALE = 4;
const DUCKWEED = "#78ad3a";
/** Lit by the sky: bright by day, dull at dawn and dusk, barely there at night. */
const HOUR_LIGHT: Record<LakeHour, number> = { dawn: 0.6, day: 1, dusk: 0.45, night: 0.12 };

function paintBeds(ctx: CanvasRenderingContext2D, wind: { x: number; z: number }) {
  const meter = (MIRROR_PX / MIRROR_SPAN_X) * FILM_SCALE;
  // A faint mat under each bed, so from across the lake it reads as one green patch.
  for (const bed of DUCKWEED_BEDS) {
    const at = mirrorCanvasPoint(bed.x, bed.z);
    const r = bed.radius * 0.8 * meter;
    const mat = ctx.createRadialGradient(at.px * FILM_SCALE, at.py * FILM_SCALE, 0, at.px * FILM_SCALE, at.py * FILM_SCALE, r);
    mat.addColorStop(0, "rgba(255,255,255,0.35)");
    mat.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mat;
    ctx.fillRect(at.px * FILM_SCALE - r, at.py * FILM_SCALE - r, r * 2, r * 2);
  }
  for (const speck of duckweedSpecks(wind)) {
    const at = mirrorCanvasPoint(speck.x, speck.z);
    ctx.fillStyle = `rgba(255,255,255,${speck.alpha})`;
    ctx.beginPath();
    ctx.arc(at.px * FILM_SCALE, at.py * FILM_SCALE, Math.max(0.8, speck.size * meter), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Late summer's duckweed: ragged green beds of tiny fronds in the lake's still corners, by the
 * reeds, among the lilies and in the coves (duckweedBeds.ts). Painted once into a canvas laid over
 * the lake's own chop, so the beds ride the waves.
 */
export function DuckweedFilm({
  geometry,
  wind,
  hour,
  amount,
}: {
  geometry: THREE.BufferGeometry;
  wind: { x: number; z: number };
  hour: LakeHour;
  amount: number;
}) {
  const texture = useMemo(
    () => filmTexture(FILM_SCALE, 0.6, (ctx) => paintBeds(ctx, { x: wind.x, z: wind.z })),
    // The day's wind is set once a visit; only its numbers matter, not the object.
    [wind.x, wind.z],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const color = useMemo(() => new THREE.Color(DUCKWEED).multiplyScalar(HOUR_LIGHT[hour]), [hour]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
      <meshBasicMaterial color={color} map={texture} transparent opacity={0.9 * amount} depthWrite={false} />
    </mesh>
  );
}
