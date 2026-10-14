import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { onGeeseCall } from "../fx";
import { settings } from "../settings";
import { FIRST_SKEIN_SEC, SKEIN_SIZE, skeinBird, skeinReady } from "./geeseSkein";
import { useReducedMotion } from "./reducedMotion";
import { skyPointReflection } from "./starField";
import { waterHeight } from "./water";

/** Meters wide a goose is drawn, larger than life so the V reads at that distance. */
const GOOSE_WIDTH = 3.4;
const MIRROR_OPACITY = 0.55;
/** Lite effects keep this many of the V. */
const LITE_SIZE = 5;

/** A goose seen from below and far off: two long, slightly bent wings, a body, and the neck reaching ahead. */
function makeGooseTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (g) {
    g.strokeStyle = "#2a2622";
    g.fillStyle = "#2a2622";
    g.lineCap = "round";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(8, 30);
    g.quadraticCurveTo(36, 18, 60, 34);
    g.moveTo(120, 30);
    g.quadraticCurveTo(92, 18, 68, 34);
    g.stroke();
    g.beginPath();
    g.ellipse(64, 36, 10, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A V of geese crossing high over the far shore, and their mirror crossing the lake, when the geese honk; motion lives in geeseSkein.ts. */
export function Geese() {
  const still = useReducedMotion();
  const texture = useMemo(makeGooseTexture, []);
  const skyMaterial = useMemo(() => new THREE.SpriteMaterial({ map: texture, transparent: true, fog: false, depthWrite: false }), [texture]);
  const lakeMaterial = useMemo(
    () => new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: MIRROR_OPACITY, fog: false, depthWrite: false }),
    [texture],
  );
  useEffect(
    () => () => {
      texture.dispose();
      skyMaterial.dispose();
      lakeMaterial.dispose();
    },
    [texture, skyMaterial, lakeMaterial],
  );
  const birds = useRef<(THREE.Sprite | null)[]>([]);
  const mirrors = useRef<(THREE.Sprite | null)[]>([]);
  const crossing = useRef({ start: Number.NEGATIVE_INFINITY, dir: 1 as 1 | -1, first: true });
  const clock = useRef(0);
  const begin = (now: number) => {
    const c = crossing.current;
    if (!skeinReady(now, c.start)) return;
    c.start = now;
    c.dir = c.dir === 1 ? -1 : 1;
  };
  useEffect(() => onGeeseCall(() => begin(clock.current)), []);
  useFrame(({ clock: frameClock, camera }) => {
    const now = frameClock.elapsedTime;
    clock.current = now;
    const c = crossing.current;
    if (c.first && now >= FIRST_SKEIN_SEC) {
      c.first = false;
      begin(now);
    }
    const shown = settings.particles === "lite" ? LITE_SIZE : SKEIN_SIZE;
    for (let k = 0; k < SKEIN_SIZE; k += 1) {
      const sprite = birds.current[k];
      const mirror = mirrors.current[k];
      if (!sprite || !mirror) continue;
      const bird = still || k >= shown ? null : skeinBird(k, now - c.start, c.dir);
      sprite.visible = bird !== null;
      mirror.visible = false;
      if (!bird) continue;
      const beat = 0.55 + 0.45 * Math.abs(bird.flap);
      sprite.position.set(bird.x, bird.y, bird.z);
      sprite.scale.set(GOOSE_WIDTH, (GOOSE_WIDTH / 2) * beat, 1);
      const hit = skyPointReflection([bird.x, bird.y, bird.z], camera.position);
      if (!hit) continue;
      // The mirror image is as big to the eye as the bird, and it lies that much nearer.
      const near = camera.position.y / (camera.position.y + bird.y);
      mirror.visible = true;
      const tall = (GOOSE_WIDTH / 2) * beat * near;
      // Sat up by half its height, so the water doesn't cut it in two; the dock and angler still hide it.
      mirror.position.set(hit.x, waterHeight(hit.x, hit.z, now) + tall / 2 + 0.03, hit.z);
      mirror.scale.set(GOOSE_WIDTH * near, -tall, 1);
    }
  });
  return (
    <>
      {Array.from({ length: SKEIN_SIZE }, (_, k) => (
        <group key={k}>
          <sprite ref={(s) => void (birds.current[k] = s)} material={skyMaterial} visible={false} renderOrder={-1} />
          <sprite ref={(s) => void (mirrors.current[k] = s)} material={lakeMaterial} visible={false} renderOrder={4} />
        </group>
      ))}
    </>
  );
}
