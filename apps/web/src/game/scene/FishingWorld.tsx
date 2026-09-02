import { useEffect, useMemo, useRef, Suspense, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { inLake, spotAt, type FishSpecies, type LakeHour, type SpotId } from "@stillwater/shared";
import type { FightSim } from "../fight";
import { fx } from "../fx";
import { Angler } from "./Angler";
import { ArticulatedFish } from "./ArticulatedFish";
import { LakeWorld, LAKE_HOUR_LOOK } from "./LakeWorld";
import { ToonModel } from "./ToonModel";
import type { ScenePhase } from "./types";
import { useSceneWrap } from "./useSceneWrap";

const BUOY_URL = "/models/buoy.glb";
useGLTF.preload(BUOY_URL);

export type SimRef = { current: FightSim | null };

type Props = {
  phase: ScenePhase;
  power: number;
  spot: SpotId;
  sim: SimRef;
  nibble: boolean;
  hour: LakeHour;
  species: FishSpecies | null;
  weight: number;
};

const CAM_START: [number, number, number] = [8.8, 6.2, 15.8];
const BOBBER_X: Record<SpotId, number> = { reeds: -2.8, dropoff: 1.6, dock: 0.55 };
const CAMERA_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const ANGLER_POINT = new THREE.Vector3(0.15, 1, 7.4);

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

function isFighting(phase: ScenePhase) {
  return phase === "fight" || phase === "hookset";
}

function placeBobber(
  out: THREE.Vector3,
  spot: SpotId,
  power: number,
  dipped: boolean,
  t: number,
  aim: THREE.Vector3 | null,
  nibble: boolean,
) {
  if (aim) {
    out.x = aim.x;
    out.z = aim.z;
  } else {
    const reach = 5.2 + power * 9.5;
    out.x = BOBBER_X[spot];
    out.z = 4.2 - reach * (spot === "dropoff" ? 1.15 : 1);
  }
  if (dipped) out.y = -0.14;
  else if (nibble) out.y = -0.08 + Math.sin(t * 26) * 0.05;
  else out.y = 0.07 + Math.sin(t * 2.4) * 0.04;
}

function isAiming(phase: ScenePhase) {
  return phase === "idle" || phase === "casting";
}

function CameraRig({ phase, sim }: { phase: ScenePhase; sim: SimRef }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const keys = useRef(new Set<string>());
  const { camera, gl } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const movement = useMemo(() => new THREE.Vector3(), []);
  const previousTarget = useMemo(() => new THREE.Vector3(), []);
  const restTarget = useMemo(() => new THREE.Vector3(), []);
  const focusPoint = useMemo(() => new THREE.Vector3(), []);
  const shakeOffset = useMemo(() => new THREE.Vector3(), []);
  const shakeAmp = useRef(0);
  const wasFight = useRef(false);
  const returning = useRef(false);
  const prevPhase = useRef(phase);
  const prevSurge = useRef(0);
  const locked = phase === "fight" || phase === "result";

  useEffect(() => {
    const canvas = gl.domElement;
    const preventMenu = (event: MouseEvent) => event.preventDefault();
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      const key = event.key.toLowerCase();
      if (!CAMERA_KEYS.has(key)) return;
      event.preventDefault();
      if (event.type === "keydown") keys.current.add(key);
      else keys.current.delete(key);
    };
    const clearKeys = () => keys.current.clear();

    canvas.addEventListener("contextmenu", preventMenu);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", clearKeys);
    return () => {
      canvas.removeEventListener("contextmenu", preventMenu);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clearKeys);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enabled = !locked;
    const t = state.clock.elapsedTime;
    const fighting = phase === "fight";

    // Shake impulses: big on snap/escape (fight ends without a landing), tiny on surge start.
    if (prevPhase.current === "fight" && phase !== "fight" && !fightEndedLanded()) shakeAmp.current = 0.12;
    prevPhase.current = phase;
    const surge = sim.current?.surge ?? 0;
    if (fighting && surge === 2 && prevSurge.current !== 2) shakeAmp.current = Math.max(shakeAmp.current, 0.05);
    prevSurge.current = surge;
    camera.position.sub(shakeOffset);

    if (fighting) {
      if (!wasFight.current) {
        wasFight.current = true;
        // Keep the original rest point if a new fight starts mid-return.
        if (!returning.current) restTarget.copy(orbit.target);
        returning.current = false;
      }
      focusPoint.copy(ANGLER_POINT).add(bobberWorld).multiplyScalar(0.5);
      focusPoint.lerpVectors(restTarget, focusPoint, 0.35);
      orbit.target.lerp(focusPoint, 1 - Math.exp(-4.5 * delta));
      orbit.update();
    } else if (wasFight.current) {
      wasFight.current = false;
      returning.current = true;
    }
    if (!fighting && returning.current) {
      orbit.target.lerp(restTarget, 1 - Math.exp(-4.5 * delta));
      orbit.update();
      if (orbit.target.distanceToSquared(restTarget) < 0.0004 || (!locked && keys.current.size > 0)) returning.current = false;
    }

    if (!locked && keys.current.size > 0) {
      forward.subVectors(orbit.target, camera.position).setY(0).normalize();
      right.crossVectors(forward, camera.up).normalize();
      movement.set(0, 0, 0);
      if (keys.current.has("w") || keys.current.has("arrowup")) movement.add(forward);
      if (keys.current.has("s") || keys.current.has("arrowdown")) movement.sub(forward);
      if (keys.current.has("d") || keys.current.has("arrowright")) movement.add(right);
      if (keys.current.has("a") || keys.current.has("arrowleft")) movement.sub(right);
      if (movement.lengthSq() > 0) {
        movement.normalize().multiplyScalar(Math.min(delta, 0.05) * 7);
        previousTarget.copy(orbit.target);
        orbit.target.add(movement);
        orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -10, 10);
        orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -9, 7);
        camera.position.add(orbit.target).sub(previousTarget);
        orbit.update();
      }
    }

    if (shakeAmp.current > 0.001) {
      shakeAmp.current *= Math.exp(-delta / 0.13);
      shakeOffset.set(
        Math.sin(t * 47) * shakeAmp.current,
        Math.sin(t * 53 + 1.3) * shakeAmp.current,
        Math.sin(t * 41 + 2.1) * shakeAmp.current,
      );
    } else {
      shakeAmp.current = 0;
      shakeOffset.set(0, 0, 0);
    }
    camera.position.add(shakeOffset);
  });

  return (
    <OrbitControls
      ref={controls}
      target={[0, 0.8, 0.5]}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={7}
      maxDistance={24}
      minPolarAngle={0.28}
      maxPolarAngle={1.34}
      minAzimuthAngle={-1.25}
      maxAzimuthAngle={1.25}
      mouseButtons={{ LEFT: -1 as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
      touches={{ ONE: -1 as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
}

type AimState = {
  live: THREE.Vector3;
  overWater: boolean;
};

function WaterAim({ phase, aim }: { phase: ScenePhase; aim: AimState }) {
  const marker = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef(new THREE.Vector2());
  const wrap = useSceneWrap();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const syncAim = useRef(() => {});
  syncAim.current = () => {
    if (!isAiming(phaseRef.current)) {
      if (marker.current) marker.current.visible = false;
      return;
    }
    raycaster.setFromCamera(pointer.current, camera);
    const point = raycaster.ray.intersectPlane(plane, hit);
    const overWater = point != null && inLake(point.x, point.z);
    aim.overWater = overWater;
    if (overWater) aim.live.copy(hit);
    if (marker.current) {
      marker.current.visible = overWater;
      if (overWater) marker.current.position.set(hit.x, 0.04, hit.z);
    }
    if (wrap.current) {
      wrap.current.dataset.aim = overWater ? `${hit.x.toFixed(3)},${hit.z.toFixed(3)}` : "none";
      wrap.current.dataset.spot = overWater ? (spotAt(hit.x, hit.z) ?? "shore") : "shore";
    }
  };

  useEffect(() => {
    const onPoint = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      syncAim.current();
    };
    window.addEventListener("pointermove", onPoint);
    window.addEventListener("pointerdown", onPoint);
    window.addEventListener("pointerup", onPoint, true);
    return () => {
      window.removeEventListener("pointermove", onPoint);
      window.removeEventListener("pointerdown", onPoint);
      window.removeEventListener("pointerup", onPoint, true);
    };
  }, [gl]);

  useFrame(() => syncAim.current());

  return (
    <group ref={marker} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 28]} />
        <meshBasicMaterial color="#e7f2ea" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 12]} />
        <meshBasicMaterial color="#f4fff6" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}

