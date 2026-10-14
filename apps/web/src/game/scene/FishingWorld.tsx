import { memo, useEffect, useMemo, useRef, useState, Suspense, type ComponentRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  CAST_RANGE,
  castRangeMultiplier,
  DOCK_PLANKS,
  DOCK_STAND_X,
  DOCK_STAND_Z,
  footHeight,
  inCastRange,
  inLake,
  isFishingStance,
  spotAt,
  stanceAt,
  type FishSpecies,
  type LodgeTrack,
  type LakeHour,
  type LakeSeason,
  type Sky,
  type SpotId,
  type StanceId,
} from "@stillwater/shared";
import { JUMP_MS, type FightSim } from "../fight";
import { fx } from "../fx";
import { snowing } from "./capSnow";
import type { Hotspot } from "../hotspot";
import { ShoreTracks } from "./ShoreTracks.tsx";
import { Angler } from "./Angler";
import { RiseRings } from "./RiseRings";
import { Mayflies } from "./Mayflies";
import { RodBell } from "./RodBell";
import { Windsock } from "./Windsock";
import { Lightning } from "./Lightning";
import { Rainbow } from "./Rainbow";
import { Aurora } from "./Aurora";
import { auroraOut } from "./auroraCurtain";
import { rainbowOut } from "./rainbowArc";
import {
  FISH_LEAP_SEC,
  HOOKSET_SEC,
  applyBiteDart,
  applyRetrieve,
  biteLineSag,
  bobberPlunge,
  bobberPull,
  fightInput,
  clearFightLine,
  dockLineLips,
  liftDockSample,
  fightLineSag,
  fightView,
  resetFightView,
  HIT_STOP_SEC,
  isFrozen,
  fishDepthMeters,
  fishLeadMeters,
  fishSideMeters,
  hooksetTug,
  retrieveHop,
  retrieveWake,
  retrieveWeave,
  type FightSurge,
} from "./fightMotion";
import { ArticulatedFish, type FishDrive } from "./ArticulatedFish";
import { FishShadow } from "./FishShadow";
import { fishSize, landedScale } from "./fishSize";
import {
  LAND_DRIPS,
  landDrip,
  landDripFall,
  landExitSplash,
  landFishPitch,
  landFishRoll,
  landFishYaw,
  landFlop,
  landHoldPoint,
  landHoldShake,
  landLineOpacity,
  landLineSag,
  landPresentYaw,
  landSwing,
  landView,
  photoFrameAt,
  resetLandView,
  placeLandedFish,
} from "./landMotion";
import { clearCatchShot, postCatchShot, snapCanvas } from "./catchPhoto";
import { CAST_RELEASE_SEC, castAlong, castFlightSeconds, castLoft, castTrailSag } from "./castMotion";
import { MISS_DRIPS, missBobberLift, missDrip, missLineSag, missView, resetMissView } from "./missMotion";
import { RISE_SCALE, riseMode, risePose, takePose, turnPose } from "./riseMotion";
import { FIGHT_FISH_SCALE, FIGHT_WAG, fightFishMode, fightFishPose, fightLineEnd, leapLift } from "./fightFish";
import { WAIT_REST_SAG, applyWaitShift, lureIsWaiting, nibbleBob, nibbleRingGap, waitLineSag, waitNod, waitView, resetWaitView } from "./waitMotion";
import { CAMERA_HILLS, CAMERA_TREES, LakeWorld, weatherLook } from "./LakeWorld";
import { clearDistance, easePull } from "./cameraClear";
import { PlayerMove } from "./Player";
import { beatDistance, dollyStep, fightDistance, landingDistance, landingFramed, landingWeight } from "./cameraBeats";
import { aboard, ANCHOR, boat, resetBoat, subscribeBoat } from "./boat";
import { anglerPose, resetAnglerPose, shortestYaw, walkAnglerTo } from "./pose";
import {
  STRIKE_DROPS,
  strikeAnchor,
  strikeDrop,
  strikeDunk,
  strikeRing,
  strikeSpray,
} from "./strikeSplash";
import { markSplash } from "./duckFlush";
import { releaseDrop, releaseEntry, releasePitch, releasePoint, releaseRing } from "./releaseMotion";
import { bobberRingHeight, waterHeight, waterRayHit } from "./water";
import { applyToon, disposeMaterials } from "./toon";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";
import { aimInputs, listenForWaterAim, sameAim } from "./pointerAim";
import { fishBuild, type FishBuild } from "./fishBuild";
import { useReducedMotion } from "./reducedMotion";
import { GLOW_TIP, lineLook } from "./lineLook";
import { castRing, CAST_RING_COLORS } from "./castRing";
import { LIFT_START_AGE, liftDepth, liftFlop } from "./catchLift";
import { sweetBand } from "../logic";
import { settings, SHAKE_SCALE, updateSettings, useSettings } from "../settings";
import { recolourFloatUvs } from "./floatColour";
import { createFrameWatch, noteEffectsSteppedDown } from "../frameWatch";
import { GOLDEN_ACCENT, GOLDEN_COLOR } from "../../components/FishMark";

const BUOY_URL = "/models/buoy.glb";
/** Top of the buoy model at its 0.32 scale, where the night tip sits. */
const GLOW_TIP_Y = 0.46;
useGLTF.preload(BUOY_URL);

export type SimRef = { current: FightSim | null };

type Props = {
  level: number;
  phase: ScenePhase;
  spot: SpotId;
  sim: SimRef;
  nibble: boolean;
  hour: LakeHour;
  sky: Sky;
  /** Optional so older callers keep the summer look. */
  season?: LakeSeason;
  species: FishSpecies | null;
  weight: number;
  /** The landed fish rolled golden; the held-up fish wears the gold coat. */
  golden?: boolean;
  /** The angler let the landed fish go; it drops from the hand back into the lake. */
  released?: boolean;
  /** The real moon's phase for the night sky, 0 new to 0.5 full. */
  moon?: number;
  /** The day's wind as a downwind drift on a sitting float, meters a second. */
  wind?: { x: number; z: number };
  hotspot: Hotspot | null;
  /** An evening rise is on: rings dimple the water in reach of the bank. */
  rising?: boolean;
  /** A thunderstorm: the sky flashes now and then and thunder follows. */
  storm?: boolean;
  /** Other anglers' recent catches, as faint rings on their bank's water. */
  tracks?: readonly LodgeTrack[];
  /** Live cast power, read each frame so the ring grows without a re-render. */
  powerRef: { current: number };
  accuracy: number;
};

const CAM_START: [number, number, number] = [DOCK_STAND_X + 0.45, 3.42 + DOCK_PLANKS.top, DOCK_STAND_Z + 6.9];
const CHEST_Y = 1.05;
const REEL_POINT = new THREE.Vector3(DOCK_STAND_X, 0, DOCK_STAND_Z - 1.4);

function facingDelta(distance: number): [number, number] {
  return [Math.sin(anglerPose.yaw) * distance, Math.cos(anglerPose.yaw) * distance];
}

// Live bobber world position, written by LineAndBobber each frame so
// CameraRig and CaughtFish can read it without prop drilling.
export const bobberWorld = new THREE.Vector3(0.55, 0, -2);

// Last fight's sim object, captured by LineAndBobber while fighting. The game
// nulls the sim ref before the "result" phase commits, so end-of-fight effects
// read this to tell a landing (line reeled to exactly 0) from a break/escape.
let lastFightSim: FightSim | null = null;

function fightEndedLanded() {
  return lastFightSim !== null && lastFightSim.line <= 0;
}

const NO_WIND = { x: 0, z: 0 };

const landedFrom = new THREE.Vector3();
const landedFish = new THREE.Vector3();

/**
 * The scene keeps its live pose in module state, which outlives the page.
 * Leaving /play mid-fight and coming back must not resume a dead landing or
 * put the angler where they stood last visit.
 */
export function resetFishingScene() {
  resetAnglerPose();
  resetBoat();
  resetFightView();
  resetLandView();
  clearCatchShot();
  resetMissView();
  resetWaitView();
  lastFightSim = null;
  bobberWorld.set(0.55, 0, -2);
  landedFrom.set(0, 0, 0);
  landedFish.set(0, 0, 0);
  Object.assign(holdScratch, { x: 0, y: 0, z: 0 });
  REEL_POINT.set(DOCK_STAND_X, 0, DOCK_STAND_Z - 1.4);
}
const holdScratch = { x: 0, y: 0, z: 0 };

function updateMiss(phase: ScenePhase, prevPhase: ScenePhase, delta: number) {
  if (prevPhase === "hookset" && phase === "result") {
    missView.active = true;
    missView.age = 0;
    missView.fromSag = biteLineSag(fightView.biteAge);
    missView.fromPlunge = fightView.plunge;
    missView.x = bobberWorld.x;
    missView.z = bobberWorld.z;
  }
  if (phase === "result" && missView.active) {
    missView.age += Math.min(delta, 0.05);
    return;
  }
  if (phase !== "result") {
    missView.active = false;
    missView.age = -1;
  }
}

function updateLanding(phase: ScenePhase, prevPhase: ScenePhase, delta: number, time: number) {
  if (prevPhase === "fight" && phase === "result" && fightEndedLanded()) {
    landedFrom.set(
      bobberWorld.x + fightView.localX,
      bobberWorld.y + fightView.localY,
      bobberWorld.z + fightView.localZ,
    );
    const dx = anglerPose.x - landedFrom.x;
    const dz = anglerPose.z - landedFrom.z;
    landView.haulYaw = dx * dx + dz * dz > 0.04 ? Math.atan2(dx, dz) : anglerPose.yaw;
    landView.active = true;
    landView.age = LIFT_START_AGE;
  }
  if (phase === "result" && landView.active) {
    landView.presentYaw = landPresentYaw(anglerPose.yaw);
    landView.swing = landSwing(landView.age);
    landHoldPoint(holdScratch, anglerPose.x, anglerPose.y + anglerPose.bob, anglerPose.z, anglerPose.yaw, landView.age);
    placeLandedFish(landedFish, landedFrom, holdScratch, landView.swing);
    landedFish.y += landHoldShake(landView.age, time) - liftDepth(landView.age);
    landedFish.y = clearFightLine(landedFish.y, landedFish.x, landedFish.z);
    landView.age += Math.min(delta, 0.05);
    return;
  }
  if (phase !== "result") {
    landView.active = false;
    landView.age = -1;
    landView.swing = 0;
  }
}

