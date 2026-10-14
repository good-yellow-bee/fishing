import * as THREE from "three";
import { moonSpan } from "@stillwater/shared";

/** The unlit side still shows faintly against the night, as earthshine. */
const EARTHSHINE = 0.1;

/**
 * Alpha for each pixel of a square moon image: the lit part opaque, the dark side faint, outside the disc clear.
 * Rows run top to bottom; returned as one value per pixel so it can be tested without a canvas.
 */
export function moonAlpha(phase: number, size: number): Float32Array {
  const alpha = new Float32Array(size * size);
  for (let row = 0; row < size; row += 1) {
    const y = 1 - ((row + 0.5) / size) * 2;
    const [left, right] = moonSpan(phase, y);
    for (let col = 0; col < size; col += 1) {
      const x = ((col + 0.5) / size) * 2 - 1;
      if (x * x + y * y > 1) continue;
      alpha[row * size + col] = x >= left && x <= right ? 1 : EARTHSHINE;
    }
  }
  return alpha;
}

/** The phase as a white texture for the night disc; the material's color tints it. */
export function moonTexture(phase: number, size = 64): THREE.DataTexture {
  const alpha = moonAlpha(phase, size);
  const data = new Uint8Array(size * size * 4);
  // DataTexture rows start at the bottom, so the image's top row goes in last.
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const from = row * size + col;
      const to = (size - 1 - row) * size + col;
      data.set([255, 255, 255, Math.round(alpha[from]! * 255)], to * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