type LineAndBobberProps = Omit<Props, "hour"> & { rodTip: THREE.Vector3; aim: AimState; lookAt: THREE.Vector3 };

function SurfaceRipple({ active, sim }: { active: boolean; sim: SimRef }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!active || !group.current || !material.current) return;
    const speed = sim.current?.surge === 2 ? 1.8 : 1;
    const pulse = (state.clock.elapsedTime * 0.72 * speed) % 1;
    group.current.scale.setScalar(0.55 + pulse * 2.3);
    material.current.opacity = (1 - pulse) * 0.4;
  });
  // The bobber group sits at y=-0.14 while fighting; lift the ring back to the water surface.
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

  useFrame((_, delta) => {
    const surge = sim.current?.surge ?? 0;
    if (surge === 2 && prevSurge.current !== 2) burstRef.current();
    prevSurge.current = surge;
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

const LEAP_SEC = 0.7;
const LEAP_GAP = 1.2;

function HookedFish({
  sim,
  burstRef,
  color,
  accent,
  scale,
}: {
  sim: SimRef;
  burstRef: BurstRef;
  color: string;
  accent: string;
  scale: number;
}) {
  const fish = useRef<THREE.Group>(null);
  const leapStart = useRef(-1);
  const nextLeapAt = useRef(0);
  const prevSurge = useRef(0);
  useFrame((state) => {
    if (!fish.current) return;
    const t = state.clock.elapsedTime;
    const surge = sim.current?.surge ?? 0;
    if (surge === 2 && prevSurge.current !== 2) nextLeapAt.current = t + 0.45;
    prevSurge.current = surge;
    if (leapStart.current >= 0) {
      const p = (t - leapStart.current) / LEAP_SEC;
      if (p < 1) {
        fish.current.position.y = -0.14 + Math.sin(p * Math.PI) * 0.55;
        fish.current.rotation.x = -p * Math.PI * 2;
        fish.current.rotation.z = 0;
        fish.current.rotation.y = 0;
        return;
      }
      leapStart.current = -1;
      nextLeapAt.current = t + LEAP_GAP;
      fish.current.rotation.x = 0;
      burstRef.current();
    } else if (surge === 2 && t >= nextLeapAt.current) {
      leapStart.current = t;
      return;
    }
    const speed = surge === 2 ? 1.45 : 1;
    const twist = surge === 2 ? 1.8 : surge === 1 ? 1.15 : 1;
    const bounce = surge === 2 ? 1.6 : 1;
    fish.current.position.y = -0.14 + Math.abs(Math.sin(t * 8 * speed)) * 0.2 * bounce;
    fish.current.rotation.z = Math.sin(t * 10 * speed) * 0.28 * twist;
    fish.current.rotation.y = Math.sin(t * 6 * speed) * 0.55 * twist;
  });
  return (
    <group ref={fish} position={[0, -0.14, 0.38]} scale={scale}>
      <ArticulatedFish color={color} accent={accent} speed={1.8} intensity={1.65} />
    </group>
  );
}

const DOCK_POINT = new THREE.Vector3(0.3, 0, 5.9);
const FLIGHT_SEC = 0.55;
const SPLASH_SEC = 0.7;
const LINE_POINTS = 11;
const FALLBACK_COLOR = "#b96f43";
const FALLBACK_ACCENT = "#e7bd72";

function bodyScale(weight: number) {
  return 0.5 + Math.min(0.45, weight / 28);
}

function StalkingFish({ active }: { active: boolean }) {
  const fish = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = fish.current;
    if (!g) return;
    const show = active && bobberWorld.y < 0.18;
    g.visible = show;
    if (!show) return;
    const t = state.clock.elapsedTime;
    const r = 0.62;
    g.position.set(Math.cos(t * 1.7) * r, -0.22, Math.sin(t * 1.7) * r);
    g.rotation.y = t * 1.7 + Math.PI / 2;
  });
  return (
    <group ref={fish} visible={false} scale={0.42}>
      <ArticulatedFish color="#24343c" accent="#3d4a52" speed={2.2} intensity={1.4} />
    </group>
  );
}

