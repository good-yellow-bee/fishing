import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { makeSoftSpotTexture } from "./Atmosphere";
import { mergeParts, mergePainted } from "./mergeParts";
import { PUMPKINS, candleGlow } from "./pumpkinPatch";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const SKIN = "#e07b24";
const STEM = "#5f6b2e";
const LEAF = "#6f8a3a";
const FACE_DARK = "#2e1a0e";
const FACE_LIT = "#ffc35a";

/** A unit pumpkin, radius 1 and sitting on the ground: a squat ball with a stem and a leaf. */
export function pumpkinShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 8), position: [0, 0.78, 0], scale: [1, 0.78, 1], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.08, 0.12, 0.35, 5), position: [0.02, 1.62, 0], rotation: [0, 0, -0.25], color: STEM },
    { geometry: new THREE.SphereGeometry(0.22, 6, 4), position: [0.24, 1.52, 0.08], scale: [1, 0.3, 0.6], color: LEAF },
  ]);
}

function triangle(a: [number, number], b: [number, number], c: [number, number]) {
  return new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(...a), new THREE.Vector2(...b), new THREE.Vector2(...c)]));
}

/** Each triangle split into four at its edges' midpoints, so the shape can bend. */
function subdivide(geometry: THREE.BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const from = flat.getAttribute("position");
  const out: number[] = [];
  const p = (i: number) => new THREE.Vector3().fromBufferAttribute(from, i);
  for (let i = 0; i < from.count; i += 3) {
    const [a, b, c] = [p(i), p(i + 1), p(i + 2)];
    const ab = a.clone().lerp(b, 0.5);
    const bc = b.clone().lerp(c, 0.5);
    const ca = c.clone().lerp(a, 0.5);
    for (const [u, v, w] of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) out.push(...u!.toArray(), ...v!.toArray(), ...w!.toArray());
  }
  if (flat !== geometry) flat.dispose();
  const split = new THREE.BufferGeometry();
  split.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  return split;
}

/** The carved face on a unit pumpkin's front (+z): two triangle eyes, a nose and a jagged grin. */
export function faceShape() {
  const mouth = new THREE.Shape([
    new THREE.Vector2(-0.55, 0.62),
    new THREE.Vector2(-0.3, 0.52),
    new THREE.Vector2(-0.18, 0.62),
    new THREE.Vector2(0, 0.5),
    new THREE.Vector2(0.18, 0.62),
    new THREE.Vector2(0.3, 0.52),
    new THREE.Vector2(0.55, 0.62),
    new THREE.Vector2(0.3, 0.32),
    new THREE.Vector2(-0.3, 0.32),
  ]);
  const face = mergeParts([
    { geometry: triangle([-0.48, 0.95], [-0.16, 0.95], [-0.32, 1.2]) },
    { geometry: triangle([0.16, 0.95], [0.48, 0.95], [0.32, 1.2]) },
    { geometry: triangle([-0.1, 0.76], [0.1, 0.76], [0, 0.9]) },
    { geometry: new THREE.ShapeGeometry(mouth, 4) },
  ]);
  // Split finely and pressed onto the pumpkin's curved front, just proud of the skin.
  const fine = subdivide(subdivide(face));
  face.dispose();
  const position = fine.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = (position.getY(i) - 0.78) / 0.78;
    position.setZ(i, Math.sqrt(Math.max(0, 1 - x * x - y * y)) + 0.015);
  }
  fine.computeVertexNormals();
  return fine;
}

/** Pumpkins by the shack in fall, the carved one lit from inside after dark. */
export function Pumpkins({ hour }: { hour: LakeHour }) {
  const still = useReducedMotion();
  const shapes = useMemo(() => ({ pumpkin: pumpkinShape(), face: faceShape() }), []);
  const skin = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const face = useMemo(() => new THREE.MeshBasicMaterial({ color: FACE_DARK, toneMapped: false, side: THREE.DoubleSide }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const glow = useMemo(
    () => new THREE.MeshBasicMaterial({ map: spot, color: "#ffa94a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [spot],
  );
  const dark = useMemo(() => new THREE.Color(FACE_DARK), []);
  const lit = useMemo(() => new THREE.Color(FACE_LIT), []);
  useEffect(
    () => () => {
      [shapes.pumpkin, shapes.face, skin, face, spot, glow].forEach((item) => item.dispose());
    },
    [shapes, skin, face, spot, glow],
  );
  useFrame(({ clock }) => {
    const candle = candleGlow(hour, clock.elapsedTime, still);
    face.color.copy(dark).lerp(lit, Math.min(1, candle));
    glow.opacity = 0.55 * candle;
  });
  return (
    <group name="pumpkins">
      {PUMPKINS.map((p) => (
        <group key={`${p.x},${p.z}`} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]} scale={p.size}>
          <mesh geometry={shapes.pumpkin} material={skin} castShadow />
          {p.carved && (
            <>
              <mesh geometry={shapes.face} material={face} />
              <mesh material={glow} position={[0, 0.03, 0.6]} rotation={[-Math.PI / 2, 0, 0]} scale={6} renderOrder={5}>
                <planeGeometry args={[1, 1]} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
