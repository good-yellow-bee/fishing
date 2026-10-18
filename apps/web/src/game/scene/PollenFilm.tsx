import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { MIRROR_PX, MIRROR_PY, MIRROR_SPAN_X, mirrorCanvasPoint } from "./mirrorImage";
import { pollenRim, pollenStreaks } from "./pollenDrift";

/** The film is painted finer than the mirror, which is blurred anyway. */
const FILM_SCALE = 2;
const POLLEN = "#ecd250";
/** Pollen is lit by the sky: bright by day, dull at dawn and dusk, barely there at night. */
const HOUR_LIGHT: Record<LakeHour, number> = { dawn: 0.8, day: 1, dusk: 0.7, night: 0.25 };

/** Paints the film sharp; the caller softens it in one blur pass, far cheaper than blurring every stroke. */
function paintFilm(ctx: CanvasRenderingContext2D, wind: { x: number; z: number }) {
  const meter = (MIRROR_PX / MIRROR_SPAN_X) * FILM_SCALE;
  for (const puff of pollenRim(wind)) {
    const at = mirrorCanvasPoint(puff.x, puff.z);
    const r = puff.radius * meter;
    const glow = ctx.createRadialGradient(at.px * FILM_SCALE, at.py * FILM_SCALE, 0, at.px * FILM_SCALE, at.py * FILM_SCALE, r);
    glow.addColorStop(0, `rgba(255,255,255,${puff.alpha})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(at.px * FILM_SCALE - r, at.py * FILM_SCALE - r, r * 2, r * 2);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const streak of pollenStreaks(wind)) {
    ctx.strokeStyle = `rgba(255,255,255,${streak.alpha})`;
    ctx.lineWidth = Math.max(1, streak.width * meter);
    ctx.beginPath();
    streak.points.forEach((p, i) => {
      const at = mirrorCanvasPoint(p.x, p.z);
      if (i === 0) ctx.moveTo(at.px * FILM_SCALE, at.py * FILM_SCALE);
      else ctx.lineTo(at.px * FILM_SCALE, at.py * FILM_SCALE);
    });
    ctx.stroke();
    // Pollen clots into flecks along a streak, so it reads as dust on the water rather than paint.
    streak.points.forEach((p, i) => {
      for (let k = 0; k < 4; k += 1) {
        const n = Math.sin((i * 4 + k) * 12.9898 + p.x * 78.233) * 43758.5453;
        const jitter = n - Math.floor(n);
        const at = mirrorCanvasPoint(p.x + (jitter - 0.5) * streak.width * 3, p.z + (((jitter * 7) % 1) - 0.5) * streak.width * 3);
        ctx.fillStyle = `rgba(255,255,255,${streak.alpha})`;
        ctx.beginPath();
        ctx.arc(at.px * FILM_SCALE, at.py * FILM_SCALE, 0.8 + jitter * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

/**
 * Spring's yellow film of pollen on the lake: streaks lined up with the breeze out on the open water
 * and a thicker rim piled against the downwind bank (pollenDrift.ts). Painted once into a canvas
 * laid over the lake's own chop, so it rides the waves.
 */
export function PollenFilm({
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
  const texture = useMemo(() => {
    const sheet = () => {
      const el = document.createElement("canvas");
      el.width = MIRROR_PX * FILM_SCALE;
      el.height = MIRROR_PY * FILM_SCALE;
      return el;
    };
    const sharp = sheet();
    const canvas = sheet();
    const raw = sharp.getContext("2d");
    const ctx = canvas.getContext("2d");
    if (raw && ctx) {
      paintFilm(raw, { x: wind.x, z: wind.z });
      ctx.filter = "blur(1.5px)";
      ctx.drawImage(sharp, 0, 0);
    }
    return new THREE.CanvasTexture(canvas);
    // The day's wind is set once a visit; only its numbers matter, not the object.
  }, [wind.x, wind.z]);
  useEffect(() => () => texture.dispose(), [texture]);
  const color = useMemo(() => new THREE.Color(POLLEN).multiplyScalar(HOUR_LIGHT[hour]), [hour]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.023, 0]}>
      <meshBasicMaterial color={color} map={texture} transparent opacity={0.85 * amount} depthWrite={false} />
    </mesh>
  );
}