function isFighting(phase: ScenePhase) {
  return phase === "fight" || phase === "hookset";
}

function placeBobber(
  out: THREE.Vector3,
  power: number,
  phase: ScenePhase,
  t: number,
  aim: THREE.Vector3 | null,
  nibble: boolean,
  level: number,
  weight = 0,
) {
  if (aim) {
    out.x = aim.x;
    out.z = aim.z;
  } else {
    const reach = Math.min(CAST_RANGE * 0.85, 5.2 + power * 9.5) * castRangeMultiplier(level);
    const [dx, dz] = facingDelta(reach);
    out.x = anglerPose.x + dx;
    out.z = anglerPose.z + dz;
  }
  if (phase === "fight") out.y = -0.14;
  else if (phase === "hookset") out.y = 0.07;
  else if (nibble) out.y = nibbleBob(t, weight);
  else out.y = 0.07 + Math.sin(t * 2.4) * 0.04;
}

function isAiming(phase: ScenePhase) {
  return phase === "idle" || phase === "casting";
}

function CameraRig({ phase, sim }: { phase: ScenePhase; sim: SimRef }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, gl } = useThree();
  /** How far the camera is drawn in toward the target so a hill or tree never sits in front of the angler. */
  const clip = useMemo(() => ({ pull: 0, applied: false, target: new THREE.Vector3(), saved: new THREE.Vector3() }), []);
  const chest = useMemo(() => new THREE.Vector3(DOCK_STAND_X, CHEST_Y + DOCK_PLANKS.top, DOCK_STAND_Z), []);
  const follow = useMemo(() => new THREE.Vector3(DOCK_STAND_X, CHEST_Y + DOCK_PLANKS.top, DOCK_STAND_Z), []);
  const lastFollow = useMemo(() => new THREE.Vector3(DOCK_STAND_X, CHEST_Y + DOCK_PLANKS.top, DOCK_STAND_Z), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const restTarget = useMemo(() => new THREE.Vector3(), []);
  const focusPoint = useMemo(() => new THREE.Vector3(), []);
  const shakeOffset = useMemo(() => new THREE.Vector3(), []);
  const shakeAmp = useRef(0);
  const heave = useRef(0);
  const glide = useMemo(() => new THREE.Vector2(), []);
  const wasFight = useRef(false);
  const returning = useRef(false);
  const prevPhase = useRef(phase);
  const prevSurge = useRef(0);
  const biteYanked = useRef(false);
  /** Where the player left the camera. Beats come in from here and hand back to it. */
  const userDistance = useRef<number | null>(null);
  const beating = useRef(false);
  const fighting = phase === "fight";
  // Reduced motion: no shake on the strike, surge or snap, and no walking heave.
  const calm = useReducedMotion();
  const rest = useMemo(() => [DOCK_STAND_X, CHEST_Y + DOCK_PLANKS.top, DOCK_STAND_Z] as [number, number, number], []);

  useEffect(() => {
    const canvas = gl.domElement;
    const preventMenu = (event: MouseEvent) => event.preventDefault();
    canvas.addEventListener("contextmenu", preventMenu);
    return () => canvas.removeEventListener("contextmenu", preventMenu);
  }, [gl]);

  // The pull-in sits on top of the free camera from the end of one frame to the start of the next,
  // so drawing and pointer picks both see it while OrbitControls and the beats keep the player's own distance.
  // Priority -2 runs before OrbitControls' own update (-1).
  useFrame(() => {
    if (!clip.applied) return;
    camera.position.copy(clip.saved);
    clip.applied = false;
  }, -2);
  const applyPull = () => {
    if (clip.pull <= 1e-3) return;
    const distance = camera.position.distanceTo(clip.target);
    if (distance < 1e-3) return;
    clip.saved.copy(camera.position);
    clip.applied = true;
    camera.position.sub(clip.target).multiplyScalar((distance - clip.pull) / distance).add(clip.target);
  };

  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (isFrozen(state.clock.elapsedTime, fightView.freezeUntil)) {
      applyPull();
      return;
    }
    orbit.enabled = !fighting;
    const t = state.clock.elapsedTime;
    chest.set(anglerPose.x, CHEST_Y + anglerPose.y, anglerPose.z);
    const [dx, dz] = facingDelta(1.4);
    REEL_POINT.set(anglerPose.x + dx, 0, anglerPose.z + dz);

    if (prevPhase.current !== "fight" && phase === "fight") shakeAmp.current = Math.max(shakeAmp.current, 0.09);
    if (phase === "hookset" && !biteYanked.current && fightView.plunge > 0.25) {
      biteYanked.current = true;
      shakeAmp.current = Math.max(shakeAmp.current, 0.05);
    }
    if (phase !== "hookset") biteYanked.current = false;
    if (prevPhase.current === "fight" && phase !== "fight" && !fightEndedLanded()) shakeAmp.current = 0.12;
    prevPhase.current = phase;
    const surge = sim.current?.surge ?? 0;
    if (fighting && surge === 2 && prevSurge.current !== 2) shakeAmp.current = Math.max(shakeAmp.current, 0.09);
    prevSurge.current = surge;
    camera.position.sub(shakeOffset);
    camera.position.y -= heave.current;

    const glideK = 1 - Math.exp(-1.5 * delta);
    glide.x += (anglerPose.vx - glide.x) * glideK;
    glide.y += (anglerPose.vz - glide.y) * glideK;
    const speed = Math.hypot(glide.x, glide.y);
    if (!fighting && speed > 0.15) {
      const lead = Math.min(2.6, speed * 0.58);
      desired.set(chest.x + (glide.x / speed) * lead, chest.y, chest.z + (glide.y / speed) * lead);
    } else desired.copy(chest);
    // Landing portrait: frame between the chest and the fish held up in the hands.
    const landing = !calm && phase === "result" && landView.active ? landingWeight(landView.age) * 0.5 : 0;
    if (landing > 0) {
      desired.x += (holdScratch.x - desired.x) * landing;
      desired.y += (holdScratch.y - desired.y) * landing;
      desired.z += (holdScratch.z - desired.z) * landing;
    }

    if (fighting) {
      if (!wasFight.current) {
        wasFight.current = true;
        if (!returning.current) restTarget.copy(orbit.target);
        returning.current = false;
      }
      focusPoint.copy(chest).add(bobberWorld).multiplyScalar(0.5);
      focusPoint.lerpVectors(restTarget, focusPoint, 0.35);
      orbit.target.lerp(focusPoint, 1 - Math.exp(-4.5 * delta));
      orbit.update();
    } else {
      if (wasFight.current) {
        wasFight.current = false;
        returning.current = true;
        follow.copy(orbit.target);
        lastFollow.copy(orbit.target);
      }
      if (returning.current) {
        const blend = 1 - Math.exp(-4.5 * delta);
        follow.lerp(desired, blend);
        orbit.target.lerp(follow, blend);
        if (orbit.target.distanceToSquared(desired) < 0.0008) returning.current = false;
        lastFollow.copy(follow);
        orbit.update();
      } else {
        follow.lerp(desired, 1 - Math.exp(-2.35 * delta));
        camera.position.x += follow.x - lastFollow.x;
        camera.position.y += follow.y - lastFollow.y;
        camera.position.z += follow.z - lastFollow.z;
        orbit.target.x += follow.x - lastFollow.x;
        orbit.target.y += follow.y - lastFollow.y;
        orbit.target.z += follow.z - lastFollow.z;
        lastFollow.copy(follow);
        orbit.update();
      }
    }

    // Camera beats: lean in on the fight, come close for the landing, then give the player's distance back.
    const distance = camera.position.distanceTo(orbit.target);
    if (userDistance.current === null) userDistance.current = distance;
    let beatTarget: number | null = null;
    if (!calm && fighting) beatTarget = beatDistance(userDistance.current, fightDistance(surge, fightView.tension));
    else if (!calm && phase === "result" && landView.active && landingFramed(landView.age)) {
      beatTarget = landingDistance(userDistance.current, landView.age);
    }
    if (beatTarget !== null) beating.current = true;
    else if (beating.current) {
      beatTarget = userDistance.current;
      if (Math.abs(distance - userDistance.current) < 0.03) beating.current = false;
    }
    if (beating.current && beatTarget !== null && distance > 1e-3) {
      const next = dollyStep(distance, beatTarget, delta);
      camera.position.sub(orbit.target).multiplyScalar(next / distance).add(orbit.target);
    } else userDistance.current = distance;

    if (calm) shakeAmp.current = 0;
    if (shakeAmp.current > 0.001) {
      shakeAmp.current *= Math.exp(-delta / 0.13);
      const amp = shakeAmp.current * SHAKE_SCALE[settings.shake];
      shakeOffset.set(
        Math.sin(t * 47) * amp,
        Math.sin(t * 53 + 1.3) * amp,
        Math.sin(t * 41 + 2.1) * amp,
      );
    } else {
      shakeAmp.current = 0;
      shakeOffset.set(0, 0, 0);
    }
    const heaveTarget = !calm && !fighting && anglerPose.moving ? Math.sin(anglerPose.gait * 2) * 0.055 : 0;
    heave.current += (heaveTarget - heave.current) * (1 - Math.exp(-10 * delta));
    camera.position.y += heave.current;
    camera.position.add(shakeOffset);

    clip.target.copy(orbit.target);
    const free = camera.position.distanceTo(orbit.target);
    const clear = clearDistance(orbit.target, camera.position, CAMERA_HILLS, CAMERA_TREES);
    clip.pull = easePull(clip.pull, free - clear, delta);
    applyPull();
  });

  return (
    <OrbitControls
      ref={controls}
      target={rest}
      enableDamping
      dampingFactor={0.14}
      enablePan={false}
      minDistance={3.4}
      maxDistance={15}
      minPolarAngle={0.48}
      maxPolarAngle={1.38}
      mouseButtons={{ LEFT: -1 as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
      touches={{ ONE: -1 as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
}

type AimState = {
  live: THREE.Vector3;
  overWater: boolean;
};

type CastAimState = "ok" | "stance" | "shore" | "range" | "basin";

function castAimState(
  fishing: boolean,
  overWater: boolean,
  inRange: boolean,
  waterSpot: SpotId | null,
  stance: StanceId,
): CastAimState {
  if (!fishing) return "stance";
  if (!overWater) return "shore";
  if (!inRange) return "range";
  if (waterSpot !== stance) return "basin";
  return "ok";
}

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** Writes a data attribute only when it changes, so a still frame touches nothing the page's styles watch. */
function setData(element: HTMLElement, key: string, value: string) {
  if (element.dataset[key] !== value) element.dataset[key] = value;
}

type WaterAimProps = { phase: ScenePhase; aim: AimState; level: number; powerRef: { current: number }; accuracy: number };

function WaterAim({ phase, aim, level, powerRef, accuracy }: WaterAimProps) {
  const marker = useRef<THREE.Group>(null);
  const chargeRing = useRef<THREE.Mesh>(null);
  const chargeMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const band = useMemo(() => sweetBand(accuracy), [accuracy]);
  const walkMarker = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ground = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef(new THREE.Vector2());
  const wrap = useSceneWrap();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const now = useRef(0);
  const castState = useRef<CastAimState>("stance");
  const syncAim = useRef((_time: number) => {});
  // What the last full aim check saw; when none of it has moved, only the marker rides the chop.
  const lastAim = useRef<(number | string)[]>([]);
  syncAim.current = (time: number) => {
    if (!isAiming(phaseRef.current)) {
      if (marker.current) marker.current.visible = false;
      lastAim.current = [];
      return;
    }
    const seen = aimInputs(pointer.current, camera, anglerPose.x, anglerPose.z, aboard() ? boat.mode : "ashore", level);
    if (sameAim(seen, lastAim.current)) {
      if (marker.current?.visible) marker.current.position.y = waterHeight(hit.x, hit.z, time) + 0.06;
      return;
    }
    lastAim.current = seen;
    raycaster.setFromCamera(pointer.current, camera);
    const point = waterRayHit(raycaster.ray.origin, raycaster.ray.direction, time, hit);
    const overWater = point != null && inLake(point.x, point.z);
    // A boat under way is no stance to cast from, even over a pad.
    const stance = aboard() && boat.mode !== "anchored" ? "trail" : stanceAt(anglerPose.x, anglerPose.z);
    const fishing = isFishingStance(stance);
    const inRange = overWater && inCastRange(anglerPose.x, anglerPose.z, hit.x, hit.z, level, stance === "open");
    const waterSpot = overWater ? spotAt(hit.x, hit.z) : null;
    const cast = castAimState(fishing, overWater, inRange, waterSpot, stance);
    castState.current = cast;
    const canCast = cast === "ok";
    aim.overWater = canCast;
    if (overWater) aim.live.copy(hit);
    if (marker.current) {
      marker.current.visible = canCast;
      if (canCast) marker.current.position.set(hit.x, waterHeight(hit.x, hit.z, time) + 0.06, hit.z);
    }
    if (wrap.current) {
      setData(wrap.current, "aim", overWater ? `${hit.x.toFixed(3)},${hit.z.toFixed(3)}` : "none");
      setData(wrap.current, "spot", waterSpot ?? "shore");
      setData(wrap.current, "cast", cast);
    }
  };

  /** A tap on open shore walks there instead of casting. Runs before the cast handler sees the press. */
  const tryWalk = (event: PointerEvent) => {
    if (!wrap.current) return;
    wrap.current.dataset.walk = "0";
    const phaseNow = phaseRef.current;
    if (phaseNow !== "idle" && phaseNow !== "result") return;
    if (event.target !== gl.domElement || !event.isPrimary || event.button !== 0) return;
    if (castState.current === "ok") return;
    raycaster.setFromCamera(pointer.current, camera);
    if (!raycaster.ray.intersectPlane(GROUND, ground)) return;
    if (!walkAnglerTo(ground.x, ground.z)) return;
    wrap.current.dataset.walk = "1";
  };
  const tryWalkRef = useRef(tryWalk);
  tryWalkRef.current = tryWalk;

  useEffect(() => {
    const onPoint = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      syncAim.current(now.current);
      if (event.type === "pointerdown") tryWalkRef.current(event);
    };
    return listenForWaterAim(window, onPoint);
  }, [gl]);

  useFrame((state) => {
    now.current = state.clock.elapsedTime;
    syncAim.current(now.current);
    if (chargeRing.current && chargeMaterial.current) {
      const charging = phaseRef.current === "casting" && powerRef.current > 0;
      chargeRing.current.visible = charging;
      if (charging) {
        const ring = castRing(powerRef.current, band);
        chargeRing.current.scale.setScalar(ring.radius);
        chargeMaterial.current.color.set(CAST_RING_COLORS[ring.tone]);
        chargeMaterial.current.opacity = ring.opacity;
      }
      if (wrap.current) setData(wrap.current, "castRing", charging ? castRing(powerRef.current, band).tone : "none");
    }
    const goal = anglerPose.route[anglerPose.route.length - 1];
    if (walkMarker.current) {
      walkMarker.current.visible = goal !== undefined;
      if (goal) walkMarker.current.position.set(goal.x, footHeight(goal.x, goal.z) + 0.04, goal.z);
    }
  });

  return (
    <>
      <group ref={marker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.48, 28]} />
          <meshBasicMaterial color="#e7f2ea" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.08, 12]} />
          <meshBasicMaterial color="#f4fff6" transparent opacity={0.7} depthWrite={false} />
        </mesh>
        {/* The cast meter: unit radius, scaled by power each frame. */}
        <mesh ref={chargeRing} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial ref={chargeMaterial} color={CAST_RING_COLORS.short} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <group ref={walkMarker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.3, 24]} />
          <meshBasicMaterial color="#f6e2b8" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

function FightMotion({ phase, sim }: { phase: ScenePhase; sim: SimRef }) {
  const prevPhase = useRef(phase);
  const prevSurge = useRef(0);
  const biteAt = useRef(-1);
  const strikeAt = useRef(-1);
  const nextLeap = useRef(0);
  const runSide = useRef(0.75);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    updateMiss(phase, prevPhase.current, dt);
    updateLanding(phase, prevPhase.current, dt, t);
    const surge = (sim.current?.surge ?? 0) as FightSurge;
    const tension = sim.current?.tension ?? 0.2;
    const live = phase === "fight" && sim.current != null;

    if (phase === "hookset") {
      if (biteAt.current < 0) biteAt.current = t;
      strikeAt.current = -1;
    } else if (phase === "fight") {
      if (prevPhase.current !== "fight") {
        fightView.freezeUntil = t + HIT_STOP_SEC;
        strikeAt.current = t;
        fightView.leapAge = 0;
        nextLeap.current = t + 1.25;
      }
      biteAt.current = -1;
    } else {
      biteAt.current = -1;
      strikeAt.current = -1;
    }

    const active = phase === "hookset" || phase === "fight";
    fightView.active = active;
    fightView.time = t;
    fightView.surge = live ? surge : 0;
    fightView.tension = tension;
    fightView.reeling = live && fightInput.reeling;
    fightView.strikeAge = strikeAt.current >= 0 ? t - strikeAt.current : -1;
    fightView.biteAge = biteAt.current >= 0 ? t - biteAt.current : 0;

    if (live && surge === 1 && prevSurge.current === 0) {
      const sign = Math.random() < 0.5 ? -1 : 1;
      runSide.current = sign * (0.65 + Math.random() * 0.35);
    }
    if (!active) runSide.current = 0.75;
    fightView.runSide = runSide.current;

    if (fightView.reeling) fightView.pump += dt * (surge === 2 ? 0.7 : 1.15);

    if (live) {
      const leadTarget = fishLeadMeters(surge, fightView.reeling);
      const sideTarget = fishSideMeters(surge, runSide.current);
      const depthTarget = fishDepthMeters(surge);
      const pullTarget = bobberPull(surge, fightView.reeling);
      const leadRate = surge === 2 && !fightView.reeling ? 4.8 : fightView.reeling ? 6.2 : 3.6;
      const pullRate = surge === 2 && !fightView.reeling ? 5.4 : 3.4;
      fightView.lead += (leadTarget - fightView.lead) * (1 - Math.exp(-leadRate * dt));
      fightView.side += (sideTarget - fightView.side) * (1 - Math.exp(-4.4 * dt));
      fightView.depth += (depthTarget - fightView.depth) * (1 - Math.exp(-4.2 * dt));
      fightView.pull += (pullTarget - fightView.pull) * (1 - Math.exp(-pullRate * dt));
      fightView.sag = fightLineSag(tension, surge, fightView.reeling, fightView.pump);
      fightView.tug = hooksetTug(fightView.strikeAge);
      if (fightView.strikeAge >= 0 && fightView.strikeAge < HOOKSET_SEC) fightView.sag = Math.min(fightView.sag, 0.1);
      fightView.plunge = bobberPlunge(0, fightView.strikeAge, surge);
      if (surge === 2 && prevSurge.current !== 2 && fightView.leapAge < 0) nextLeap.current = t + 0.22;
    } else {
      fightView.lead = 0.32;
      fightView.side = 0;
      fightView.depth = 0.42;
      fightView.pull = 0;
      fightView.sag = 0.22;
      fightView.tug = 0;
      fightView.pump = 0;
      if (phase !== "fight") fightView.leapAge = -1;
      fightView.plunge = phase === "hookset" ? bobberPlunge(fightView.biteAge, -1, 0) : 0;
    }

    if (phase === "fight" && fightView.leapAge >= 0) {
      fightView.leapAge += dt;
      if (fightView.leapAge >= FISH_LEAP_SEC) {
        fightView.leapAge = -1;
        nextLeap.current = t + 0.95;
      }
    } else if (live && surge === 2 && fightView.leapAge < 0 && t >= nextLeap.current) {
      fightView.leapAge = 0;
    } else if (phase !== "fight") fightView.leapAge = -1;

    prevSurge.current = surge;
    prevPhase.current = phase;
  });

  return null;
}

