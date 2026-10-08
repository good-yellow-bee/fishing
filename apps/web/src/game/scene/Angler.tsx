import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { isFishingStance, stanceAt } from "@stillwater/shared";
import {
  CAST_RELEASE_SEC,
  CAST_ROD_SETTLE_SEC,
  castBodyLean,
  loadedRodPitch,
  thrownRodPitch,
} from "./castMotion";
import { HOOKSET_SEC, fightBodyLean, fightRodPitch, fightRodRoll, fightView } from "./fightMotion";
import { landBodyLean, landRodPitch, landView } from "./landMotion";
import { missBodyLean, missRodPitch, missRodRoll, missView } from "./missMotion";
import { anglerPose, shortestYaw } from "./pose";
import { waitBodyLean, waitRodPitch, waitTwitchActive, waitView } from "./waitMotion";
import { Reel } from "./Reel";
import { applyToon, disposeMaterials } from "./toon";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";

type Props = {
  phase: ScenePhase;
  power: number;
  rodTip: THREE.Vector3;
  lookAt: THREE.Vector3;
};

useGLTF.preload("/models/character-male-c.glb");
useGLTF.preload("/models/fishing-rod.glb");

function swing(phase: ScenePhase, power: number, t: number) {
  switch (phase) {
    case "casting":
      return 0.35 - power * 1.15;
    case "waiting":
      return 1.05;
    case "result":
      return 0.3;
    default:
      return 0.95 + Math.sin(t * 1.6) * 0.04;
  }
}

const ROD_BIAS = 0.18;
/** Center of the right fist in the `arm-right` bone frame; the bind pose holds the arm out along -x. */
const RIGHT_FIST = new THREE.Vector3(-0.24, 0, 0.02);
const ROD_REST_Z = 0.12;
/** Rod held near level at the hip while the arm hangs, so the butt clears the ground. */
const ROD_CARRY_PITCH = 1.35;

function yawToward(x: number, z: number) {
  const dx = x - anglerPose.x;
  const dz = z - anglerPose.z;
  if (dx * dx + dz * dz < 0.04) return anglerPose.yaw;
  return Math.atan2(dx, dz) + ROD_BIAS;
}

function clipName(phase: ScenePhase, moving: boolean, fishing: boolean) {
  if (moving) return "walk";
  if (phase !== "idle" || fishing) return "holding-right";
  return "idle";
}

