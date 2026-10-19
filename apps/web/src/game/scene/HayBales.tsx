import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { BALE_LENGTH, BALE_RADIUS, FIELDS, fieldPoint, hayBales } from "./hayField";
import { mergePainted } from "./mergeParts";
import { toonRamp } from "./toon";

const SIDE = "#c9a650";
const END = "#e0c77e";
/** The mown stripes, light and dark, by season: fresh-cut in summer, faded to straw in the fall. */
const STRIPES: Record<"summer" | "fall", [string, string]> = { summer: ["#a7b866", "#94a75a"], fall: ["#b3a764", "#a19656"] };
/** Under the night sky the fields darken as the hills do. */
const NIGHT_DIM = 0.55;
/** Each field's grid, across and up, and how many stripes run along it. */
const ACROSS = 16;
const UP = 8;
const BANDS = 4;

/** A round bale lying on its side, its axis along x: golden straw round the curve, paler where the rolled ends show. */
export function baleShape() {
  const ends = [-1, 1].map((side) => ({
    geometry: new THREE.CircleGeometry(BALE_RADIUS * 0.97, 12),
    position: [(side * BALE_LENGTH) / 2 + side * 0.002, 0, 0] as const,
    rotation: [0, (side * Math.PI) / 2, 0] as const,
    color: END,
  }));
  return mergePainted([{ geometry: new THREE.CylinderGeometry(BALE_RADIUS, BALE_RADIUS, BALE_LENGTH, 12, 1, true), rotation: [0, 0, Math.PI / 2], color: SIDE }, ...ends]);
}

/** The mown fields on the hills' face, in stripes along the slope: one shape, its colours per vertex. */
export function fieldsShape(season: "summer" | "fall", hour: LakeHour) {
  const dim = hour === "night" ? NIGHT_DIM : 1;
  const tints = STRIPES[season].map((hex) => new THREE.Color(hex).multiplyScalar(dim));
  const positions: number[] = [];
  const colors: number[] = [];
  FIELDS.forEach((_, f) => {
    for (let j = 0; j < UP; j += 1) {
      // Every vertex of a stripe's triangles takes its colour, so the stripes' edges stay crisp.
      const tint = tints[Math.floor((j / UP) * BANDS) % 2]!;
      for (let i = 0; i < ACROSS; i += 1) {
        const at = (a: number, b: number) => fieldPoint(f, (a / ACROSS) * 2 - 1, (b / UP) * 2 - 1);
        const corners = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
        if (corners.some((corner) => corner === null)) continue;
        const [a, b, c, d] = corners as { x: number; y: number; z: number }[];
        for (const point of [a!, b!, c!, a!, c!, d!]) {
          positions.push(point.x, point.y, point.z);
          colors.push(tint.r, tint.g, tint.b);
        }
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** The summer's mown hay fields on the hills behind the far bank, round bales dotted across them (hayField.ts): two draws. */
export function HayBales({ season, hour }: { season: LakeSeason; hour: LakeHour }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bales = useMemo(() => hayBales(), []);
  const shape = useMemo(() => baleShape(), []);
  const fields = useMemo(() => fieldsShape(season === "fall" ? "fall" : "summer", hour), [season, hour]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
    },
    [shape, material],
  );
  useEffect(() => () => fields.dispose(), [fields]);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const place = new THREE.Object3D();
    bales.forEach((bale, i) => {
      place.position.set(bale.x, bale.y, bale.z);
      place.rotation.set(0, bale.yaw, 0);
      place.updateMatrix();
      target.setMatrixAt(i, place.matrix);
    });
    target.instanceMatrix.needsUpdate = true;
    target.computeBoundingSphere();
  }, [bales]);
  return (
    <group name="hay-fields">
      <mesh geometry={fields} material={material} />
      <instancedMesh ref={mesh} args={[shape, material, bales.length]} />
    </group>
  );
}
