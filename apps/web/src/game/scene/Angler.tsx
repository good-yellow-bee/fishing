import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { isFishingStance, onDockPlanks, stanceAt } from "@stillwater/shared";
import {
  CAST_RELEASE_SEC,
  CAST_ROD_SETTLE_SEC,
  castBodyLean,
  loadedRodPitch,
  thrownRodPitch,
} from "./castMotion";
import { HOOKSET_SEC, fightBodyLean, fightRodPitch, fightRodRoll,
  steerRodRoll, fightView } from "./fightMotion";
import { landBodyLean, landRodPitch, landView } from "./landMotion";
import { missBodyLean, missRodPitch, missRodRoll, missView } from "./missMotion";
import { anglerPose, shortestYaw } from "./pose";
import { nibbleShiver, waitBodyLean, waitRodPitch, waitTwitchActive, waitView } from "./waitMotion";
import { Reel } from "./Reel";
import { capSnow } from "./capSnow";
import { rodBowAmount, rodBowOffset, rodTipAt } from "./rodBow";
import { SIP_IN_HAND, sipView, sipWeight } from "./sipMotion";
import { applyToon, disposeMaterials, toonRamp } from "./toon";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";

const CAP_SNOW_COLOR = "#eef3f6";
/** The rod's tip, straight, in the grip's space. */
const ROD_TIP_Y = 0.94;

/** Bows every mesh of the rod by `amount` from its straight shape (see rodBow.ts). */
function bendRod(rod: THREE.Object3D, amount: number) {
  rod.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const straight = obj.userData.straight as Float32Array | undefined;
    if (!straight) return;
    const position = obj.geometry.getAttribute("position") as THREE.BufferAttribute;
    let length = 0;
    for (let i = 2; i < straight.length; i += 3) length = Math.max(length, straight[i]!);
    for (let i = 0; i < position.count; i++) {
      const z = straight[i * 3 + 2]!;
      position.setXYZ(i, straight[i * 3]!, straight[i * 3 + 1]! - rodBowOffset(z, length, amount), z);
    }
    position.needsUpdate = true;
  });
}

type Props = {
  phase: ScenePhase;
  /** Live cast power; read each frame instead of re-rendering on every change. */
  powerRef: Readonly<{ current: number }>;
  rodTip: THREE.Vector3;
  lookAt: THREE.Vector3;
  /** Snow is falling, so it settles on the cap and shoulders. */
  snowfall?: boolean;
  /** A fish is nibbling, so the rod tip shivers. */
  nibble?: boolean;
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
/** Center of the left fist in the `arm-left` bone frame, mirroring the right. */
const LEFT_FIST = new THREE.Vector3(0.24, 0, 0.02);
/** The left arm raised to bring the fist up in front of the mouth, from its bind pose along +x. */
const SIP_ARM = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.12, 0.72, 0.68).normalize());
const CUP_COLOR = "#c9cfd2";
const SIP_HEAD_TILT = 0.35;
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