function LineAndBobber({ phase, power, spot, sim, rodTip, aim, lookAt, nibble, species, weight }: LineAndBobberProps) {
  const bobber = useRef<THREE.Group>(null);
  const splash = useRef<THREE.Group>(null);
  const splashMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const wrap = useSceneWrap();
  const target = useMemo(() => new THREE.Vector3(), []);
  const castAim = useMemo(() => new THREE.Vector3(), []);
  const flightFrom = useMemo(() => new THREE.Vector3(), []);
  const flightTo = useMemo(() => new THREE.Vector3(), []);
  const usingAim = useRef(false);
  const prevPhase = useRef(phase);
  const flightStart = useRef(-1);
  const splashStart = useRef(-1);
  const lastLine = useRef(1);
  const burstRef = useRef<() => void>(() => {});
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINE_POINTS * 3), 3));
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
  const inWater = phase === "waiting" || dipped;

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      line.material.dispose();
    };
  }, [line]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const aiming = isAiming(phase);
    const castStarted = prevPhase.current === "casting" && phase === "waiting";
    const fightStarted = prevPhase.current !== "fight" && phase === "fight";
    prevPhase.current = phase;
    if (aiming) {
      usingAim.current = aim.overWater;
      if (aim.overWater) castAim.copy(aim.live);
    }
    line.visible = inWater;
    if (bobber.current) bobber.current.visible = inWater;
    if (!inWater) {
      flightStart.current = -1;
      if (aiming && aim.overWater) lookAt.copy(aim.live);
      else if (!aiming && usingAim.current) lookAt.copy(castAim);
      return;
    }
    placeBobber(target, spot, Math.max(0.35, power), dipped, t, usingAim.current ? castAim : null, nibble);
    if (castStarted) {
      flightFrom.copy(rodTip);
      flightTo.set(target.x, 0.07, target.z);
      flightStart.current = t;
    }
    const flying = phase === "waiting" && flightStart.current >= 0 && t - flightStart.current < FLIGHT_SEC;
    if (flying) {
      const p = (t - flightStart.current) / FLIGHT_SEC;
      const e = p * (2 - p);
      target.lerpVectors(flightFrom, flightTo, e);
      target.y += 2.2 * 4 * p * (1 - p);
    } else if (flightStart.current >= 0) {
      flightStart.current = -1;
      splashStart.current = t;
      fx.plop();
    }
    if (phase === "fight") {
      // Hold the last simulated line fraction so a fight ending mid-frame
      // (sim nulled before the phase prop commits) doesn't snap the bobber back.
      const fightSim = sim.current;
      // Capture the sim for fightEndedLanded; reset on entry so an underpowered
      // fight (sim stays null) can't inherit the previous fight's landing.
      if (fightStarted || fightSim) lastFightSim = fightSim;
      if (fightSim) lastLine.current = fightSim.line;
      target.x = THREE.MathUtils.lerp(DOCK_POINT.x, target.x, lastLine.current);
      target.z = THREE.MathUtils.lerp(DOCK_POINT.z, target.z, lastLine.current);
      if (fightSim) target.y += Math.sin(t * 14) * 0.05 * (fightSim.surge === 2 ? 2 : 1);
    } else {
      lastLine.current = 1;
    }
    if (splash.current && splashMaterial.current) {
      const k = splashStart.current >= 0 ? (t - splashStart.current) / SPLASH_SEC : 1;
      if (k >= 1) {
        splash.current.visible = false;
        splashStart.current = -1;
      } else {
        splash.current.visible = true;
        splash.current.position.set(flightTo.x, 0.03, flightTo.z);
        splash.current.scale.setScalar(0.4 + k * 1.4);
        splashMaterial.current.opacity = (1 - k) * 0.5;
      }
    }
    bobber.current?.position.copy(target);
    bobberWorld.copy(target);
    lookAt.copy(target);
    if (wrap.current) wrap.current.dataset.bobber = `${target.x.toFixed(2)},${target.z.toFixed(2)}`;
    // Quadratic sag: taut under tension during the fight, a relaxed drape otherwise.
    let sag = 0.22;
    if (phase === "fight" && sim.current) sag = 0.04 + Math.max(0, 1 - sim.current.tension) * 0.5;
    const attr = line.geometry.getAttribute("position");
    const positions = attr.array as Float32Array;
    for (let i = 0; i < LINE_POINTS; i += 1) {
      const s = i / (LINE_POINTS - 1);
      positions[i * 3] = rodTip.x + (target.x - rodTip.x) * s;
      positions[i * 3 + 1] = rodTip.y + (target.y - rodTip.y) * s - sag * 4 * s * (1 - s);
      positions[i * 3 + 2] = rodTip.z + (target.z - rodTip.z) * s;
    }
    attr.needsUpdate = true;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={splash} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 28]} />
          <meshBasicMaterial ref={splashMaterial} color="#e7f2ea" transparent depthWrite={false} />
        </mesh>
      </group>
      <group ref={bobber} visible={false}>
        <ToonModel url={BUOY_URL} scale={0.32} />
        <SurfaceRipple active={phase === "hookset" || phase === "fight"} sim={sim} />
        {phase === "waiting" && <StalkingFish active />}
        {phase === "fight" && <SurgeSpray sim={sim} burstRef={burstRef} />}
        {phase === "fight" && (
          <HookedFish
            sim={sim}
            burstRef={burstRef}
            color={species?.color ?? FALLBACK_COLOR}
            accent={species?.accent ?? FALLBACK_ACCENT}
            scale={bodyScale(weight)}
          />
        )}
      </group>
    </>
  );
}

