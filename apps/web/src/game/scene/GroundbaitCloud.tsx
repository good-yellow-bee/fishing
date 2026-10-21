import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Groundbait } from "../logic";
import { CLOUD_RADIUS, DIMPLES, ROLL_SPAN, cloudCenter, cloudOpacity, dimpleAt, feedersShow, rollAt } from "./groundbaitCloud";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const CLOUD = "#7a5a32";
const CARP = "#6b5524";
/** The roll turns the fish over a point this far under the water, so its head, back and then tail break the surface in turn. */
const ROLL_DEPTH = 0.45;
const ROLL_ARC = 1.4;
/** Sunk this much further at the roll's start and end, so the nose and tail come up out of the water and go back under it. */
const ROLL_SINK = 0.45;

/** A +z-facing carp's body, dorsal fin and tail in one mesh. */
function carpShape() {
  const body = new THREE.SphereGeometry(1, 12, 8).scale(0.1, 0.11, 0.32);
  const fin = new THREE.ConeGeometry(0.05, 0.14, 4).scale(0.25, 1, 1.6).translate(0, 0.13, -0.04);
  const tail = new THREE.ConeGeometry(0.1, 0.16, 4).scale(0.25, 1, 1).rotateX(Math.PI / 2).translate(0, 0.02, -0.36);
  // Drawn a little larger than life so it reads from the bank.
  const merged = mergeGeometries([body, fin, tail]).scale(1.25, 1.25, 1.25);
  [body, fin, tail].forEach((part) => part.dispose());
  return merged;
}

/** A soft round edge, so the cloud fades into the water instead of ending in a hard disc. */
function softEdge() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const paint = canvas.getContext("2d");
  if (paint) {
    const fade = paint.createRadialGradient(32, 32, 4, 32, 32, 32);
    fade.addColorStop(0, "#fff");
    fade.addColorStop(0.55, "#bbb");
    fade.addColorStop(1, "#000");
    paint.fillStyle = fade;
    paint.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/** The muddy cloud a handful of groundbait leaves off the bank, thinning as its casts are fished out; fish dimple over it once `feeding` or topped up, more often the more it was built up, and with `bigFeeders` in a carp now and then rolls at its edge. */
export function GroundbaitCloud({ bait, feeding = false, bigFeeders = false }: { bait: Groundbait; feeding?: boolean; bigFeeders?: boolean }) {
  const still = useReducedMotion();
  const geo = useMemo(() => new THREE.CircleGeometry(CLOUD_RADIUS, 32).rotateX(-Math.PI / 2), []);
  const edge = useMemo(() => softEdge(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: CLOUD, alphaMap: edge, transparent: true, depthWrite: false }), [edge]);
  const cloud = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const ring = useMemo(() => new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), []);
  const carpGeo = useMemo(() => carpShape(), []);
  const carp = useRef<THREE.Mesh>(null);
  const swirl = useRef<THREE.Mesh>(null);
  const at = cloudCenter(bait.spot);
  useEffect(
    () => () => {
      geo.dispose();
      ring.dispose();
      carpGeo.dispose();
      edge.dispose();
      mat.dispose();
    },
    [geo, ring, carpGeo, edge, mat],
  );
  useFrame((state) => {
    const mesh = cloud.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.position.set(at.x, waterHeight(at.x, at.z, t) + 0.02, at.z);
    // A slow swell as the crumbs drift and settle.
    mesh.scale.setScalar(still ? 1 : 1 + 0.06 * Math.sin(t * 0.8));
    mat.opacity = cloudOpacity(bait.casts);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const dimple = dimpleAt(i, t, bait.built);
      ring.visible = feedersShow(bait, feeding) && !still && dimple.age < 1;
      if (!ring.visible) return;
      const x = at.x + dimple.dx;
      const z = at.z + dimple.dz;
      ring.position.set(x, waterHeight(x, z, t) + 0.03, z);
      ring.scale.setScalar(0.08 + 0.5 * (1 - (1 - dimple.age) ** 2));
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - dimple.age);
    });
    const roll = bigFeeders && !still ? rollAt(t) : null;
    if (carp.current) {
      carp.current.visible = roll !== null && roll.age < 1;
      if (roll && roll.age < 1) {
        const tip = (roll.age - 0.5) * ROLL_ARC;
        const along = ROLL_DEPTH * Math.sin(tip);
        const x = at.x + roll.dx + Math.sin(roll.yaw) * along;
        const z = at.z + roll.dz + Math.cos(roll.yaw) * along;
        carp.current.position.set(x, waterHeight(x, z, t) - ROLL_DEPTH * (1 - Math.cos(tip)) - ROLL_SINK * Math.abs(2 * roll.age - 1) ** 3 - 0.03, z);
        // A +z-facing fish: nose up is a negative turn about x, so it rolls from nose up to nose down.
        carp.current.rotation.set(tip, roll.yaw, 0, "YXZ");
      }
    }
    if (swirl.current) {
      const k = roll ? (roll.age - 0.2) / (ROLL_SPAN - 0.2) : -1;
      swirl.current.visible = k >= 0 && k < 1;
      if (roll && swirl.current.visible) {
        const x = at.x + roll.dx;
        const z = at.z + roll.dz;
        swirl.current.position.set(x, waterHeight(x, z, t) + 0.03, z);
        swirl.current.scale.setScalar(0.25 + 0.55 * k);
        (swirl.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
      }
    }
  });
  return (
    <>
      <mesh ref={cloud} geometry={geo} material={mat} renderOrder={1} />
      {Array.from({ length: DIMPLES }, (_, i) => (
        <mesh key={i} ref={(mesh) => void (rings.current[i] = mesh)} geometry={ring} visible={false} renderOrder={4}>
          <meshBasicMaterial color="#e4efea" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={carp} geometry={carpGeo} visible={false}>
        <meshToonMaterial color={CARP} gradientMap={toonRamp()} />
      </mesh>
      <mesh ref={swirl} geometry={ring} visible={false} renderOrder={4}>
        <meshBasicMaterial color="#e4efea" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
