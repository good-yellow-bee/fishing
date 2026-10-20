import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { footHeight, walkableAt, type LakeSeason } from "@stillwater/shared";
import { makeSoftSpotTexture } from "./Atmosphere";
import { BEAM_REACH, LAMP_AHEAD, LAMP_MOTHS_AHEAD, LAMP_MOTHS_AT, LAMP_UP, headlampTarget, lampMothShow } from "./headlampBeam";
import { MOTH_COLOR, mothGeometry, poseMoth } from "./mothDraw";
import { lampMoths } from "./batFlight";
import { MOTH_COUNT, mothRound } from "./mothOrbit";
import { useReducedMotion } from "./reducedMotion";
import { beamFade, beamGeometry } from "./NightAngler";
import { anglerPose } from "./pose";
import type { ScenePhase } from "./types";
import { waterHeight } from "./water";

const LAMP = "#fffbe8";
let surfaceTime = 0;
/** The boards or the bank where they are, else the water's chop at `surfaceTime`. */
function surfaceAt(x: number, z: number) {
  return walkableAt(x, z) ? footHeight(x, z) : waterHeight(x, z, surfaceTime);
}

/** The beam opens this wide for each metre it reaches. */
const SPREAD = 0.2;

/** The angler's headlamp at night: a beam from their forehead to the float or the ground ahead, a pool of light where it lands, and the moths it draws (headlampBeam.ts). */
export function PlayerHeadlamp({ phase, float, season }: { phase: ScenePhase; float: THREE.Vector3; season: LakeSeason }) {
  const still = useReducedMotion();
  const beam = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const pool = useRef<THREE.Mesh>(null);
  const moths = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ beam: beamGeometry(1, 1), pool: new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), moth: mothGeometry() }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const fade = useMemo(() => beamFade(0.8), []);
  const materials = useMemo(
    () => ({
      beam: new THREE.MeshBasicMaterial({ map: fade, color: "#fff1c4", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false }),
      glow: new THREE.SpriteMaterial({ map: spot, color: LAMP, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      pool: new THREE.MeshBasicMaterial({ map: spot, color: "#fff1c4", transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      moth: new THREE.MeshBasicMaterial({ color: MOTH_COLOR, side: THREE.DoubleSide, toneMapped: false }),
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
  const scratch = useMemo(() => ({ lamp: new THREE.Vector3(), target: new THREE.Vector3(), centre: new THREE.Vector3(), moth: new THREE.Object3D() }), []);
  const onAt = useRef<number | null>(null);
  // Switched off, the moths are gone (a bat among them eases away, Bats.tsx).
  useEffect(
    () => () => {
      lampMoths.on = false;
    },
    [],
  );
  useFrame(({ clock }, delta) => {
    const ray = beam.current;
    if (!ray || !glow.current || !pool.current) return;
    const fx = Math.sin(anglerPose.yaw);
    const fz = Math.cos(anglerPose.yaw);
    const lamp = scratch.lamp.set(anglerPose.x + fx * LAMP_AHEAD, anglerPose.y + anglerPose.bob + LAMP_UP, anglerPose.z + fz * LAMP_AHEAD);
    surfaceTime = clock.elapsedTime;
    const target = headlampTarget(scratch.target, phase, anglerPose, float, surfaceAt);
    // The head turns to a new mark over a moment rather than snapping round.
    if (!aim.current) aim.current = target.clone();
    else aim.current.lerp(target, 1 - Math.exp(-6 * Math.min(delta, 0.1)));
    const reach = Math.min(BEAM_REACH, lamp.distanceTo(aim.current));
    ray.position.copy(lamp);
    ray.lookAt(aim.current);
    ray.scale.set(reach * SPREAD, reach * SPREAD, reach);
    glow.current.position.copy(lamp);
    // Past the beam's reach the light has faded before it lands.
    pool.current.visible = lamp.distanceTo(aim.current) <= BEAM_REACH;
    pool.current.position.set(aim.current.x, aim.current.y + 0.08, aim.current.z);
    pool.current.scale.setScalar(Math.max(0.3, reach * SPREAD));
    // Moths find the light one by one and loop out along the beam (none in winter).
    const flock = moths.current;
    if (!flock) return;
    flock.visible = season !== "winter";
    if (!flock.visible) {
      // Moths come again one by one once winter is over.
      lampMoths.on = false;
      onAt.current = null;
      return;
    }
    onAt.current ??= clock.elapsedTime;
    const time = still ? 0 : clock.elapsedTime;
    const centre = scratch.centre.copy(aim.current).sub(lamp).setLength(LAMP_MOTHS_AHEAD).add(lamp);
    for (let i = 0; i < LAMP_MOTHS_AT.length; i += 1) {
      const show = lampMothShow(i, clock.elapsedTime - onAt.current, season);
      // Seeded past the lanterns' moths, so they don't fly the same loops.
      const seed = MOTH_COUNT + i;
      poseMoth(scratch.moth, mothRound(seed, time, centre, 0), mothRound(seed, time + 0.03, centre, 0), still, still ? Math.ceil(show) : show);
      flock.setMatrixAt(i, scratch.moth.matrix);
    }
    // Where they gather, for the bats that come to hawk them (batFlight.ts).
    lampMoths.on = true;
    lampMoths.since = onAt.current + LAMP_MOTHS_AT[0];
    lampMoths.x = centre.x;
    lampMoths.y = centre.y;
    lampMoths.z = centre.z;
    flock.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="player-headlamp">
      <mesh ref={beam} geometry={shapes.beam} material={materials.beam} renderOrder={6} />
      <sprite ref={glow} material={materials.glow} scale={0.18} renderOrder={6} />
      <mesh ref={pool} geometry={shapes.pool} material={materials.pool} renderOrder={5} />
      <instancedMesh ref={moths} args={[shapes.moth, materials.moth, LAMP_MOTHS_AT.length]} frustumCulled={false} renderOrder={6} />
    </group>
  );
}