const CATCH_FLIGHT_SEC = 0.5;

function CaughtFish({
  phase,
  hand,
  color,
  accent,
  scale,
}: {
  phase: ScenePhase;
  hand: THREE.Vector3;
  color: string;
  accent: string;
  scale: number;
}) {
  const group = useRef<THREE.Group>(null);
  const from = useMemo(() => new THREE.Vector3(), []);
  const prevPhase = useRef(phase);
  const flightStart = useRef(-1);
  // Misses and breaks also land on "result"; only celebrate an actual landing.
  const caught = useRef(false);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (prevPhase.current === "fight" && phase === "result" && fightEndedLanded()) {
      caught.current = true;
      from.copy(bobberWorld);
      flightStart.current = t;
    }
    prevPhase.current = phase;
    if (phase !== "result") caught.current = false;
    const g = group.current;
    if (!g) return;
    const active = phase === "result" && caught.current;
    g.visible = active;
    if (!active) return;
    const p = flightStart.current >= 0 ? Math.min(1, (t - flightStart.current) / CATCH_FLIGHT_SEC) : 1;
    g.position.lerpVectors(from, hand, p);
    g.position.y += 1.2 * 4 * p * (1 - p) + 0.35;
    if (p < 1) {
      // Spin through the arc, settling head-up in the angler's grip.
      g.rotation.x = -p * Math.PI * 2.5;
      g.rotation.z = 0;
    } else {
      g.rotation.x = -Math.PI / 2;
      g.rotation.z = Math.sin(t * 2.6) * 0.1;
      g.position.y += Math.sin(t * 2.2) * 0.03;
    }
  });
  return (
    <group ref={group} visible={false} scale={scale}>
      <ArticulatedFish color={color} accent={accent} speed={0.6} intensity={0.5} />
    </group>
  );
}

