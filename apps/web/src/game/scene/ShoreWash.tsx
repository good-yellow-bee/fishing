import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { washAt } from "./lappingWaves";
import { useReducedMotion } from "./reducedMotion";

/** Points round the shore, and the foam's resting band: from just over the waterline to a little up the bank. */
const STEPS = 192;
const BANK = 0.32;
const LINE = 0.02;
/** How far past the foam's leading edge it fades out over the water. */
const FADE = 0.16;

/**
 * The foam along the waterline, washing out over the water and back as the waves lap (lappingWaves.ts).
 * Laid in the lake's plane like LakeWorld's shore rings: three rings of points (up the bank, the foam's
 * leading edge, and where it fades out), with the leading two moved each frame.
 */
function makeWashGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STEPS * 3 * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(STEPS * 3 * 4), 4));
  const index: number[] = [];
  for (let i = 0; i < STEPS; i += 1) {
    const j = (i + 1) % STEPS;
    for (let ring = 0; ring < 2; ring += 1) {
      const a = i * 3 + ring;
      const b = j * 3 + ring;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geometry.setIndex(index);
  return geometry;
}

/** The foam along the whole waterline, lapping in and out with the waves, thickest on the bank the wind blows onto. */
export function ShoreWash({ wind, opacity }: { wind: { x: number; z: number }; opacity: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(makeWashGeometry, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#e9f3ef", vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  const rim = useMemo(
    () =>
      Array.from({ length: STEPS }, (_, i) => {
        const angle = (i / STEPS) * Math.PI * 2;
        return { angle, edge: lakeEdge(angle), cos: Math.cos(angle), sin: Math.sin(angle) };
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const color = geometry.getAttribute("color") as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    rim.forEach(({ angle, edge, cos, sin }, i) => {
      const wash = washAt(angle, wind, t, still);
      // Offsets out from the water's edge: up the bank, the foam's leading edge, and its faded fringe.
      const offsets = [BANK, LINE - wash.reach, LINE - wash.reach - FADE];
      const alphas = [Math.min(1, opacity * wash.thickness), Math.min(1, opacity * wash.thickness), 0];
      offsets.forEach((offset, ring) => {
        const k = i * 3 + ring;
        position.setXYZ(k, cos * (LAKE_RX * edge + offset), sin * (LAKE_RZ * edge + offset), 0);
        color.setXYZW(k, 1, 1, 1, alphas[ring]!);
      });
    });
    position.needsUpdate = true;
    color.needsUpdate = true;
  });
  return <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} frustumCulled={false} />;
}
