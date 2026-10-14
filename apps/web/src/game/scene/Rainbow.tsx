import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { RAINBOW_REFLECTION, RAINBOW_SEGMENTS, arcPoint, arcReflection, arcRows, rainbowCenter, rainbowOpacity } from "./rainbowArc";
import { waterHeight } from "./water";

/** A ribbon of `rows` round a half circle, coloured row by row with each row's alpha. */
function makeRibbon(rows: ReturnType<typeof arcRows>) {
  const columns = RAINBOW_SEGMENTS + 1;
  const geometry = new THREE.BufferGeometry();
  const color = new THREE.Color();
  const colors = new Float32Array(columns * rows.length * 4);
  rows.forEach((row, r) => {
    color.set(row.color);
    for (let c = 0; c < columns; c += 1) colors.set([color.r, color.g, color.b, row.alpha], (r * columns + c) * 4);
  });
  const index: number[] = [];
  for (let r = 0; r < rows.length - 1; r += 1) {
    for (let c = 0; c < RAINBOW_SEGMENTS; c += 1) {
      const a = r * columns + c;
      const b = a + columns;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(columns * rows.length * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(index);
  return geometry;
}

/** A soft arc of colour across the sky from the sun, and its fainter twin in the lake, fading in when it first shows. */
export function Rainbow({ hour }: { hour: LakeHour }) {
  const started = useRef<number | null>(null);
  const rows = useMemo(() => arcRows(), []);
  const center = useMemo(() => rainbowCenter(hour), [hour]);
  const points = useMemo(
    () => rows.flatMap((row) => Array.from({ length: RAINBOW_SEGMENTS + 1 }, (_, c) => arcPoint(center, (c / RAINBOW_SEGMENTS) * Math.PI, row.radius))),
    [rows, center],
  );
  const { sky, lake, skyMaterial, lakeMaterial } = useMemo(() => {
    const sky = makeRibbon(rows);
    const at = sky.getAttribute("position") as THREE.BufferAttribute;
    points.forEach((p, i) => at.setXYZ(i, p[0], p[1], p[2]));
    const lake = makeRibbon(rows);
    const options = { vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide };
    return { sky, lake, skyMaterial: new THREE.MeshBasicMaterial(options), lakeMaterial: new THREE.MeshBasicMaterial(options) };
  }, [rows, points]);
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
    const opacity = rainbowOpacity(clock.elapsedTime - started.current);
    skyMaterial.opacity = opacity;
    lakeMaterial.opacity = opacity * RAINBOW_REFLECTION;
    const t = clock.elapsedTime;
    const at = lake.getAttribute("position") as THREE.BufferAttribute;
    const tint = lake.getAttribute("color") as THREE.BufferAttribute;
    const columns = RAINBOW_SEGMENTS + 1;
    points.forEach((p, i) => {
      const hit = arcReflection(p, camera.position);
      if (!hit) return;
      // Off the water the point fades to nothing, so the ribbon softens at the shore instead of tearing.
      at.setXYZ(i, hit.x, hit.wet ? waterHeight(hit.x, hit.z, t) + 0.04 : 0.04, hit.z);
      tint.setW(i, hit.wet ? rows[Math.floor(i / columns)]!.alpha : 0);
    });
    at.needsUpdate = true;
    tint.needsUpdate = true;
  });
  return (
    <>
      <mesh geometry={sky} material={skyMaterial} renderOrder={-1} frustumCulled={false} />
      <mesh geometry={lake} material={lakeMaterial} renderOrder={3} frustumCulled={false} />
    </>
  );
}
