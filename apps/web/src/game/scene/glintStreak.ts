import * as THREE from "three";

/** A light glint's fade on the water: a bright core tapering to nothing at both ends and softened along its edges, so no glint shows a hard rim. */
export function makeStreakTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  const along = ctx.createLinearGradient(0, 0, 64, 0);
  along.addColorStop(0, "rgba(255,255,255,0)");
  along.addColorStop(0.15, "rgba(255,255,255,1)");
  along.addColorStop(0.85, "rgba(255,255,255,1)");
  along.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, 64, 16);
  const across = ctx.createLinearGradient(0, 0, 0, 16);
  across.addColorStop(0, "rgba(255,255,255,0)");
  across.addColorStop(0.25, "rgba(255,255,255,1)");
  across.addColorStop(0.75, "rgba(255,255,255,1)");
  across.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, 64, 16);
  return new THREE.CanvasTexture(canvas);
}
