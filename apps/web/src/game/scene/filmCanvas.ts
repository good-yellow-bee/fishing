import * as THREE from "three";
import { MIRROR_PX, MIRROR_PY } from "./mirrorImage";

/**
 * A texture laid over the lake's chop like the mirror, `scale` times the mirror's resolution.
 * `paint` draws it sharp; it is softened in one blur pass, far cheaper than blurring every stroke.
 */
export function filmTexture(scale: number, blur: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const sheet = () => {
    const el = document.createElement("canvas");
    el.width = MIRROR_PX * scale;
    el.height = MIRROR_PY * scale;
    return el;
  };
  const sharp = sheet();
  const canvas = sheet();
  const raw = sharp.getContext("2d");
  const ctx = canvas.getContext("2d");
  if (raw && ctx) {
    paint(raw);
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(sharp, 0, 0);
  }
  return new THREE.CanvasTexture(canvas);
}
