import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { footHeight, stanceAt, walkableAt } from "@stillwater/shared";
import { anglerPose, shortestYaw } from "./pose";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";

const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const MAX_SPEED = 4.35;
const ACCEL = 5.2;
const BRAKE = 3.1;
const STOP_BRAKE = 28;

function canWalk(phase: ScenePhase) {
  return phase === "idle" || phase === "result";
}

function applyWalk(dx: number, dz: number) {
  const nx = anglerPose.x + dx;
  const nz = anglerPose.z + dz;
  if (walkableAt(nx, nz)) {
    anglerPose.x = nx;
    anglerPose.z = nz;
    return;
  }
  if (walkableAt(nx, anglerPose.z)) {
    anglerPose.x = nx;
    return;
  }
  if (walkableAt(anglerPose.x, nz)) {
    anglerPose.z = nz;
  }
}

export function PlayerMove({ phase }: { phase: ScenePhase }) {
  const keys = useRef(new Set<string>());
  const { camera } = useThree();
  const wrap = useSceneWrap();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const wish = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      const key = event.key.toLowerCase();
      if (!MOVE_KEYS.has(key)) return;
      event.preventDefault();
      if (event.type === "keydown") keys.current.add(key);
      else keys.current.delete(key);
    };
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const walking = canWalk(phase);
    wish.set(0, 0, 0);
    if (walking && keys.current.size > 0) {
      forward.set(anglerPose.x - camera.position.x, 0, anglerPose.z - camera.position.z);
      if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
      else forward.normalize();
      right.crossVectors(forward, camera.up).setY(0).normalize();
      if (keys.current.has("w") || keys.current.has("arrowup")) wish.add(forward);
      if (keys.current.has("s") || keys.current.has("arrowdown")) wish.sub(forward);
      if (keys.current.has("d") || keys.current.has("arrowright")) wish.add(right);
      if (keys.current.has("a") || keys.current.has("arrowleft")) wish.sub(right);
      if (wish.lengthSq() > 1) wish.normalize();
      wish.multiplyScalar(MAX_SPEED);
    }

    const hasInput = wish.lengthSq() > 0;
    const rate = (walking ? (hasInput ? ACCEL : BRAKE) : STOP_BRAKE) * dt;
    const ax = wish.x - anglerPose.vx;
    const az = wish.z - anglerPose.vz;
    const accel = Math.hypot(ax, az);
    if (accel > 1e-6) {
      const step = Math.min(accel, rate);
      anglerPose.vx += (ax / accel) * step;
      anglerPose.vz += (az / accel) * step;
    }
    if (!hasInput && Math.hypot(anglerPose.vx, anglerPose.vz) < 0.06) {
      anglerPose.vx = 0;
      anglerPose.vz = 0;
    }

    const ox = anglerPose.x;
    const oz = anglerPose.z;
    if (dt > 1e-5) applyWalk(anglerPose.vx * dt, anglerPose.vz * dt);
    if (dt > 1e-5) {
      anglerPose.vx = (anglerPose.x - ox) / dt;
      anglerPose.vz = (anglerPose.z - oz) / dt;
    }

    const speed = Math.hypot(anglerPose.vx, anglerPose.vz);
    if (walking && (hasInput || speed > 0.4)) {
      const heading = Math.atan2(hasInput ? wish.x : anglerPose.vx, hasInput ? wish.z : anglerPose.vz);
      const err = shortestYaw(anglerPose.yaw, heading);
      anglerPose.yaw += err * (1 - Math.exp(-3.6 * dt));
      const leanTarget = THREE.MathUtils.clamp(-err * 0.75, -0.28, 0.28);
      anglerPose.lean += (leanTarget - anglerPose.lean) * (1 - Math.exp(-6 * dt));
    } else {
      anglerPose.lean += (0 - anglerPose.lean) * (1 - Math.exp(-8 * dt));
    }

    const pitchTarget = !walking ? 0 : hasInput ? 0.16 : speed > 0.45 ? -0.12 : 0;
    anglerPose.pitch += (pitchTarget - anglerPose.pitch) * (1 - Math.exp(-4.5 * dt));

    anglerPose.moving = speed > 0.28;
    if (anglerPose.moving) anglerPose.gait += dt * (5.4 + speed * 1.15);
    const targetBob = anglerPose.moving ? Math.abs(Math.sin(anglerPose.gait)) * 0.11 * Math.min(1, speed / 2.2) : 0;
    anglerPose.bob += (targetBob - anglerPose.bob) * (1 - Math.exp(-12 * dt));
    const ground = footHeight(anglerPose.x, anglerPose.z);
    anglerPose.y += (ground - anglerPose.y) * (1 - Math.exp(-14 * dt));

    if (wrap.current) {
      wrap.current.dataset.stance = stanceAt(anglerPose.x, anglerPose.z);
      wrap.current.dataset.angler = `${anglerPose.x.toFixed(3)},${anglerPose.z.toFixed(3)}`;
    }
  });

  return null;
}