function Tone({ hour }: { hour: LakeHour }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = hour === "night" ? 0.72 : hour === "dusk" ? 0.92 : 1.05;
  }, [gl, hour]);
  return null;
}

function Scene({ phase, power, spot, sim, nibble, hour, species, weight }: Props) {
  const rodTip = useMemo(() => new THREE.Vector3(0.4, 2.1, 6.2), []);
  const hand = useMemo(() => new THREE.Vector3(0.15, 1.1, 7.2), []);
  const lookAt = useMemo(() => new THREE.Vector3(0.55, 0, -2), []);
  const aim = useMemo<AimState>(() => ({ live: new THREE.Vector3(), overWater: false }), []);
  return (
    <>
      <CameraRig phase={phase} sim={sim} />
      <Tone hour={hour} />
      <LakeWorld spot={spot} hour={hour} />
      <WaterAim phase={phase} aim={aim} />
      <LineAndBobber
        phase={phase}
        power={power}
        spot={spot}
        sim={sim}
        nibble={nibble}
        species={species}
        weight={weight}
        rodTip={rodTip}
        aim={aim}
        lookAt={lookAt}
      />
      <CaughtFish
        phase={phase}
        hand={hand}
        color={species?.color ?? FALLBACK_COLOR}
        accent={species?.accent ?? FALLBACK_ACCENT}
        scale={bodyScale(weight)}
      />
      <Angler phase={phase} power={power} sim={sim} rodTip={rodTip} hand={hand} lookAt={lookAt} />
    </>
  );
}

export function FishingWorld(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: CAM_START, fov: 42, near: 0.1, far: 160 }}
      gl={{ antialias: true }}
      style={{ cursor: "crosshair" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = props.hour === "night" ? 0.72 : props.hour === "dusk" ? 0.92 : 1.05;
      }}
    >
      <color attach="background" args={[LAKE_HOUR_LOOK[props.hour].fog]} />
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
