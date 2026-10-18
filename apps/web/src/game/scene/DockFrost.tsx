import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FROST_COLOR, FROST_SHEETS, frostPrints, frostSpecks, type FrostSheet } from "./dockFrost";
import { toonRamp } from "./toon";

/** Canvas pixels per metre of plank. */
const PX_PER_M = 180;
/** A trodden print's half-width and half-length, in metres, as the snow's prints. */
const PRINT_HALF = { x: 0.07, z: 0.13 };
/** Winter's snow, and the prints trodden into it, as DockSnow's. */
const SNOW_COLOR = "#e8eef2";
const PRINT_IN_SNOW = "rgba(150,168,182,0.9)";

/**
 * A thin white rime over the planks, sparkling, with the angler's prints melted back to wood; or,
 * in winter (`snow`), a solid cover of snow with the prints trodden grey into it.
 */
function paintFrost(sheet: FrostSheet, width: number, length: number, snow: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PX_PER_M);
  canvas.height = Math.round(length * PX_PER_M);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = snow ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const speck of frostSpecks()) {
    ctx.fillStyle = `rgba(255,255,255,${speck.alpha})`;
    ctx.fillRect(speck.u * canvas.width, speck.v * canvas.height, Math.max(1, speck.size * PX_PER_M), Math.max(1, speck.size * PX_PER_M));
  }
  if (snow) ctx.fillStyle = PRINT_IN_SNOW;
  else {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.85)";
  }
  for (const print of frostPrints(sheet)) {
    ctx.beginPath();
    ctx.ellipse(print.u * canvas.width, print.v * canvas.height, PRINT_HALF.x * PX_PER_M, PRINT_HALF.z * PX_PER_M, print.yaw, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function FrostSheetMesh({ sheet, amount, snow }: { sheet: FrostSheet; amount: number; snow: boolean }) {
  const { rect } = sheet;
  const width = rect.maxX - rect.minX;
  const length = rect.maxZ - rect.minZ;
  const texture = useMemo(() => new THREE.CanvasTexture(paintFrost(sheet, width, length, snow)), [sheet, width, length, snow]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[(rect.minX + rect.maxX) / 2, sheet.top + 0.004, (rect.minZ + rect.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <meshToonMaterial color={snow ? SNOW_COLOR : FROST_COLOR} gradientMap={toonRamp()} map={texture} transparent opacity={amount} depthWrite={false} />
    </mesh>
  );
}

/**
 * Hoar frost on the dock after a clear, cold night (dockFrost.ts): a sparkling white rime over the
 * walkway out to the dock, the angler's boot prints melted back to bare wood. In winter (`snow`)
 * the walkway lies under snow instead, the prints trodden into it.
 */
export function DockFrost({ amount, snow = false }: { amount: number; snow?: boolean }) {
  return FROST_SHEETS.map((sheet, i) => <FrostSheetMesh key={i} sheet={sheet} amount={amount} snow={snow} />);
}
