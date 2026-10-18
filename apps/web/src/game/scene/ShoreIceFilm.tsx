import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { filmTexture } from "./filmCanvas";
import { MIRROR_PX, MIRROR_SPAN_X, mirrorCanvasPoint } from "./mirrorImage";
import { ICE_LIGHT, iceShards, shoreIceRim, type RimPoint } from "./shoreIce";

/** Fine enough for the rim's ragged edge to show from the dock. */
const FILM_SCALE = 4;
const ICE = "#e8f0f2";
/** How far out from the bank the snow lies on the ice before it gives way to bare grey ice, as a share of its width. */
const SNOWY = 0.55;

function trace(ctx: CanvasRenderingContext2D, points: readonly { x: number; z: number }[]) {
  points.forEach((point, i) => {
    const at = mirrorCanvasPoint(point.x, point.z);
    if (i === 0) ctx.moveTo(at.px * FILM_SCALE, at.py * FILM_SCALE);
    else ctx.lineTo(at.px * FILM_SCALE, at.py * FILM_SCALE);
  });
  ctx.closePath();
}

/** The rim between the bank and `share` of the way out to its edge, filled. */
function band(ctx: CanvasRenderingContext2D, rim: readonly RimPoint[], share: number, alpha: number) {
  ctx.beginPath();
  trace(ctx, rim.map((p) => p.bank));
  trace(
    ctx,
    rim.map((p) => ({ x: p.bank.x + (p.edge.x - p.bank.x) * share, z: p.bank.z + (p.edge.z - p.bank.z) * share })),
  );
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill("evenodd");
}

function paintIce(ctx: CanvasRenderingContext2D) {
  const rim = shoreIceRim();
  // Bare grey ice out to the edge, then the snow-covered ice nearer the bank on top of it.
  band(ctx, rim, 1, 0.62);
  band(ctx, rim, SNOWY, 0.95);
  // A bright lip along the ice's broken edge.
  ctx.beginPath();
  trace(ctx, rim.map((p) => p.edge));
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const meter = (MIRROR_PX / MIRROR_SPAN_X) * FILM_SCALE;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const shard of iceShards()) {
    const at = mirrorCanvasPoint(shard.x, shard.z);
    const r = Math.max(1.2, shard.size * meter);
    ctx.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = shard.turn + (k / 5) * Math.PI * 2;
      // An uneven pentagon: a broken plate, not a coin.
      const reach = r * (0.7 + 0.3 * Math.sin(k * 2.3 + shard.turn * 3));
      ctx.lineTo(at.px * FILM_SCALE + Math.cos(a) * reach, at.py * FILM_SCALE + Math.sin(a) * reach);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Winter's rim of shore ice: a ragged band skirting the bank, snow-covered near the bank and bare
 * grey ice at its broken edge, with loose plates lying off it (shoreIce.ts). Painted once into a
 * canvas laid over the lake's own chop.
 */
export function ShoreIceFilm({ geometry, hour }: { geometry: THREE.BufferGeometry; hour: LakeHour }) {
  const texture = useMemo(() => filmTexture(FILM_SCALE, 0.6, paintIce), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const color = useMemo(() => new THREE.Color(ICE).multiplyScalar(ICE_LIGHT[hour]), [hour]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
      <meshBasicMaterial color={color} map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
