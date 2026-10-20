import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { BUSH, hedgeBushes, hedgeColor, type Bush } from "./hedgeRows";
import { toonRamp } from "./toon";

/**
 * Every hedgerow bush as one shape, each a copy of one icosahedron written straight into a shared buffer (hundreds
 * of separate geometries merged took a phone a noticeable moment). Laid out once; `paintHedges` colours it.
 */
export function hedgeShape(bushes: readonly Bush[] = hedgeBushes()) {
  const unit = new THREE.IcosahedronGeometry(1, 0);
  const up = unit.getAttribute("position").array;
  const facing = unit.getAttribute("normal").array;
  const per = up.length;
  const positions = new Float32Array(bushes.length * per);
  const normals = new Float32Array(bushes.length * per);
  const place = new THREE.Matrix4();
  const turn = new THREE.Matrix3();
  const v = new THREE.Vector3();
  bushes.forEach((bush, k) => {
    const r = BUSH * bush.size;
    // Lined up along the row (a small turn each, from its shade), so neighbours overlap into one hedge rather than beads.
    place.compose(new THREE.Vector3(bush.x, bush.y, bush.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (bush.shade - 0.5) * 0.6), new THREE.Vector3(r * 1.6, r * 0.8, r));
    turn.getNormalMatrix(place);
    for (let i = 0; i < per; i += 3) {
      v.set(up[i]!, up[i + 1]!, up[i + 2]!).applyMatrix4(place).toArray(positions, k * per + i);
      v.set(facing[i]!, facing[i + 1]!, facing[i + 2]!).applyMatrix3(turn).normalize().toArray(normals, k * per + i);
    }
  });
  unit.dispose();
  const shape = new THREE.BufferGeometry();
  shape.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  shape.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  shape.setAttribute("color", new THREE.BufferAttribute(new Float32Array(positions.length), 3));
  shape.computeBoundingSphere();
  return shape;
}

/** Colours each bush in `shape` for the season and hour. */
export function paintHedges(shape: THREE.BufferGeometry, bushes: readonly Bush[], season: LakeSeason, hour: LakeHour) {
  const color = shape.getAttribute("color") as THREE.BufferAttribute;
  const per = color.count / bushes.length;
  const tint = new THREE.Color();
  bushes.forEach((bush, k) => {
    const { hex, dim } = hedgeColor(season, hour, bush.shade);
    tint.set(hex).multiplyScalar(dim);
    for (let i = 0; i < per; i += 1) color.setXYZ(k * per + i, tint.r, tint.g, tint.b);
  });
  color.needsUpdate = true;
}

/** The hedgerows across the upper hills (hedgeRows.ts): one draw. */
export function HillHedges({ season, hour }: { season: LakeSeason; hour: LakeHour }) {
  const bushes = useMemo(() => hedgeBushes(), []);
  const shape = useMemo(() => hedgeShape(bushes), [bushes]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useLayoutEffect(() => paintHedges(shape, bushes, season, hour), [shape, bushes, season, hour]);
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh name="hill-hedges" geometry={shape} material={material} />;
}
