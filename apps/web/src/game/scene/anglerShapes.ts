import * as THREE from "three";
import { mergePainted } from "./mergeParts";

/**
 * Shapes the far-bank anglers share (FogAngler, BrollyFisher, NightAngler, and the player's headlamp beam), kept
 * apart from them so each angler's own module stays in its scene-part chunk (lazyPart.tsx).
 */

const FLOAT_TOP = "#e0412f";
const FLOAT_BOTTOM = "#f4f1e8";
const TROUSERS = "#3b4033";
const BOOTS = "#2b3a2a";
const CHAIR = "#4a4a44";
/** The low chair's seat height. */
const SEAT_Y = 0.36;
/** The headlamp beam: how far it reaches and how wide it opens. */
const BEAM_LENGTH = 6;
const BEAM_RADIUS = 0.7;

/** The float: red cap over a white body. */
export function floatShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.01, 0], color: FLOAT_TOP },
    { geometry: new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), position: [0, 0.01, 0], color: FLOAT_BOTTOM },
  ]);
}

/** The angler sitting on a low chair, facing +z, hood up: thighs out level, shins down to the wellies. */
export function brollySitterShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.4, 0.04, 0.36), position: [0, SEAT_Y - 0.02, 0.02], color: CHAIR },
    ...[-0.18, 0.18].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.015, 0.015, SEAT_Y, 4), position: [x, SEAT_Y / 2, -0.12] as const, color: CHAIR },
      { geometry: new THREE.CylinderGeometry(0.015, 0.015, SEAT_Y, 4), position: [x, SEAT_Y / 2, 0.16] as const, color: CHAIR },
    ]),
    ...[-0.08, 0.08].flatMap((x) => [
      { geometry: new THREE.BoxGeometry(0.12, 0.12, 0.38), position: [x, SEAT_Y + 0.06, 0.15] as const, color: TROUSERS },
      { geometry: new THREE.BoxGeometry(0.11, SEAT_Y, 0.12), position: [x, SEAT_Y / 2, 0.32] as const, color: BOOTS },
    ]),
  ]);
}

export function rodRestShape(height: number) {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.012, 0.012, height, 4), position: [0, height / 2, 0], color: "#6a5a44" },
    { geometry: new THREE.BoxGeometry(0.1, 0.02, 0.02), position: [0, height, 0], color: "#2a2a2a" },
  ]);
}

/** The beam's fall-off: bright at the lamp (the cone's point, the top of its map) fading to nothing at its open end; `mid` is where it is half gone. */
export function beamFade(mid = 0.45) {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(mid, "#5a5a5a");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/** The headlamp's beam: an open cone with its point at the lamp, widening out along +z. */
export function beamGeometry(radius = BEAM_RADIUS, length = BEAM_LENGTH) {
  return new THREE.ConeGeometry(radius, length, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, length / 2);
}
