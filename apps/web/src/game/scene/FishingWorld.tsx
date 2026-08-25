import { useEffect, useMemo, useRef, Suspense, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { Angler } from "./Angler";
import { ArticulatedFish } from "./ArticulatedFish";
import { inLake, LakeWorld } from "./LakeWorld";
import { ToonModel } from "./ToonModel";
import type { ScenePhase } from "./types";

const BUOY_URL = "/models/buoy.glb";
useGLTF.preload(BUOY_URL);

type Props = {
  phase: ScenePhase;
  power: number;
  spot: SpotId;
};

const CAM_START: [number, number, number] = [8.8, 6.2, 15.8];
const BOBBER_X: Record<SpotId, number> = { reeds: -2.8, dropoff: 1.6, dock: 0.55 };
const CAMERA_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

function isFighting(phase: ScenePhase) {
  return phase === "fight" || phase === "hookset";
}

function placeBobber(out: THREE.Vector3, spot: SpotId, power: number, dipped: boolean, t: number, aim: THREE.Vector3 | null) {
  if (aim) {
    out.x = aim.x;
    out.z = aim.z;
  } else {
    const reach = 5.2 + power * 9.5;
    out.x = BOBBER_X[spot];
    out.z = 4.2 - reach * (spot === "dropoff" ? 1.15 : 1);
  }
  out.y = dipped ? -0.14 : 0.07 + Math.sin(t * 2.4) * 0.04;
}

function isAiming(phase: ScenePhase) {
  return phase === "idle" || phase === "casting";
}

function CameraRig({ phase }: { phase: ScenePhase }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const keys = useRef(new Set<string>());
  const { camera, gl } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const movement = useMemo(() => new THREE.Vector3(), []);
  const previousTarget = useMemo(() => new THREE.Vector3(), []);
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

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enabled = !locked;
    if (locked || keys.current.size === 0) return;

    forward.subVectors(orbit.target, camera.position).setY(0).normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.set(0, 0, 0);
    if (keys.current.has("w") || keys.current.has("arrowup")) movement.add(forward);
    if (keys.current.has("s") || keys.current.has("arrowdown")) movement.sub(forward);
    if (keys.current.has("d") || keys.current.has("arrowright")) movement.add(right);
    if (keys.current.has("a") || keys.current.has("arrowleft")) movement.sub(right);
    if (movement.lengthSq() === 0) return;

    movement.normalize().multiplyScalar(Math.min(delta, 0.05) * 7);
    previousTarget.copy(orbit.target);
    orbit.target.add(movement);
    orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -10, 10);
    orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -9, 7);
    camera.position.add(orbit.target).sub(previousTarget);
    orbit.update();
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

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl]);

  useFrame(() => {
    if (!isAiming(phase)) {
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
    const wrap = gl.domElement.closest(".scene-wrap");
    if (wrap instanceof HTMLElement) wrap.dataset.aim = overWater ? `${hit.x.toFixed(1)},${hit.z.toFixed(1)}` : "none";
  });

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

type LineAndBobberProps = Props & { rodTip: THREE.Vector3; aim: AimState; lookAt: THREE.Vector3 };

function SurfaceRipple({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!active || !group.current || !material.current) return;
    const pulse = (state.clock.elapsedTime * 0.72) % 1;
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

function HookedFish() {
  const fish = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!fish.current) return;
    const t = state.clock.elapsedTime;
    fish.current.position.y = -0.14 + Math.abs(Math.sin(t * 8)) * 0.2;
    fish.current.rotation.z = Math.sin(t * 10) * 0.28;
    fish.current.rotation.y = Math.sin(t * 6) * 0.55;
  });
  return (
    <group ref={fish} position={[0, -0.14, 0.38]} scale={0.72}>
      <ArticulatedFish color="#b96f43" accent="#e7bd72" speed={1.8} intensity={1.65} />
    </group>
  );
}

function LineAndBobber({ phase, power, spot, rodTip, aim, lookAt }: LineAndBobberProps) {
  const bobber = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const castAim = useMemo(() => new THREE.Vector3(), []);
  const usingAim = useRef(false);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
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
    const aiming = isAiming(phase);
    if (aiming) {
      if (aim.overWater) {
        castAim.copy(aim.live);
        usingAim.current = true;
      } else if (phase === "idle") {
        usingAim.current = false;
      }
    }
    line.visible = inWater;
    if (bobber.current) bobber.current.visible = inWater;
    if (!inWater) {
      if (aiming && aim.overWater) lookAt.copy(aim.live);
      else if (!aiming && usingAim.current) lookAt.copy(castAim);
      return;
    }
    placeBobber(target, spot, Math.max(0.35, power), dipped, state.clock.elapsedTime, usingAim.current ? castAim : null);
    bobber.current?.position.copy(target);
    lookAt.copy(target);
    const wrap = gl.domElement.closest(".scene-wrap");
    if (wrap instanceof HTMLElement) wrap.dataset.bobber = `${target.x.toFixed(2)},${target.z.toFixed(2)}`;
    const attr = line.geometry.getAttribute("position");
    const positions = attr.array as Float32Array;
    rodTip.toArray(positions, 0);
    target.toArray(positions, 3);
    attr.needsUpdate = true;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={bobber} visible={false}>
        <ToonModel url={BUOY_URL} scale={0.32} />
        <SurfaceRipple active={phase === "hookset" || phase === "fight"} />
        {phase === "fight" && <HookedFish />}
      </group>
    </>
  );
}

function Scene({ phase, power, spot }: Props) {
  const rodTip = useMemo(() => new THREE.Vector3(0.4, 2.1, 6.2), []);
  const lookAt = useMemo(() => new THREE.Vector3(0.55, 0, -2), []);
  const aim = useMemo<AimState>(() => ({ live: new THREE.Vector3(), overWater: false }), []);
  return (
    <>
      <CameraRig phase={phase} />
      <LakeWorld spot={spot} />
      <WaterAim phase={phase} aim={aim} />
      <LineAndBobber phase={phase} power={power} spot={spot} rodTip={rodTip} aim={aim} lookAt={lookAt} />
      <Angler phase={phase} power={power} rodTip={rodTip} lookAt={lookAt} />
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
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#b6cbd2"]} />
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