type LineAndBobberProps = Omit<Props, "sky" | "season" | "spot" | "hotspot" | "tracks" | "accuracy"> & { rodTip: THREE.Vector3; aim: AimState; lookAt: THREE.Vector3 };

function SurfaceRipple({ active, sim, sunk }: { active: boolean; sim: SimRef; sunk: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!active || !group.current || !material.current) return;
    const speed = sunk ? (sim.current?.surge === 2 ? 1.8 : 1) : 2.2;
    const pulse = (state.clock.elapsedTime * 0.72 * speed) % 1;
    // Fight sinks the bobber to y=-0.14. A bite leaves it on the surface and plunge pulls it under.
    group.current.position.y = sunk ? 0.165 + fightView.plunge : fightView.plunge - 0.05;
    const take = !sunk && fightView.plunge > 0.2 ? 1.35 : 1;
    group.current.scale.setScalar((0.55 + pulse * 2.3) * take);
    material.current.opacity = (1 - pulse) * 0.4;
  });
  return (
    <group ref={group} visible={active} position={[0, 0.165, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.3, 32]} />
        <meshBasicMaterial ref={material} color="#d6e1d4" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

type BurstRef = { current: () => void };

const SPRAY_COUNT = 14;

function SurgeSpray({ sim, burstRef }: { sim: SimRef; burstRef: BurstRef }) {
  const velocities = useMemo(() => new Float32Array(SPRAY_COUNT * 3), []);
  const life = useMemo(() => new Float32Array(SPRAY_COUNT), []);
  const prevSurge = useRef(0);
  const pool = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.045, 6, 5);
    const holder = new THREE.Group();
    for (let i = 0; i < SPRAY_COUNT; i += 1) {
      const material = new THREE.MeshBasicMaterial({ color: 0xeef6ee, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      holder.add(mesh);
    }
    return holder;
  }, []);

  useEffect(() => {
    burstRef.current = () => {
      for (let i = 0; i < SPRAY_COUNT; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.25 + Math.random() * 0.65;
        velocities[i * 3] = Math.cos(angle) * spread;
        velocities[i * 3 + 1] = 1.6 + Math.random() * 1.1;
        velocities[i * 3 + 2] = Math.sin(angle) * spread;
        life[i] = 0.45 + Math.random() * 0.25;
        const mesh = pool.children[i] as THREE.Mesh;
        mesh.position.set(0, 0.22, 0);
        mesh.visible = true;
      }
    };
    return () => {
      burstRef.current = () => {};
      (pool.children[0] as THREE.Mesh).geometry.dispose();
      pool.children.forEach((child) => ((child as THREE.Mesh).material as THREE.Material).dispose());
    };
  }, [burstRef, life, pool, velocities]);

  const prevStrike = useRef(-1);
  useFrame((_, delta) => {
    const surge = sim.current?.surge ?? 0;
    const age = fightView.strikeAge;
    if (surge === 2 && prevSurge.current !== 2) burstRef.current();
    if (age >= 0 && age < 0.06 && prevStrike.current < 0) burstRef.current();
    prevSurge.current = surge;
    prevStrike.current = age >= 0 ? age : -1;
    pool.position.set(fightView.localX, fightView.localY, fightView.localZ);
    for (let i = 0; i < SPRAY_COUNT; i += 1) {
      if (life[i]! <= 0) continue;
      life[i] -= delta;
      const mesh = pool.children[i] as THREE.Mesh;
      if (life[i]! <= 0 || mesh.position.y < 0.05) {
        life[i] = 0;
        mesh.visible = false;
        continue;
      }
      velocities[i * 3 + 1] -= 6.5 * delta;
      mesh.position.x += velocities[i * 3]! * delta;
      mesh.position.y += velocities[i * 3 + 1]! * delta;
      mesh.position.z += velocities[i * 3 + 2]! * delta;
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, life[i]! * 2.4);
    }
  });

  return <primitive object={pool} />;
}

