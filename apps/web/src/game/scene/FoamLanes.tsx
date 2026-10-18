import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { filmTexture } from "./filmCanvas";
import { MIRROR_PX, MIRROR_SPAN_X, mirrorCanvasPoint } from "./mirrorImage";
import { foamLanes } from "./foamLanesPlan";

/** Painted finer than the mirror, so the thin lines stay crisp. */
const FILM_SCALE = 2;
const FOAM = "#eef4f2";
/** Foam is lit by the sky; unlit, it would glow on the dark water at night. */
const HOUR_LIGHT: Record<LakeHour, number> = { dawn: 0.75, day: 1, dusk: 0.45, night: 0.12 };

function paintLanes(ctx: CanvasRenderingContext2D, wind: { x: number; z: number }) {
  const meter = (MIRROR_PX / MIRROR_SPAN_X) * FILM_SCALE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const dash of foamLanes(wind)) {
    ctx.strokeStyle = `rgba(255,255,255,${dash.alpha})`;
    ctx.lineWidth = Math.max(1, dash.width * meter);
    ctx.beginPath();
    dash.points.forEach((p, i) => {
      const at = mirrorCanvasPoint(p.x, p.z);
      if (i === 0) ctx.moveTo(at.px * FILM_SCALE, at.py * FILM_SCALE);
      else ctx.lineTo(at.px * FILM_SCALE, at.py * FILM_SCALE);
    });
    ctx.stroke();
    // Bubbles clot along the line, so it reads as froth rather than paint.
    dash.points.forEach((p, i) => {
      for (let k = 0; k < 3; k += 1) {
        const n = Math.sin((i * 3 + k) * 12.9898 + p.x * 78.233 + p.z * 37.719) * 43758.5453;
        const jitter = n - Math.floor(n);
        const at = mirrorCanvasPoint(p.x + (jitter - 0.5) * 0.5, p.z + (((jitter * 7) % 1) - 0.5) * dash.width * 3);
        ctx.fillStyle = `rgba(255,255,255,${dash.alpha * (0.4 + jitter * 0.6)})`;
        ctx.beginPath();
        ctx.arc(at.px * FILM_SCALE, at.py * FILM_SCALE, 0.8 + jitter * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

/**
 * On a windy day, long pale lanes of foam lie down the wind across the open water (foamLanesPlan.ts).
 * Painted once into a canvas laid over the lake's own chop, so they ride the waves.
 */
export function FoamLanes({ geometry, wind, hour }: { geometry: THREE.BufferGeometry; wind: { x: number; z: number }; hour: LakeHour }) {
  const texture = useMemo(
    () => filmTexture(FILM_SCALE, 1, (ctx) => paintLanes(ctx, { x: wind.x, z: wind.z })),
    // The day's wind is set once a visit; only its numbers matter, not the object.
    [wind.x, wind.z],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const color = useMemo(() => new THREE.Color(FOAM).multiplyScalar(HOUR_LIGHT[hour]), [hour]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
      <meshBasicMaterial color={color} map={texture} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}
