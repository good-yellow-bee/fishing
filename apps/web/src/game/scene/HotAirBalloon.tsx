import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { balloonAt } from "./balloonDrift";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const GORES = ["#d8443a", "#f2c84b", "#3f8fce", "#f2c84b"];
const WICKER = "#8a6036";
const ROPE = "#5a4632";
const SKIN = "#e2b48c";
const HAT = "#2f5d8a";
const FLAME = "#ffb347";
/** Gore panels round the envelope, and lathe slices in each. */
const GORE_COUNT = 12;
const GORE_SLICES = 2;
/** Drawn larger than life, as the shore trees are, so it reads from across the water. */
const BALLOON_SCALE = 1.2;
/** The burner's mouth, under the envelope, before scaling. */
const BURNER_Y = 0.55;

/** The envelope's outline from its mouth up to its crown, as (radius, height) before scaling. */
const ENVELOPE: THREE.Vector2[] = [
  [0.22, 0.75],
  [0.42, 1.0],
  [0.78, 1.45],
  [1.0, 1.95],
  [1.06, 2.35],
  [0.98, 2.75],
  [0.72, 3.1],
  [0.36, 3.3],
  [0.0, 3.36],
].map(([r, y]) => new THREE.Vector2(r, y));

/** The balloon, its basket at the origin with two balloonists aboard and the envelope above in bright gores. */
export function balloonShape() {
  const gore = (Math.PI * 2) / GORE_COUNT;
  const ropes = [0, 1, 2, 3].map((k) => {
    const a = (k + 0.5) * (Math.PI / 2);
    const from = new THREE.Vector3(Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2);
    const to = new THREE.Vector3(Math.cos(a) * 0.24, 0.78, Math.sin(a) * 0.24);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    return { geometry: new THREE.CylinderGeometry(0.012, 0.012, from.distanceTo(to), 4), position: mid.toArray(), rotation: new THREE.Euler().setFromQuaternion(tilt).toArray().slice(0, 3) as THREE.Vector3Tuple, color: ROPE };
  });
  return mergePainted([
    ...GORES.flatMap((color, k) =>
      Array.from({ length: GORE_COUNT / GORES.length }, (_, j) => ({
        geometry: new THREE.LatheGeometry(ENVELOPE, GORE_SLICES, (j * GORES.length + k) * gore, gore),
        color,
      })),
    ),
    { geometry: new THREE.BoxGeometry(0.44, 0.3, 0.44), position: [0, 0.15, 0], color: WICKER },
    { geometry: new THREE.SphereGeometry(0.08, 8, 6), position: [-0.1, 0.38, 0.05], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.08, 8, 6), position: [0.11, 0.38, -0.04], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.083, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), position: [0.11, 0.4, -0.04], color: HAT },
    ...ropes,
  ]);
}

/** A hot-air balloon drifting low over the far shore on still summer dawns (balloonDrift.ts), its burner flaring now and then. */
export function HotAirBalloon({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const balloon = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Sprite>(null);
  const shape = useMemo(() => balloonShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const glow = useMemo(() => {
    const map = makeSoftSpotTexture(0.3);
    return new THREE.SpriteMaterial({ map, color: FLAME, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  }, []);
  useEffect(
    () => () => {
      shape.dispose();
      material.dispose();
      glow.map?.dispose();
      glow.dispose();
    },
    [shape, material, glow],
  );
  useFrame(({ clock }) => {
    const pose = balloonAt(clock.elapsedTime, wind, still);
    if (!balloon.current) return;
    balloon.current.visible = pose !== null;
    if (!pose) return;
    balloon.current.position.set(pose.x, pose.y, pose.z);
    balloon.current.rotation.y = pose.yaw;
    glow.opacity = pose.flame * 0.95;
    if (flame.current) flame.current.scale.setScalar(0.5 + pose.flame * 0.45);
  });
  return (
    <group ref={balloon} name="hot-air-balloon" scale={BALLOON_SCALE} visible={false}>
      <mesh geometry={shape} material={material} />
      <sprite ref={flame} material={glow} position={[0, BURNER_Y, 0]} />
    </group>
  );
}