function EntrySpray({ burstRef }: { burstRef: BurstRef }) {
  const velocities = useMemo(() => new Float32Array(ENTRY_DROPS * 3), []);
  const life = useMemo(() => new Float32Array(ENTRY_DROPS), []);
  const pool = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.035, 6, 5);
    const holder = new THREE.Group();
    for (let i = 0; i < ENTRY_DROPS; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xe7f3ee,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      holder.add(mesh);
    }
    return holder;
  }, []);

  useEffect(() => {
    burstRef.current = () => {
      for (let i = 0; i < ENTRY_DROPS; i += 1) {
        const angle = (i / ENTRY_DROPS) * Math.PI * 2 + Math.random() * 0.35;
        const spread = 0.75 + Math.random() * 1.15;
        velocities[i * 3] = Math.cos(angle) * spread;
        velocities[i * 3 + 1] = 1.9 + Math.random() * 1.5;
        velocities[i * 3 + 2] = Math.sin(angle) * spread;
        life[i] = 0.34 + Math.random() * 0.16;
        const mesh = pool.children[i] as THREE.Mesh;
        mesh.position.set((Math.random() - 0.5) * 0.08, 0.06, (Math.random() - 0.5) * 0.08);
        mesh.visible = true;
      }
    };
    return () => {
      burstRef.current = () => {};
      (pool.children[0] as THREE.Mesh).geometry.dispose();
      pool.children.forEach((child) => ((child as THREE.Mesh).material as THREE.Material).dispose());
    };
  }, [burstRef, life, pool, velocities]);

  useFrame((_, delta) => {
    for (let i = 0; i < ENTRY_DROPS; i += 1) {
      if (life[i]! <= 0) continue;
      life[i] -= delta;
      const mesh = pool.children[i] as THREE.Mesh;
      if (life[i]! <= 0 || mesh.position.y < -0.02) {
        life[i] = 0;
        mesh.visible = false;
        continue;
      }
      velocities[i * 3 + 1] -= 9.5 * delta;
      mesh.position.x += velocities[i * 3]! * delta;
      mesh.position.y += velocities[i * 3 + 1]! * delta;
      mesh.position.z += velocities[i * 3 + 2]! * delta;
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, life[i]! * 3);
    }
  });

  return <primitive object={pool} />;
}

function HookedFish({
  fishRef,
  burstRef,
  color,
  accent,
  build,
}: {
  fishRef: RefObject<THREE.Group | null>;
  burstRef: BurstRef;
  color: string;
  accent: string;
  build: FishBuild;
}) {
  const prevLeap = useRef(-1);
  useFrame(() => {
    if (prevLeap.current >= 0 && fightView.leapAge < 0) burstRef.current();
    prevLeap.current = fightView.leapAge;
  });
  return (
    <group ref={fishRef} scale={FIGHT_FISH_SCALE} visible={false}>
      <ArticulatedFish color={color} accent={accent} speed={3.4} intensity={FIGHT_WAG} unlit build={build} />
    </group>
  );
}

const WAKE_RINGS = 10;
const WAKE_LIFE = 1.15;

function RetrieveWake() {
  const rings = useMemo(() => {
    const geometry = new THREE.RingGeometry(0.34, 0.58, 24);
    return Array.from({ length: WAKE_RINGS }, () => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xf4fff8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.userData.born = -1;
      return mesh;
    });
  }, []);
  const cursor = useRef(0);
  const lastDrop = useRef(-1);

  useEffect(() => {
    return () => {
      rings[0]?.geometry.dispose();
      rings.forEach((ring) => (ring.material as THREE.Material).dispose());
    };
  }, [rings]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const wake = retrieveWake(fightView.pump, fightView.active && fightView.reeling, fightView.surge);
    if (wake > 0.42 && time - lastDrop.current > 0.09) {
      lastDrop.current = time;
      const ring = rings[cursor.current % rings.length];
      cursor.current += 1;
      ring.userData.born = time;
      ring.userData.x = bobberWorld.x;
      ring.userData.z = bobberWorld.z;
    }
    rings.forEach((ring) => {
      const born = ring.userData.born as number;
      const age = time - born;
      if (born < 0 || age > WAKE_LIFE) {
        ring.visible = false;
        return;
      }
      const x = ring.userData.x as number;
      const z = ring.userData.z as number;
      const u = age / WAKE_LIFE;
      ring.visible = true;
      ring.position.set(x, waterHeight(x, z, time) + 0.045, z);
      ring.scale.setScalar(0.85 + u * 2.8);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - u) * (1 - u) * 0.78;
    });
  });

  return (
    <group>
      {rings.map((ring, i) => (
        <primitive key={i} object={ring} />
      ))}
    </group>
  );
}

const NIBBLE_RINGS = 6;
const NIBBLE_RING_LIFE = 0.9;

/** Small rings spreading from the float with each nibble's tap, so a nibble shows even when the bob is hard to see. */
function NibbleRings({ nibble, weight }: { nibble: boolean; weight: number }) {
  const rings = useMemo(() => {
    const geometry = new THREE.RingGeometry(0.22, 0.3, 24);
    return Array.from({ length: NIBBLE_RINGS }, () => {
      const material = new THREE.MeshBasicMaterial({ color: 0xeef8f2, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 3;
      mesh.visible = false;
      mesh.userData.born = -1;
      return mesh;
    });
  }, []);
  const cursor = useRef(0);
  const lastRing = useRef(-Infinity);

  useEffect(() => {
    return () => {
      rings[0]?.geometry.dispose();
      rings.forEach((ring) => (ring.material as THREE.Material).dispose());
    };
  }, [rings]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (nibble && time - lastRing.current >= nibbleRingGap(weight)) {
      lastRing.current = time;
      const ring = rings[cursor.current % rings.length]!;
      cursor.current += 1;
      ring.userData.born = time;
      ring.userData.x = bobberWorld.x;
      ring.userData.z = bobberWorld.z;
    }
    rings.forEach((ring) => {
      const born = ring.userData.born as number;
      const age = time - born;
      if (born < 0 || age > NIBBLE_RING_LIFE) {
        ring.visible = false;
        return;
      }
      const x = ring.userData.x as number;
      const z = ring.userData.z as number;
      const u = age / NIBBLE_RING_LIFE;
      ring.visible = true;
      ring.position.set(x, waterHeight(x, z, time) + 0.04, z);
      ring.scale.setScalar(0.7 + u * 2.2);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - u) * (1 - u) * 0.7;
    });
  });

  return (
    <group>
      {rings.map((ring, i) => (
        <primitive key={i} object={ring} />
      ))}
    </group>
  );
}

