import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AURORA_BASE, AURORA_COLUMNS, AURORA_REFLECTION, auroraOpacity, curtainColumn, curtainReflection } from "./auroraCurtain";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

/** Rows up each column: the bright green foot, a fading middle, and a faint violet top. */
const ROWS = [
  { at: 0, color: new THREE.Color("#4dffa0"), alpha: 0.95 },
  { at: 0.3, color: new THREE.Color("#3ee08a"), alpha: 0.75 },
  { at: 0.7, color: new THREE.Color("#52b8a8"), alpha: 0.3 },
  { at: 1, color: new THREE.Color("#8a6cff"), alpha: 0 },
] as const;
/** A still pose for reduced motion. */
const STILL_TIME = 30;

function makeCurtain() {
  const geometry = new THREE.BufferGeometry();
  const count = AURORA_COLUMNS * ROWS.length;
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  const index: number[] = [];
  for (let c = 0; c < AURORA_COLUMNS - 1; c += 1) {
    for (let r = 0; r < ROWS.length - 1; r += 1) {
      const a = c * ROWS.length + r;
      const b = a + ROWS.length;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  geometry.setIndex(index);
  return geometry;
}

/** Green curtains low over the far shore, and their stretched twin in the lake, slowly folding and brightening. */
export function Aurora() {
  const still = useReducedMotion();
  const started = useRef<number | null>(null);
  const { sky, lake, skyMaterial, lakeMaterial } = useMemo(() => {
    const options = {
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    };
    return { sky: makeCurtain(), lake: makeCurtain(), skyMaterial: new THREE.MeshBasicMaterial(options), lakeMaterial: new THREE.MeshBasicMaterial(options) };
  }, []);
  useEffect(
    () => () => {
      sky.dispose();
      lake.dispose();
      skyMaterial.dispose();
      lakeMaterial.dispose();
    },
    [sky, lake, skyMaterial, lakeMaterial],
  );
  useFrame(({ clock, camera }) => {
    started.current ??= clock.elapsedTime;
    const opacity = auroraOpacity(clock.elapsedTime - started.current);
    skyMaterial.opacity = opacity;
    lakeMaterial.opacity = opacity * AURORA_REFLECTION;
    const t = still ? STILL_TIME : clock.elapsedTime;
    const skyAt = sky.getAttribute("position") as THREE.BufferAttribute;
    const skyTint = sky.getAttribute("color") as THREE.BufferAttribute;
    const lakeAt = lake.getAttribute("position") as THREE.BufferAttribute;
    const lakeTint = lake.getAttribute("color") as THREE.BufferAttribute;
    for (let c = 0; c < AURORA_COLUMNS; c += 1) {
      const col = curtainColumn(c, t);
      ROWS.forEach((row, r) => {
        const i = c * ROWS.length + r;
        const y = AURORA_BASE + (col.top - AURORA_BASE) * row.at;
        const alpha = row.alpha * col.glow;
        skyAt.setXYZ(i, col.x, y, col.z);
        skyTint.setXYZW(i, row.color.r, row.color.g, row.color.b, alpha);
        const hit = curtainReflection([col.x, y, col.z], camera.position);
        lakeAt.setXYZ(i, hit.x, hit.wet ? waterHeight(hit.x, hit.z, clock.elapsedTime) + 0.04 : 0.04, hit.z);
        lakeTint.setXYZW(i, row.color.r, row.color.g, row.color.b, hit.wet ? alpha : 0);
      });
    }
    skyAt.needsUpdate = true;
    skyTint.needsUpdate = true;
    lakeAt.needsUpdate = true;
    lakeTint.needsUpdate = true;
  });
  return (
    <>
      <mesh geometry={sky} material={skyMaterial} renderOrder={-1} frustumCulled={false} />
      <mesh geometry={lake} material={lakeMaterial} renderOrder={3} frustumCulled={false} />
    </>
  );
}
