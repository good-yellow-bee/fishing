import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { hillFront } from "./farHills";

/** The veil's reach across and up the hills behind the far bank, and its grid's step, in metres. */
const FROM_X = -36;
const TO_X = 36;
const TOP_Y = 13;
const STEP = 0.75;
/** How far it lies off the hills' face: in front of the face, behind the hay fields' bales and the farm. */
const LIFT = 0.08;
/** Metres of hill for one tile of the cloud map, about the lake's own span so the shadows match the water's in size. */
const TILE = 45;

/**
 * A thin sheet lying over the hills' face, its texture coordinates by x and height, so the cloud map
 * that darkens the lake can slide over the hills too. Triangles off the hills' outline are left out.
 */
export function hillVeilShape() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const at = (x: number, y: number) => {
    const face = hillFront(x, y);
    return face === null ? null : { x, y, z: face + LIFT };
  };
  for (let x = FROM_X; x < TO_X; x += STEP) {
    for (let y = 0; y < TOP_Y; y += STEP) {
      const corners = [at(x, y), at(x + STEP, y), at(x + STEP, y + STEP), at(x, y + STEP)];
      if (corners.some((corner) => corner === null)) continue;
      const [a, b, c, d] = corners as { x: number; y: number; z: number }[];
      for (const point of [a!, b!, c!, a!, c!, d!]) {
        positions.push(point.x, point.y, point.z);
        uvs.push(point.x / TILE, point.y / TILE);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

/** The passing clouds' shadows sliding over the hills behind the far bank, from the same drifting map as the lake's: one draw. */
export function HillShadows({ map, opacity }: { map: THREE.Texture; opacity: number }) {
  const geometry = useMemo(() => hillVeilShape(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name="hill-cloud-shadows" geometry={geometry}>
      <meshBasicMaterial color="#0b1a22" alphaMap={map} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}