/** Water shaken off the bobber as it pops clear on a missed strike. */
function MissDrips() {
  const pool = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.022, 5, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0xe8f6f4, transparent: true, opacity: 0.85, depthWrite: false });
    const holder = new THREE.Group();
    for (let i = 0; i < MISS_DRIPS; i += 1) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      holder.add(mesh);
    }
    return holder;
  }, []);

  useEffect(() => {
    return () => {
      const first = pool.children[0] as THREE.Mesh;
      first.geometry.dispose();
      (first.material as THREE.Material).dispose();
    };
  }, [pool]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    pool.children.forEach((child, i) => {
      const drop = missView.active ? missDrip(i, missView.age, missView.fromPlunge) : null;
      child.visible = !!drop;
      if (!drop) return;
      const x = missView.x + drop.x;
      const z = missView.z + drop.z;
      child.position.set(x, waterHeight(x, z, time) + drop.y, z);
    });
  });

  return <primitive object={pool} />;
}

const RETRIEVE_DROPS = 8;

function RetrieveSplash() {
  const velocities = useMemo(() => new Float32Array(RETRIEVE_DROPS * 3), []);
  const life = useMemo(() => new Float32Array(RETRIEVE_DROPS), []);
  const lastStroke = useRef(-1);
  const pool = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.07, 6, 5);
    const holder = new THREE.Group();
    for (let i = 0; i < RETRIEVE_DROPS; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xf7fffb,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      holder.add(mesh);
    }
    return holder;
  }, []);

  useEffect(() => {
    return () => {
      (pool.children[0] as THREE.Mesh).geometry.dispose();
      pool.children.forEach((child) => ((child as THREE.Mesh).material as THREE.Material).dispose());
    };
  }, [pool]);

  useFrame((_, delta) => {
    const pumping = fightView.active && fightView.reeling;
    const wake = retrieveWake(fightView.pump, pumping, fightView.surge);
    const stroke = Math.floor(Math.max(0, fightView.pump));
    if (wake > 0.82 && lastStroke.current !== stroke) {
      lastStroke.current = stroke;
      const dx = bobberWorld.x - anglerPose.x;
      const dz = bobberWorld.z - anglerPose.z;
      const reach = Math.hypot(dx, dz) || 1;
      const outX = dx / reach;
      const outZ = dz / reach;
      const side = Math.sign(retrieveWeave(fightView.pump, true, fightView.surge) || 1);
      for (let i = 0; i < RETRIEVE_DROPS; i += 1) {
        const along = -0.35 - Math.random() * 1.1;
        const kick = (Math.random() - 0.5) * 1.3 + side * 0.55;
        velocities[i * 3] = outX * along - outZ * kick;
        velocities[i * 3 + 1] = 2.2 + Math.random() * 1.5;
        velocities[i * 3 + 2] = outZ * along + outX * kick;
        life[i] = 0.4 + Math.random() * 0.18;
        const mesh = pool.children[i] as THREE.Mesh;
        mesh.position.set(bobberWorld.x, bobberWorld.y + 0.14, bobberWorld.z);
        mesh.visible = true;
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      }
    }
    for (let i = 0; i < RETRIEVE_DROPS; i += 1) {
      if (life[i]! <= 0) continue;
      life[i] -= delta;
      const mesh = pool.children[i] as THREE.Mesh;
      if (life[i]! <= 0 || mesh.position.y < 0.02) {
        life[i] = 0;
        mesh.visible = false;
        continue;
      }
      velocities[i * 3 + 1] -= 7.2 * delta;
      mesh.position.x += velocities[i * 3]! * delta;
      mesh.position.y += velocities[i * 3 + 1]! * delta;
      mesh.position.z += velocities[i * 3 + 2]! * delta;
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.92, life[i]! * 2.8);
    }
  });

  return <primitive object={pool} />;
}

const SPLASH_SEC = 0.55;
const ENTRY_DROPS = 9;
const LINE_POINTS = 11;
const LINE_TAIL = 1;
const LINE_CAP = LINE_POINTS + 4 + LINE_TAIL;
const FALLBACK_COLOR = "#b96f43";
const FALLBACK_ACCENT = "#e7bd72";

function RisingFish({ phase, color, accent, size, build }: { phase: ScenePhase; color: string; accent: string; size: number; build: FishBuild }) {
  const fish = useRef<THREE.Group>(null);
  const held = useRef(0);
  useFrame((state) => {
    const g = fish.current;
    if (!g) return;
    const missing = phase === "result" && missView.active;
    const landing = phase === "result" && landView.active;
    const flying = phase === "waiting" && waitView.age < 0;
    const mode = riseMode(phase, flying, missing, landing);
    if (mode === "rise") held.current = Math.max(0, waitView.age);
    if (mode === "off") {
      g.visible = false;
      return;
    }
    const parent = g.parent;
    const bx = parent?.position.x ?? bobberWorld.x;
    const bz = parent?.position.z ?? bobberWorld.z;
    const time = state.clock.elapsedTime;
    const pose =
      mode === "take"
        ? takePose(fightView.biteAge, held.current, bx, bz, anglerPose.x, anglerPose.z, time, size)
        : mode === "turn"
          ? turnPose(missView.age, bx, bz, anglerPose.x, anglerPose.z, time, size)
          : risePose(waitView.age, bx, bz, anglerPose.x, anglerPose.z, time, size);
    g.visible = pose.show;
    if (!pose.show || !parent) return;
    g.position.set(pose.x - parent.position.x, pose.y - parent.position.y, pose.z - parent.position.z);
    g.rotation.set(pose.pitch, pose.yaw, 0);
  });
  return (
    <group ref={fish} visible={false} scale={RISE_SCALE * size}>
      <ArticulatedFish color={color} accent={accent} speed={2.6} intensity={1.25} build={build} />
    </group>
  );
}

/** The float, its body painted the colour picked in Settings. */
function FloatModel() {
  const colour = useSettings().floatColour;
  const { scene } = useGLTF(BUOY_URL);
  const model = useMemo(() => {
    const next = scene.clone(true);
    next.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      // The clone shares geometry with the cached model, so repaint a copy.
      obj.geometry = obj.geometry.clone();
      const uv = obj.geometry.getAttribute("uv") as THREE.BufferAttribute | undefined;
      if (uv) recolourFloatUvs(uv.array as Float32Array, colour);
    });
    applyToon(next);
    return next;
  }, [scene, colour]);
  useEffect(
    () => () => {
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      disposeMaterials(model);
    },
    [model],
  );
  return (
    <group scale={0.32}>
      <primitive object={model} />
    </group>
  );
}