export function Angler({ phase, powerRef, rodTip, lookAt, snowfall = false, nibble = false }: Props) {
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

  // The thermos cup, carried in the free hand for a sip; it stands upright while the arm is raised.
  const sip = useRef(0);
  const headTilt = useRef(0);
  const leftArm = useMemo(() => character.getObjectByName("arm-left") ?? null, [character]);
  const head = useMemo(() => character.getObjectByName("head") ?? null, [character]);
  const cup = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.06, 10), new THREE.MeshToonMaterial({ color: CUP_COLOR, gradientMap: toonRamp() }));
    mesh.position.copy(LEFT_FIST);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0).applyQuaternion(SIP_ARM.clone().invert()));
    mesh.visible = false;
    leftArm?.add(mesh);
    return mesh;
  }, [leftArm]);
  useEffect(
    () => () => {
      cup.removeFromParent();
      cup.geometry.dispose();
      (cup.material as THREE.Material).dispose();
      sipView.holding = false;
    },
    [cup],
  );

  // Snow on the cap and shoulders rides the head and torso bones; it builds while snow falls.
  const snowCover = useRef(0);
  const snowMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: CAP_SNOW_COLOR, gradientMap: toonRamp() }), []);
  const snowParts = useMemo(() => {
    const blob = new THREE.SphereGeometry(1, 10, 6);
    const parts: THREE.Mesh[] = [];
    const add = (bone: string, position: [number, number, number], scale: [number, number, number]) => {
      const mesh = new THREE.Mesh(blob, snowMaterial);
      mesh.position.set(...position);
      mesh.userData.full = scale;
      mesh.visible = false;
      character.getObjectByName(bone)?.add(mesh);
      parts.push(mesh);
    };
    add("head", [0, 0.4, 0.0], [0.19, 0.035, 0.17]);
    add("torso", [0.15, 0.205, -0.02], [0.1, 0.025, 0.08]);
    add("torso", [-0.15, 0.205, -0.02], [0.1, 0.025, 0.08]);
    return parts;
  }, [character, snowMaterial]);
  useEffect(
    () => () => {
      snowParts[0]?.geometry.dispose();
      snowMaterial.dispose();
      snowParts.forEach((part) => part.removeFromParent());
    },
    [snowParts, snowMaterial],
  );

  const rod = useMemo(() => {
    const next = rodFile.scene.clone(true);
    applyToon(next);
    // Its own copy of the geometry, so the rod can bow under a fish without bending the cached model.
    next.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry = obj.geometry.clone();
        obj.userData.straight = (obj.geometry.getAttribute("position") as THREE.BufferAttribute).array.slice();
      }
    });
    return next;
  }, [rodFile.scene]);
  const bow = useRef(0);
  const shownBow = useRef(0);

  useEffect(() => {
    return () => {
      disposeMaterials(character);
      disposeMaterials(rod);
    };
  }, [character, rod]);

  const { actions } = useAnimations(gltf.animations, character);

  useFrame((state, delta) => {
    snowCover.current = capSnow(snowCover.current, delta, snowfall);
    for (const part of snowParts) {
      const [x, y, z] = part.userData.full as [number, number, number];
      part.visible = snowCover.current > 0.02;
      // Spreads to its full size quickly, then piles up thicker.
      const spread = Math.min(1, snowCover.current * 2.5);
      part.scale.set(x * spread, y * snowCover.current, z * spread);
    }
    const t = state.clock.elapsedTime;
    const power = powerRef.current;
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
            ? waitRodPitch(waitView.age) + (nibble ? nibbleShiver(t) : 0)
            : swing(phase, power, t);
      // A nibble's shiver is too quick to smooth; it goes straight to the tip.
      if (whipping || twitching || (sitting && nibble)) rodPitch.current = rodTarget;
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
        const rollTarget = fightRodRoll(fightView.surge, fightView.runSide, t, fightView.strikeAge, fightView.biteAge) + steerRodRoll(fightView.steer);
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
    // Under a fish the rod bows toward the line, more with tension and in a surge.
    const bowTarget = fighting ? rodBowAmount(fightView.tension, fightView.surge) : 0;
    bow.current += (bowTarget - bow.current) * (1 - Math.exp(-10 * delta));
    if (Math.abs(bow.current - shownBow.current) > 0.002 || (bow.current < 0.002 && shownBow.current !== 0)) {
      shownBow.current = bow.current < 0.002 ? 0 : bow.current;
      bendRod(rod, shownBow.current);
      if (tip.current) {
        const at = rodTipAt(shownBow.current, ROD_TIP_Y);
        tip.current.position.set(0, at.y, at.z);
      }
    }
    tip.current?.getWorldPosition(rodTip);

    // Now and then, while the float sits quiet on the dock, a sip from the thermos cup.
    const sipTarget = sitting && !nibble && !twitching && onDockPlanks(anglerPose.x, anglerPose.z) ? sipWeight(waitView.age) : 0;
    sip.current += (sipTarget - sip.current) * (1 - Math.exp(-12 * delta));
    if (leftArm && sip.current > 0.001) leftArm.quaternion.slerp(SIP_ARM, sip.current);
    // The head tips back as the cup comes up.
    // The fishing clip leaves the head alone, so take back last frame's tilt before adding this one.
    const tilt = SIP_HEAD_TILT * Math.max(0, sip.current - 0.5) * 2;
    if (head) head.rotation.x += headTilt.current - tilt;
    headTilt.current = tilt;
    cup.visible = sip.current > SIP_IN_HAND;
    sipView.holding = cup.visible;

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
        <object3D ref={tip} position={[0, ROD_TIP_Y, 0]} />
      </group>
    </group>
  );
}
