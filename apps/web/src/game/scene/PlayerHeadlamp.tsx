import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { footHeight, walkableAt } from "@stillwater/shared";
import { makeSoftSpotTexture } from "./Atmosphere";
import { BEAM_REACH, LAMP_AHEAD, LAMP_UP, headlampTarget } from "./headlampBeam";
import { beamFade, beamGeometry } from "./NightAngler";
import { anglerPose } from "./pose";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

const LAMP = "#fffbe8";
/** The beam opens this wide for each metre it reaches. */
const SPREAD = 0.2;

/** The angler's headlamp at night: a beam from their forehead to the float or the ground ahead, and a pool of light where it lands (headlampBeam.ts). */
export function PlayerHeadlamp({ phase, float }: { phase: ScenePhase; float: THREE.Vector3 }) {
  const beam = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const pool = useRef<THREE.Mesh>(null);
  const shapes = useMemo(() => ({ beam: beamGeometry(1, 1), pool: new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2) }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const fade = useMemo(() => beamFade(0.8), []);
  const materials = useMemo(
    () => ({
      beam: new THREE.MeshBasicMaterial({ map: fade, color: "#fff1c4", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      glow: new THREE.SpriteMaterial({ map: spot, color: LAMP, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      pool: new THREE.MeshBasicMaterial({ map: spot, color: "#fff1c4", transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [spot, fade],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), spot, fade, ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [shapes, spot, fade, materials],
  );
  const aim = useRef<THREE.Vector3 | null>(null);
  const scratch = useMemo(() => ({ lamp: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  useFrame(({ clock }, delta) => {
    const ray = beam.current;
    if (!ray || !glow.current || !pool.current) return;
    const fx = Math.sin(anglerPose.yaw);
    const fz = Math.cos(anglerPose.yaw);
    const lamp = scratch.lamp.set(anglerPose.x + fx * LAMP_AHEAD, anglerPose.y + anglerPose.bob + LAMP_UP, anglerPose.z + fz * LAMP_AHEAD);
    const mark = headlampTarget(phase, anglerPose, float, (x, z) => (walkableAt(x, z) ? footHeight(x, z) : waterHeight(x, z, clock.elapsedTime)));
    const target = scratch.target.set(mark.x, mark.y, mark.z);
    // The head turns to a new mark over a moment rather than snapping round.
    if (!aim.current) aim.current = target.clone();
    else aim.current.lerp(target, 1 - Math.exp(-6 * Math.min(delta, 0.1)));
    const reach = Math.min(BEAM_REACH, lamp.distanceTo(aim.current));
    ray.position.copy(lamp);
    ray.lookAt(aim.current);
    ray.scale.set(reach * SPREAD, reach * SPREAD, reach);
    glow.current.position.copy(lamp);
    pool.current.position.set(aim.current.x, aim.current.y + 0.08, aim.current.z);
    pool.current.scale.setScalar(Math.max(0.3, reach * SPREAD));
  });
  return (
    <group name="player-headlamp">
      <mesh ref={beam} geometry={shapes.beam} material={materials.beam} renderOrder={6} />
      <sprite ref={glow} material={materials.glow} scale={0.18} renderOrder={6} />
      <mesh ref={pool} geometry={shapes.pool} material={materials.pool} renderOrder={5} />
    </group>
  );
}