function LineAndBobber({ phase, powerRef, sim, rodTip, aim, lookAt, nibble, species, weight, level, hour, wind = NO_WIND }: LineAndBobberProps) {
  const look = lineLook(hour);
  const restOpacity = useRef(look.opacity);
  restOpacity.current = look.opacity;
  const bobber = useRef<THREE.Group>(null);
  const hooked = useRef<THREE.Group>(null);
  const leapStart = useRef<number | null>(null);
  const sitRing = useRef<THREE.Mesh>(null);
  const lure = useRef<THREE.Group>(null);
  const splash = useRef<THREE.Group>(null);
  const entryAnchor = useRef<THREE.Group>(null);
  const splashMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const splashCore = useRef<THREE.MeshBasicMaterial>(null);
  const wrap = useSceneWrap();
  const target = useMemo(() => new THREE.Vector3(), []);
  const castAim = useMemo(() => new THREE.Vector3(), []);
  const flightFrom = useMemo(() => new THREE.Vector3(), []);
  const flightTo = useMemo(() => new THREE.Vector3(), []);
  const usingAim = useRef(false);
  const prevPhase = useRef(phase);
  const throwStart = useRef(-1);
  const flightStart = useRef(-1);
  const flightDone = useRef(false);
  const flightDist = useRef(0);
  const flightDur = useRef(0.6);
  const flightPower = useRef(0.5);
  const splashStart = useRef(-1);
  const settleAt = useRef(-1);
  // Where drift, current and wind had carried the sitting float, so a bite and the fight start there instead of snapping back.
  const heldShift = useRef({ x: 0, z: 0 });
  const missRing = useRef(false);
  const lastLine = useRef(1);
  const burstRef = useRef<() => void>(() => {});
  const entryBurst = useRef<() => void>(() => {});
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINE_CAP * 3), 3));
    geometry.setDrawRange(0, LINE_POINTS);
    const material = new THREE.LineBasicMaterial({
      color: 0x1a1410,
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Line(geometry, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const dipped = isFighting(phase);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      line.material.dispose();
    };
  }, [line]);

  useEffect(() => {
    (line.material as THREE.LineBasicMaterial).color.set(look.line);
  }, [line, look.line]);

  useFrame((state, delta) => {
    const power = powerRef.current;
    const t = state.clock.elapsedTime;
    if (isFrozen(t, fightView.freezeUntil)) return;
    const aiming = isAiming(phase);
    const castStarted = prevPhase.current === "casting" && phase === "waiting";
    const fightStarted = prevPhase.current !== "fight" && phase === "fight";
    prevPhase.current = phase;
    if (castStarted) {
      throwStart.current = t;
      flightStart.current = -1;
      flightDone.current = false;
    }
    if (phase !== "waiting") throwStart.current = -1;
    const throwAge = throwStart.current >= 0 ? t - throwStart.current : -1;
    const released = throwAge >= CAST_RELEASE_SEC;
    if (aiming) {
      usingAim.current = aim.overWater;
      if (aim.overWater) castAim.copy(aim.live);
    }
    const missing = phase === "result" && missView.active;
    const showLure = (phase === "waiting" && released) || dipped || missing;
    if (!showLure) {
      waitView.age = -1;
      settleAt.current = -1;
    }
    if (phase === "result" && landView.active) {
      const opacity = landLineOpacity(landView.swing);
      (line.material as THREE.LineBasicMaterial).opacity = opacity;
      line.visible = opacity > 0.03;
      if (bobber.current) bobber.current.visible = false;
      if (sitRing.current) sitRing.current.visible = false;
      if (!line.visible) return;
      const sag = landLineSag(landView.swing);
      const lineX = landedFish.x - rodTip.x;
      const lineZ = landedFish.z - rodTip.z;
      const attr = line.geometry.getAttribute("position");
      const positions = attr.array as Float32Array;
      let count = 0;
      let prevX = 0;
      let prevY = 0;
      let prevZ = 0;
      const put = (x: number, y: number, z: number) => {
        positions[count * 3] = x;
        positions[count * 3 + 1] = y;
        positions[count * 3 + 2] = z;
        count += 1;
      };
      for (let i = 0; i < LINE_POINTS; i += 1) {
        const s = i / (LINE_POINTS - 1);
        const belly = 4 * s * (1 - s);
        const x = rodTip.x + lineX * s;
        const z = rodTip.z + lineZ * s;
        const y = clearFightLine(rodTip.y + (landedFish.y - rodTip.y) * s - sag * belly, x, z);
        if (i > 0) {
          for (const lip of dockLineLips(prevX, prevY, prevZ, x, y, z)) {
            if (count >= LINE_CAP - (LINE_POINTS - i)) break;
            put(lip.x, lip.y, lip.z);
          }
        }
        put(x, y, z);
        prevX = x;
        prevY = y;
        prevZ = z;
      }
      line.geometry.setDrawRange(0, count);
      attr.needsUpdate = true;
      return;
    }
    line.visible = showLure;
    if (bobber.current) bobber.current.visible = showLure;
    if (!showLure) {
      if (sitRing.current) sitRing.current.visible = false;
      if (phase === "waiting" && usingAim.current) lookAt.copy(castAim);
      else if (aiming && aim.overWater) lookAt.copy(aim.live);
      else if (!aiming && usingAim.current) lookAt.copy(castAim);
      return;
    }
    placeBobber(target, Math.max(0.35, power), phase, t, usingAim.current ? castAim : null, nibble, level, weight);
    if (phase === "hookset" || phase === "fight") {
      target.x += heldShift.current.x;
      target.z += heldShift.current.z;
    } else if (phase !== "waiting") {
      heldShift.current.x = 0;
      heldShift.current.z = 0;
    }
    if (phase === "hookset") {
      const darted = applyBiteDart(target.x, target.z, anglerPose.x, anglerPose.z, fightView.biteAge);
      const anchored = strikeAnchor(darted.x, darted.z);
      target.x = anchored.x;
      target.z = anchored.z;
    }
    if (phase === "waiting" && released && !flightDone.current && flightStart.current < 0) {
      flightFrom.copy(rodTip);
      flightTo.set(target.x, 0.07, target.z);
      flightDist.current = Math.hypot(flightTo.x - flightFrom.x, flightTo.z - flightFrom.z);
      flightDur.current = castFlightSeconds(flightDist.current);
      flightPower.current = Math.min(1, Math.max(0, power));
      flightStart.current = t;
    }
    const flightAge = flightStart.current >= 0 ? t - flightStart.current : -1;
    const flying = phase === "waiting" && flightAge >= 0 && flightAge < flightDur.current;
    let flightP = -1;
    if (flying) {
      flightP = flightAge / flightDur.current;
      const along = castAlong(flightP);
      const landY = waterHeight(flightTo.x, flightTo.z, t) + 0.07;
      target.x = THREE.MathUtils.lerp(flightFrom.x, flightTo.x, along);
      target.z = THREE.MathUtils.lerp(flightFrom.z, flightTo.z, along);
      target.y =
        THREE.MathUtils.lerp(flightFrom.y, landY, along) + castLoft(flightP, flightDist.current, flightPower.current);
    } else if (flightStart.current >= 0) {
      // A bite can win the same frame a long cast would have landed. Still
      // finish the entry so the lure is not left in the air with the flight armed.
      flightDone.current = true;
      flightStart.current = -1;
      splashStart.current = t;
      markSplash(flightTo.x, flightTo.z, t);
      entryAnchor.current?.position.set(flightTo.x, waterHeight(flightTo.x, flightTo.z, t) + 0.02, flightTo.z);
      entryBurst.current();
      fx.plop();
    }
    if (lure.current && flying) {
      lure.current.rotation.x = flightP * Math.PI * 2 * (1.05 + flightPower.current * 0.65);
      lure.current.rotation.z = Math.sin(flightP * Math.PI) * 0.5;
    }
    if (phase === "fight") {
      // Hold the last simulated line fraction so a fight ending mid-frame
      // (sim nulled before the phase prop commits) doesn't snap the bobber back.
      const fightSim = sim.current;
      // Capture the sim for fightEndedLanded; reset on entry so an underpowered
      // fight (sim stays null) can't inherit the previous fight's landing.
      if (fightStarted || fightSim) lastFightSim = fightSim;
      if (fightSim) lastLine.current = fightSim.line;
      target.x = THREE.MathUtils.lerp(REEL_POINT.x, target.x, lastLine.current);
      target.z = THREE.MathUtils.lerp(REEL_POINT.z, target.z, lastLine.current);
      if (fightSim && fightView.tug > 0) {
        target.x = THREE.MathUtils.lerp(target.x, REEL_POINT.x, fightView.tug * 0.32);
        target.z = THREE.MathUtils.lerp(target.z, REEL_POINT.z, fightView.tug * 0.32);
      }
      if (fightSim && fightView.pull > 0.001) {
        const dx = target.x - REEL_POINT.x;
        const dz = target.z - REEL_POINT.z;
        const reach = Math.hypot(dx, dz) || 1;
        const outX = dx / reach;
        const outZ = dz / reach;
        target.x += outX * fightView.pull + -outZ * fightView.runSide * fightView.pull;
        target.z += outZ * fightView.pull + outX * fightView.runSide * fightView.pull;
      }
      if (fightSim && fightView.reeling) {
        const hauled = applyRetrieve(
          target.x,
          target.z,
          REEL_POINT.x,
          REEL_POINT.z,
          fightView.pump,
          true,
          fightView.surge,
        );
        target.x = hauled.x;
        target.z = hauled.z;
      }
      if (fightSim) {
        const bob = fightView.surge === 2 ? 0.02 : fightView.reeling ? 0.035 : 0.045;
        target.y += Math.sin(t * (fightView.reeling ? 8 : 14)) * bob;
      }
    } else {
      lastLine.current = 1;
    }
    if (missing) {
      target.x = missView.x;
      target.z = missView.z;
      target.y = 0.07 + missBobberLift(missView.age, missView.fromPlunge);
    }
    const sitting = lureIsWaiting(phase, flying) && flightDone.current;
    if (sitting) {
      if (settleAt.current < 0) settleAt.current = t;
      waitView.age = t - settleAt.current;
      const shifted = applyWaitShift(target.x, target.z, anglerPose.x, anglerPose.z, t, waitView.age, wind);
      heldShift.current.x = shifted.x - target.x;
      heldShift.current.z = shifted.z - target.z;
      target.x = shifted.x;
      target.z = shifted.z;
    } else {
      settleAt.current = -1;
      waitView.age = -1;
    }
    if (sitRing.current) {
      sitRing.current.visible = sitting;
      if (sitting) sitRing.current.position.set(target.x, bobberRingHeight(target.x, target.z, t), target.z);
    }
    if (!flying) target.y += waterHeight(target.x, target.z, t);
    if (!flying && phase === "waiting" && splashStart.current >= 0) {
      const hop = (t - splashStart.current) / 0.36;
      if (hop >= 0 && hop < 1) target.y += Math.sin(hop * Math.PI) * 0.16 * (1 - hop);
    }
    if (phase === "fight" && fightView.reeling) target.y += retrieveHop(fightView.pump, true, fightView.surge);
    if (dipped && fightView.plunge > 0) target.y -= fightView.plunge;
    if (dipped) target.y = clearFightLine(target.y, target.x, target.z);
    if (phase === "hookset") target.y -= strikeDunk(phase, fightView.biteAge);
    if (lure.current && !flying) {
      const hauling = phase === "fight" && fightView.reeling && fightView.surge !== 2;
      const settle = 1 - Math.exp((hauling ? -10 : -8) * delta);
      if (hauling) {
        const wake = retrieveWake(fightView.pump, true, fightView.surge);
        const weave = retrieveWeave(fightView.pump, true, fightView.surge);
        const inbound = Math.atan2(REEL_POINT.x - target.x, REEL_POINT.z - target.z);
        lure.current.rotation.x += (wake * 0.9 - lure.current.rotation.x) * settle;
        lure.current.rotation.y += shortestYaw(lure.current.rotation.y, inbound) * settle;
        lure.current.rotation.z += (weave * 1.6 - lure.current.rotation.z) * settle;
      } else if (sitting) {
        const nod = waitNod(target.x, target.z, t);
        lure.current.rotation.x += (nod.x - lure.current.rotation.x) * settle;
        lure.current.rotation.y += shortestYaw(lure.current.rotation.y, 0) * settle;
        lure.current.rotation.z += (nod.z - lure.current.rotation.z) * settle;
      } else {
        lure.current.rotation.x += (0 - lure.current.rotation.x) * settle;
        lure.current.rotation.y += shortestYaw(lure.current.rotation.y, 0) * settle;
        lure.current.rotation.z += (0 - lure.current.rotation.z) * settle;
      }
    }
    if (missing && !missRing.current) {
      missRing.current = true;
      splashStart.current = t;
      flightTo.set(missView.x, 0, missView.z);
    }
    if (!missing) missRing.current = false;
    if (splash.current && splashMaterial.current && splashCore.current) {
      const k = splashStart.current >= 0 ? (t - splashStart.current) / SPLASH_SEC : 1;
      if (k >= 1) {
        splash.current.visible = false;
        splashStart.current = -1;
      } else {
        splash.current.visible = true;
        splash.current.position.set(flightTo.x, waterHeight(flightTo.x, flightTo.z, t) + 0.04, flightTo.z);
        splash.current.scale.setScalar(0.35 + k * 1.7);
        splashMaterial.current.opacity = (1 - k) * 0.55;
        splashCore.current.opacity = (1 - k) * (1 - k) * 0.7;
      }
    }
    bobber.current?.position.copy(target);
    bobberWorld.copy(target);
    lookAt.copy(target);
    const hookedPose =
      fightFishMode(phase) === "on"
        ? fightFishPose(
            target.x,
            target.z,
            anglerPose.x,
            anglerPose.z,
            fightView.lead + (fightView.surge === 2 ? Math.sin(t * 8.5) * 0.12 : 0),
            fightView.side + (fightView.surge === 1 ? Math.sin(t * 22) * 0.06 : 0),
            t,
          )
        : null;
    if (wrap.current) wrap.current.dataset.bobber = `${target.x.toFixed(2)},${target.z.toFixed(2)}`;
    if (hooked.current) {
      const g = hooked.current;
      g.visible = hookedPose?.show ?? false;
      if (hookedPose?.show) {
        g.position.set(hookedPose.x - target.x, hookedPose.y - target.y, hookedPose.z - target.z);
        g.rotation.set(hookedPose.pitch, hookedPose.yaw, 0);
        fightView.localX = g.position.x;
        fightView.localY = g.position.y;
        fightView.localZ = g.position.z;
      }
    }
    // A leap: the fish clears the water nose first, then turns over and falls back.
    const leaping = phase === "fight" && sim.current?.jump === true && sim.current.surge === 2;
    if (!leaping) leapStart.current = null;
    else if (leapStart.current === null) leapStart.current = t;
    let leapY = 0;
    if (leaping && hooked.current?.visible && leapStart.current !== null) {
      const leap = leapLift((t - leapStart.current) / (JUMP_MS / 1000));
      leapY = leap.y;
      hooked.current.position.y += leap.y;
      hooked.current.rotation.x -= leap.pitch;
    }
    const meet = hookedPose?.show ? fightLineEnd(phase, { ...hookedPose, mouthY: hookedPose.mouthY + leapY }, target) : null;
    // Cast trail keeps its own sag. A fight run or pump only lifts the belly.
    const lineX = target.x - rodTip.x;
    const lineZ = target.z - rodTip.z;
    const rawSpan = Math.hypot(lineX, lineZ);
    const span = rawSpan || 1;
    let sag = 0.22;
    if (flying) sag = castTrailSag(flightP, rawSpan);
    else if (sitting) sag = waitLineSag(waitView.age);
    else if (phase === "fight" && sim.current) sag = fightView.sag;
    else if (phase === "hookset") sag = biteLineSag(fightView.biteAge);
    else if (missing) sag = missLineSag(missView.age, missView.fromSag);
    let swayHz = 1.6;
    let swayAmp = 0.07;
    if (flying) {
      swayHz = 7;
      swayAmp = 0.05 * (1 - flightP);
    } else if (sitting) {
      swayAmp = sag > WAIT_REST_SAG + 0.05 ? 0.12 : sag < WAIT_REST_SAG - 0.05 ? 0.02 : 0.07;
    } else if (phase === "hookset") {
      swayHz = 8;
      swayAmp = 0.03 + biteLineSag(fightView.biteAge) * 0.1;
    } else if (missing) {
      swayHz = 3.2;
      swayAmp = 0.18;
    } else if (phase === "fight" && sim.current) {
      if (fightView.surge === 2) {
        swayHz = 11;
        swayAmp = 0.035;
      } else if (fightView.surge === 1) {
        swayHz = 15;
        swayAmp = 0.1;
      } else if (fightView.reeling) {
        swayHz = 2.2;
        swayAmp = 0.045;
      }
    }
    const sway = Math.sin(t * swayHz) * swayAmp * Math.min(1, span / 6);
    (line.material as THREE.LineBasicMaterial).opacity = phase === "fight" && fightView.surge === 2 ? 0.9 : restOpacity.current;
    const sideX = -lineZ / span;
    const sideZ = lineX / span;
    const lag = flying ? (1 - castAlong(flightP)) * Math.min(1.35, span * 0.2) : 0;
    const dirX = lineX / span;
    const dirZ = lineZ / span;
    const attr = line.geometry.getAttribute("position");
    const positions = attr.array as Float32Array;
    let count = 0;
    let prevX = 0;
    let prevY = 0;
    let prevZ = 0;
    const put = (x: number, y: number, z: number) => {
      positions[count * 3] = x;
      positions[count * 3 + 1] = y;
      positions[count * 3 + 2] = z;
      count += 1;
    };
    for (let i = 0; i < LINE_POINTS; i += 1) {
      const s = i / (LINE_POINTS - 1);
      const belly = 4 * s * (1 - s);
      const x = rodTip.x + lineX * s - dirX * lag * belly + sideX * sway * belly;
      const z = rodTip.z + lineZ * s - dirZ * lag * belly + sideZ * sway * belly;
      let y = rodTip.y + (target.y - rodTip.y) * s - sag * belly;
      const holdLine = dipped || missing;
      if (holdLine) y = clearFightLine(y, x, z);
      else if (sitting) y = liftDockSample(y, x, z);
      if ((holdLine || sitting) && i > 0) {
        for (const lip of dockLineLips(prevX, prevY, prevZ, x, y, z)) {
          if (count >= LINE_CAP - LINE_TAIL - (LINE_POINTS - i)) break;
          put(lip.x, lip.y, lip.z);
        }
      }
      put(x, y, z);
      prevX = x;
      prevY = y;
      prevZ = z;
    }
    if (meet) {
      for (const lip of dockLineLips(prevX, prevY, prevZ, meet.x, meet.y, meet.z)) {
        if (count >= LINE_CAP - 1) break;
        put(lip.x, lip.y, lip.z);
      }
      if (count < LINE_CAP) put(meet.x, meet.y, meet.z);
    }
    line.geometry.setDrawRange(0, count);
    attr.needsUpdate = true;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={splash} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.4, 28]} />
          <meshBasicMaterial ref={splashMaterial} color="#e7f2ea" transparent depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.16, 20]} />
          <meshBasicMaterial ref={splashCore} color="#f4fff8" transparent depthWrite={false} />
        </mesh>
      </group>
      <group ref={entryAnchor}>
        <EntrySpray burstRef={entryBurst} />
      </group>
      {phase === "fight" && <RetrieveWake />}
      {phase === "waiting" && <NibbleRings nibble={nibble} weight={weight} />}
      {phase === "result" && <MissDrips />}
      {phase === "fight" && <RetrieveSplash />}
      <mesh ref={sitRing} visible={false} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color="#e7f4ee" transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <group ref={bobber} visible={false}>
        <group ref={lure}>
          <FloatModel />
          {look.glowTip && (
            <group position={[0, GLOW_TIP_Y, 0]}>
              <mesh>
                <sphereGeometry args={[0.045, 12, 8]} />
                <meshBasicMaterial color={GLOW_TIP} toneMapped={false} fog={false} />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.13, 12, 8]} />
                <meshBasicMaterial color={GLOW_TIP} transparent opacity={0.22} depthWrite={false} toneMapped={false} fog={false} />
              </mesh>
            </group>
          )}
        </group>
        <SurfaceRipple active={phase === "hookset" || phase === "fight"} sim={sim} sunk={phase === "fight"} />
        {(phase === "waiting" || phase === "hookset" || phase === "result") && (
          <RisingFish
            phase={phase}
            color={species?.color ?? FALLBACK_COLOR}
            accent={species?.accent ?? FALLBACK_ACCENT}
            size={fishSize(weight)}
            build={fishBuild(species?.id)}
          />
        )}
        {phase === "fight" && <SurgeSpray sim={sim} burstRef={burstRef} />}
        {phase === "fight" && (
          <HookedFish
            fishRef={hooked}
            burstRef={burstRef}
            color={species?.color ?? FALLBACK_COLOR}
            accent={species?.accent ?? FALLBACK_ACCENT}
            build={fishBuild(species?.id)}
          />
        )}
      </group>
    </>
  );
}

