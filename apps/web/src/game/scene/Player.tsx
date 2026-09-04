import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { stanceAt, walkableAt } from "@stillwater/shared";
import { anglerPose } from "./pose";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";

const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const SPEED = 4.2;

function canWalk(phase: ScenePhase) {
  return phase === "idle" || phase === "result";
}

function applyWalk(dx: number, dz: number, move: THREE.Vector3) {
  const nx = anglerPose.x + dx;
  const nz = anglerPose.z + dz;
  if (walkableAt(nx, nz)) {
    anglerPose.x = nx;
    anglerPose.z = nz;
    return;
  }
  if (walkableAt(nx, anglerPose.z)) {
    anglerPose.x = nx;
    move.z = 0;
    return;
  }
  if (walkableAt(anglerPose.x, nz)) {
    anglerPose.z = nz;
    move.x = 0;
    return;
  }
  move.set(0, 0, 0);
}

export function PlayerMove({ phase }: { phase: ScenePhase }) {
  const keys = useRef(new Set<string>());
  const { camera } = useThree();
  const wrap = useSceneWrap();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);

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
    move.set(0, 0, 0);
    if (canWalk(phase) && keys.current.size > 0) {
      forward.set(anglerPose.x - camera.position.x, 0, anglerPose.z - camera.position.z);
      if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
      else forward.normalize();
      right.crossVectors(forward, camera.up).setY(0).normalize();
      if (keys.current.has("w") || keys.current.has("arrowup")) move.add(forward);
      if (keys.current.has("s") || keys.current.has("arrowdown")) move.sub(forward);
      if (keys.current.has("d") || keys.current.has("arrowright")) move.add(right);
      if (keys.current.has("a") || keys.current.has("arrowleft")) move.sub(right);
    }
    let moving = false;
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(Math.min(delta, 0.05) * SPEED);
      applyWalk(move.x, move.z, move);
      moving = move.lengthSq() > 0;
      if (moving) anglerPose.yaw = Math.atan2(move.x, move.z);
    }
    anglerPose.moving = moving;
    if (wrap.current) {
      wrap.current.dataset.stance = stanceAt(anglerPose.x, anglerPose.z);
      wrap.current.dataset.angler = `${anglerPose.x.toFixed(3)},${anglerPose.z.toFixed(3)}`;
    }
  });

  return null;
}