export function Angler({ phase, power, rodTip, lookAt }: Props) {
  const gltf = useGLTF("/models/character-male-c.glb");
  const rodFile = useGLTF("/models/fishing-rod.glb");
  const root = useRef<THREE.Group>(null);
  const wrap = useSceneWrap();
  const grip = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Object3D>(null);
  const playing = useRef("");
  const rodPitch = useRef(0.95);
  const rodRoll = useRef(0);
  const bodyLean = useRef(0);
  const whipFrom = useRef(0.95);
  const throwStart = useRef(-1);
  const strikeFrom = useRef(1.4);
  const landFrom = useRef(1.05);
  const holdingCatch = useRef(false);
  const missFromPitch = useRef(1.05);
  const missFromRoll = useRef(0);
  const missFromLean = useRef(0);
  const sprung = useRef(false);
  const prevPhase = useRef(phase);

  const character = useMemo(() => {
    const next = cloneSkinned(gltf.scene);
    applyToon(next);
    return next;
  }, [gltf.scene]);

  const fist = useMemo(() => {
    const arm = character.getObjectByName("arm-right");
    if (!arm) throw new Error("The angler model has no arm-right bone to hold the rod.");
    const anchor = new THREE.Object3D();
    anchor.position.copy(RIGHT_FIST);
    arm.add(anchor);
    return anchor;
  }, [character]);
  const fistAt = useMemo(() => new THREE.Vector3(), []);

  const rod = useMemo(() => {
    const next = rodFile.scene.clone(true);
    applyToon(next);
    return next;
  }, [rodFile.scene]);

  useEffect(() => {
    return () => {
      disposeMaterials(character);
      disposeMaterials(rod);
    };
  }, [character, rod]);

  const { actions } = useAnimations(gltf.animations, character);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const fighting = phase === "hookset" || phase === "fight";
    if (prevPhase.current === "casting" && phase === "waiting") {
      throwStart.current = t;
      whipFrom.current = rodPitch.current;
    }
    if (phase === "fight" && prevPhase.current !== "fight") strikeFrom.current = rodPitch.current;
    if (phase !== "waiting") throwStart.current = -1;
    const throwAge = throwStart.current >= 0 ? t - throwStart.current : -1;
    prevPhase.current = phase;
    const whipping = phase === "waiting" && throwAge >= 0 && throwAge < CAST_ROD_SETTLE_SEC + 0.15;
    const sitting = phase === "waiting" && !whipping && waitView.age >= 0;
    const twitching = sitting && waitTwitchActive(waitView.age);

    const landing = phase === "result" && landView.active;
    if (landing && !holdingCatch.current) {
      holdingCatch.current = true;
      landFrom.current = rodPitch.current;
    }
    if (!landing) holdingCatch.current = false;
    const missing = phase === "result" && missView.active;
    if (missing && !sprung.current) {
      sprung.current = true;
      missFromPitch.current = rodPitch.current;
      missFromRoll.current = rodRoll.current;
      missFromLean.current = bodyLean.current;
    }
    if (!missing) sprung.current = false;
    const fishing = isFishingStance(stanceAt(anglerPose.x, anglerPose.z));
    const next = clipName(phase, anglerPose.moving, fishing);
    if (next !== "holding-right") {
      // The arm hangs in this clip, so carry the rod near level whatever the phase was doing with it.
      rodPitch.current += (ROD_CARRY_PITCH - rodPitch.current) * (1 - Math.exp(-10 * delta));
    } else if (fighting) {
      const pitchTarget = fightRodPitch({
        tension: fightView.tension,
        surge: fightView.surge,
        reeling: fightView.reeling,
        strikeAge: fightView.strikeAge,
        biteAge: fightView.biteAge,
        time: t,
        pump: fightView.pump,
        fromPitch: strikeFrom.current,
      });
      const taking = phase === "hookset";
      const striking = phase === "fight" && fightView.strikeAge >= 0 && fightView.strikeAge < HOOKSET_SEC;
      if (striking || taking) rodPitch.current = pitchTarget;
      else rodPitch.current += (pitchTarget - rodPitch.current) * (1 - Math.exp(-16 * delta));
    } else if (landing) {
      rodPitch.current = landRodPitch(landView.age, landFrom.current);
    } else if (missing) {
      rodPitch.current = missRodPitch(missView.age, missFromPitch.current);
    } else {
      const rodTarget = phase === "casting"
        ? loadedRodPitch(power, t)
        : whipping
          ? thrownRodPitch(power, throwAge, whipFrom.current)
          : sitting
            ? waitRodPitch(waitView.age)
            : swing(phase, power, t);
      if (whipping || twitching) rodPitch.current = rodTarget;
      else {
        const follow = phase === "casting" ? 7 : 16;
        rodPitch.current += (rodTarget - rodPitch.current) * (1 - Math.exp(-follow * delta));
      }
    }

    if (next === "holding-right") {
      const target = yawToward(lookAt.x, lookAt.z);
      anglerPose.yaw += shortestYaw(anglerPose.yaw, target) * (1 - Math.exp(-7 * delta));
    }
    const castLean = castBodyLean(power, phase === "casting", phase === "waiting" ? throwAge : -1);
    const taking = phase === "hookset";
    const leanTarget = fighting
      ? fightBodyLean(fightView.surge, fightView.reeling, fightView.strikeAge, fightView.biteAge)
      : landing
        ? landBodyLean(landView.age)
        : missing
          ? missBodyLean(missView.age, missFromLean.current)
          : sitting
            ? waitBodyLean(waitView.age)
            : 0;
    const striking = phase === "fight" && fightView.strikeAge >= 0 && fightView.strikeAge < HOOKSET_SEC;
    if (striking || taking || landing || missing || twitching) bodyLean.current = leanTarget;
    else bodyLean.current += (leanTarget - bodyLean.current) * (1 - Math.exp(-8 * delta));
    if (root.current) {
      root.current.position.set(anglerPose.x, anglerPose.y + anglerPose.bob, anglerPose.z);
      root.current.rotation.order = "YXZ";
      root.current.rotation.y = anglerPose.yaw;
      root.current.rotation.x = anglerPose.pitch + castLean + bodyLean.current;
      root.current.rotation.z = anglerPose.lean;
    }
    const walk = actions.walk;
    if (walk) {
      const speed = Math.hypot(anglerPose.vx, anglerPose.vz);
      walk.timeScale = anglerPose.moving ? 0.72 + Math.min(0.62, speed / 6.2) : 1;
    }
    if (wrap.current) wrap.current.dataset.yaw = anglerPose.yaw.toFixed(2);
    if (grip.current) {
      if (root.current) grip.current.position.copy(root.current.worldToLocal(fist.getWorldPosition(fistAt)));
      grip.current.rotation.x = rodPitch.current;
      if (fighting) {
        const rollTarget = fightRodRoll(fightView.surge, fightView.runSide, t, fightView.strikeAge, fightView.biteAge);
        if (phase === "hookset") rodRoll.current = rollTarget;
        else rodRoll.current += (rollTarget - rodRoll.current) * (1 - Math.exp(-14 * delta));
        grip.current.rotation.z = ROD_REST_Z + rodRoll.current;
      } else if (landing) {
        grip.current.rotation.z = ROD_REST_Z;
      } else if (missing) {
        grip.current.rotation.z = ROD_REST_Z + missRodRoll(missView.age, missFromRoll.current);
      } else {
        const whipZ = throwAge >= 0 && throwAge < CAST_RELEASE_SEC ? Math.sin((throwAge / CAST_RELEASE_SEC) * Math.PI) * 0.12 : 0;
        const zTarget = ROD_REST_Z - whipZ;
        grip.current.rotation.z += (zTarget - grip.current.rotation.z) * (whipping ? 1 : 1 - Math.exp(-8 * delta));
      }
    }
    tip.current?.getWorldPosition(rodTip);

    if (playing.current !== next) {
      const hold = actions["holding-right"] ?? actions.idle;
      const clips = {
        walk: actions.walk ?? actions.idle,
        "holding-right": hold,
        idle: actions.idle ?? hold,
      };
      const clip = clips[next];
      if (clip) {
        actions[playing.current]?.fadeOut(0.12);
        clip.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.12).play();
        playing.current = next;
      }
    }
  });

  return (
    <group ref={root} position={[anglerPose.x, anglerPose.y, anglerPose.z]} rotation={[0, anglerPose.yaw, 0]} scale={1.7}>
      <primitive object={character} />
      <group ref={grip} rotation={[1.05, 0.05, ROD_REST_Z]}>
        <primitive object={rod} scale={0.19} />
        <Reel />
        <object3D ref={tip} position={[0, 0.94, 0]} />
      </group>
    </group>
  );
}