function CaughtFish({
  phase,
  color,
  accent,
  scale,
  released,
  build,
}: {
  phase: ScenePhase;
  color: string;
  accent: string;
  scale: number;
  released: boolean;
  build: FishBuild;
}) {
  // Seconds since the fish was let go, and where it left the hand and goes back in; -1 while it is held.
  const release = useRef({ age: -1, splashed: false, hand: new THREE.Vector3(), entry: { x: 0, z: 0 } });
  const group = useRef<THREE.Group>(null);
  const exit = useRef<THREE.Group>(null);
  const exitMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const drive = useRef<FishDrive>({ intensity: 1.2, speed: 2.2 });
  const drips = useMemo(() => {
    const holder = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.03, 5, 4);
    for (let i = 0; i < LAND_DRIPS; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xd7eee6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      holder.add(mesh);
    }
    return holder;
  }, []);

  useEffect(() => {
    return () => {
      const first = drips.children[0] as THREE.Mesh;
      first.geometry.dispose();
      drips.children.forEach((child) => ((child as THREE.Mesh).material as THREE.Material).dispose());
    };
  }, [drips]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    const active = phase === "result" && landView.active;
    const let_go = release.current;
    if (!(active && released)) {
      let_go.age = -1;
      let_go.splashed = false;
    } else if (let_go.age < 0) {
      let_go.age = 0;
      let_go.hand.copy(landedFish);
      releaseEntry(let_go.entry, let_go.hand, landedFrom);
    } else {
      let_go.age += Math.min(delta, 0.05);
    }
    const drop = releaseDrop(let_go.age);
    if (g) g.visible = active && drop < 1;
    const ring = releaseRing(let_go.age);
    if (ring >= 0 && !let_go.splashed) {
      let_go.splashed = true;
      markSplash(let_go.entry.x, let_go.entry.z, t);
    }
    const splash = ring >= 0 ? ring : landExitSplash(active ? landView.age : -1);
    if (ring >= 0 && exit.current && exitMaterial.current) {
      exit.current.visible = true;
      exit.current.position.set(let_go.entry.x, waterHeight(let_go.entry.x, let_go.entry.z, t) + 0.03, let_go.entry.z);
      exit.current.scale.setScalar(0.3 + ring * 1.4);
      exitMaterial.current.opacity = (1 - ring) * 0.6;
    } else if (exit.current && exitMaterial.current) {
      exit.current.visible = splash >= 0;
      if (splash >= 0) {
        const y = waterHeight(landedFrom.x, landedFrom.z, t);
        exit.current.position.set(landedFrom.x, y + 0.03, landedFrom.z);
        exit.current.scale.setScalar(0.35 + splash * 1.6);
        exitMaterial.current.opacity = (1 - splash) * 0.6;
      }
    }
    if (g && active) {
      const flop = Math.max(landFlop(landView.age), liftFlop(landView.age));
      drive.current.intensity = 0.35 + flop;
      drive.current.speed = 0.7 + flop * 1.5;
      g.position.copy(landedFish);
      g.rotation.order = "YXZ";
      g.rotation.y = landFishYaw(landView.swing, landView.haulYaw, landView.presentYaw);
      g.rotation.x = landFishPitch(landView.swing);
      g.rotation.z = landFishRoll(landView.swing, landView.age, t);
      if (drop >= 0) {
        const waterY = waterHeight(let_go.entry.x, let_go.entry.z, t);
        releasePoint(g.position, let_go.hand, let_go.entry, waterY, drop);
        g.rotation.y = Math.atan2(let_go.entry.x - let_go.hand.x, let_go.entry.z - let_go.hand.z);
        g.rotation.x = releasePitch(drop);
        g.rotation.z = 0;
      }
    }
    for (let i = 0; i < LAND_DRIPS; i += 1) {
      const mesh = drips.children[i] as THREE.Mesh;
      const fall = active && drop < 0 ? landDrip(landView.age, i) : -1;
      mesh.visible = fall >= 0 && g != null;
      if (fall < 0 || !g) continue;
      const side = (i - (LAND_DRIPS - 1) / 2) * 0.07;
      mesh.position.set(
        g.position.x + side,
        g.position.y + 0.08 - landDripFall(fall),
        g.position.z + (i % 2 === 0 ? 0.05 : -0.06),
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - fall) * 0.8;
    }
  });

  return (
    <>
      <group ref={exit} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.4, 24]} />
          <meshBasicMaterial ref={exitMaterial} color="#e7f4ee" transparent depthWrite={false} />
        </mesh>
      </group>
      <primitive object={drips} />
      <group ref={group} visible={false} scale={scale}>
        <ArticulatedFish color={color} accent={accent} drive={drive} build={build} />
      </group>
    </>
  );
}

function StrikeSplash({ phase }: { phase: ScenePhase }) {
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const rim = useRef<THREE.Mesh>(null);
  const rimMat = useRef<THREE.MeshBasicMaterial>(null);
  const flash = useRef<THREE.Mesh>(null);
  const flashMat = useRef<THREE.MeshBasicMaterial>(null);
  const sprayPool = useMemo(() => {
    const holder = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < STRIKE_DROPS; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xf7fffb,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.scale.setScalar(0.8 + (i % 3) * 0.3);
      holder.add(mesh);
    }
    holder.frustumCulled = false;
    return holder;
  }, []);

  useEffect(() => {
    return () => {
      const mesh = sprayPool.children[0] as THREE.Mesh;
      mesh.geometry.dispose();
      sprayPool.children.forEach((child) => ((child as THREE.Mesh).material as THREE.Material).dispose());
    };
  }, [sprayPool]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const age = phase === "hookset" ? fightView.biteAge : -1;
    const ripple = strikeRing(phase, age, bobberWorld.x, bobberWorld.z, time);
    if (ring.current && ringMat.current && rim.current && rimMat.current) {
      ring.current.visible = ripple != null;
      rim.current.visible = ripple != null;
      if (ripple) {
        ring.current.position.set(ripple.x, ripple.y, ripple.z);
        rim.current.position.set(ripple.x, ripple.y + 0.004, ripple.z);
        ring.current.scale.setScalar(ripple.radius);
        rim.current.scale.setScalar(ripple.radius);
        ringMat.current.opacity = ripple.opacity * 0.55;
        rimMat.current.opacity = ripple.opacity;
      }
    }
    const spray = strikeSpray(phase, age, bobberWorld.x, bobberWorld.z, time);
    if (flash.current && flashMat.current) {
      flash.current.visible = spray != null;
      if (spray) {
        flash.current.position.set(spray.x, spray.y + 0.01, spray.z);
        flash.current.scale.setScalar(0.22 + spray.strength * 0.3);
        flashMat.current.opacity = 0.2 + spray.strength * 0.3;
      }
    }
    sprayPool.visible = spray != null;
    if (!spray) return;
    sprayPool.position.set(spray.x, spray.y, spray.z);
    for (let i = 0; i < STRIKE_DROPS; i += 1) {
      const drop = strikeDrop(phase, i, age);
      const mesh = sprayPool.children[i] as THREE.Mesh;
      if (!drop) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(drop.x, drop.y, drop.z);
      (mesh.material as THREE.MeshBasicMaterial).opacity = drop.opacity;
    }
  });

  return (
    <>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} frustumCulled={false}>
        <ringGeometry args={[0.72, 1, 40]} />
        <meshBasicMaterial
          ref={ringMat}
          color="#06202c"
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={rim} visible={false} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5} frustumCulled={false}>
        <ringGeometry args={[0.8, 0.95, 40]} />
        <meshBasicMaterial
          ref={rimMat}
          color="#f4fff8"
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={flash} visible={false} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6} frustumCulled={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial
          ref={flashMat}
          color="#ffffff"
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <primitive object={sprayPool} />
    </>
  );
}

/** Steps the effects down to Lite once if the frame rate sags, unless the player picked effects themselves. */
function FrameWatch() {
  const watch = useMemo(() => createFrameWatch(), []);
  useFrame((_, delta) => {
    if (!settings.autoEffects || settings.particles !== "full") return;
    if (!watch(delta)) return;
    updateSettings({ particles: "lite", autoEffects: false });
    noteEffectsSteppedDown();
  });
  return null;
}

function Tone({ hour }: { hour: LakeHour }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = hour === "night" ? 0.72 : hour === "dusk" ? 0.92 : 1.05;
  }, [gl, hour]);
  return null;
}

function Scene({ level, phase, spot, sim, nibble, hour, sky, season = "summer", species, weight, golden = false, released = false, moon, wind, hotspot, rising = false, storm = false, tracks, powerRef, accuracy }: Props) {
  const rodTip = useMemo(() => new THREE.Vector3(DOCK_STAND_X + 0.4, DOCK_PLANKS.top + 2.1, DOCK_STAND_Z - 1.2), []);
  const lookAt = useMemo(() => new THREE.Vector3(DOCK_STAND_X, 0, DOCK_STAND_Z - 8), []);
  // Dropping anchor, look on over the bow, not back at the pier; tied up again, look out from the pier.
  useEffect(
    () =>
      subscribeBoat(() => {
        if (boat.mode === "anchored") lookAt.set(ANCHOR.x + Math.sin(boat.yaw) * 8, 0, ANCHOR.z + Math.cos(boat.yaw) * 8);
        else if (boat.mode === "moored") lookAt.set(DOCK_STAND_X, 0, DOCK_STAND_Z - 8);
      }),
    [lookAt],
  );
  const aim = useMemo<AimState>(() => ({ live: new THREE.Vector3(), overWater: false }), []);
  useEffect(() => {
    resetFishingScene();
    return resetFishingScene;
  }, []);
  return (
    <>
      <PlayerMove phase={phase} />
      <FightMotion phase={phase} sim={sim} />
      <CameraRig phase={phase} sim={sim} />
      <Tone hour={hour} />
      <FrameWatch />
      <LakeWorld spot={spot} hour={hour} sky={sky} season={season} hotspot={hotspot} moon={moon} wind={wind} />
      {tracks && tracks.length > 0 && <ShoreTracks tracks={tracks} />}
      {rising && <RiseRings spot={spot} />}
      {rising && <Mayflies spot={spot} />}
      <Windsock wind={wind ?? NO_WIND} />
      {storm && <Lightning />}
      {rainbowOut(hour, sky, season, storm) && <Rainbow hour={hour} />}
      {auroraOut(new Date(), hour, sky, season) && <Aurora />}
      <WaterAim phase={phase} aim={aim} level={level} powerRef={powerRef} accuracy={accuracy} />
      {/* Same-priority frames run in tree order; the angler writes rodTip before the line reads it. */}
      <Angler phase={phase} powerRef={powerRef} rodTip={rodTip} lookAt={lookAt} snowfall={snowing(sky, season)} nibble={nibble} />
      <LineAndBobber
        level={level}
        phase={phase}
        powerRef={powerRef}
        sim={sim}
        nibble={nibble}
        species={species}
        weight={weight}
        rodTip={rodTip}
        aim={aim}
        lookAt={lookAt}
        hour={hour}
        wind={wind}
      />
      <RodBell rodTip={rodTip} phase={phase} nibble={nibble} night={hour === "night"} />
      {species && <FishShadow level={level} phase={phase} weight={weight} bobber={bobberWorld} />}
      <StrikeSplash phase={phase} />
      <CaughtFish
        phase={phase}
        color={golden ? GOLDEN_COLOR : (species?.color ?? FALLBACK_COLOR)}
        accent={golden ? GOLDEN_ACCENT : (species?.accent ?? FALLBACK_ACCENT)}
        scale={landedScale(weight)}
        released={released}
        build={fishBuild(species?.id)}
      />
      {/* Last in the tree, so the snapshot sees every pose written this frame. */}
      <CatchCamera />
    </>
  );
}

/** Snaps the held-up fish for the field log, once per landing. */
function CatchCamera() {
  const taken = useRef(false);
  useFrame(({ gl, scene, camera }) => {
    if (!landView.active) {
      taken.current = false;
      return;
    }
    if (taken.current || !photoFrameAt(landView.age)) return;
    taken.current = true;
    // Render the frame now so the pixels are there to copy; the default render follows.
    gl.render(scene, camera);
    try {
      const shot = snapCanvas(gl.domElement);
      if (shot) postCatchShot(shot);
    } catch {
      // A tainted or lost context leaves this catch without a photo.
    }
  });
  return null;
}

/** Memoized: the cast charge reaches the scene through powerRef, so holding a cast re-renders nothing here. */
export const FishingWorld = memo(function FishingWorld(props: Props) {
  // Read once per visit: flipping shadows on a live renderer leaves materials compiled for the old setting.
  const [quality] = useState(() => ({ shadows: settings.shadows, dpr: settings.sharpness === "sharp" ? ([1, 1.75] as [number, number]) : 1 }));
  return (
    <Canvas
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{ position: CAM_START, fov: 48, near: 0.1, far: 160 }}
      gl={{ antialias: true }}
      style={{ cursor: "crosshair" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = props.hour === "night" ? 0.72 : props.hour === "dusk" ? 0.92 : 1.05;
      }}
    >
      <color attach="background" args={[weatherLook(props.hour, props.sky).fog]} />
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
});
