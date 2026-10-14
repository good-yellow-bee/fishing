import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { OSPREY_CYCLE_SEC, ospreyAt, ospreyStrikeAt } from "./ospreyFlight";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const BACK = "#4a3a2c";
const BELLY = "#f1ece2";
const FISH = "#b9c4c8";
const SPLASH = "#eef6f6";
/** A touch larger than life, so it reads against the hills. */
const SCALE = 1.8;
const SPRAY = [
  [0.3, 1.0],
  [-0.25, 1.2],
  [0.05, 1.5],
  [-0.35, 0.8],
  [0.4, 0.9],
  [0.15, 1.2],
] as const;

function Wing({ side, wing }: { side: 1 | -1; wing: (g: THREE.Group | null) => void }) {
  return (
    <group ref={wing} position={[side * 0.06, 0.03, 0.02]}>
      {/* Inner wing out to the wrist, then the long hand angled back: the osprey's crooked "M". */}
      <mesh position={[side * 0.17, 0, 0]} rotation={[0, side * -0.15, side * 0.12]} castShadow>
        <boxGeometry args={[0.34, 0.025, 0.17]} />
        <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[side * 0.17, -0.014, 0]} rotation={[0, side * -0.15, side * 0.12]}>
        <boxGeometry args={[0.33, 0.006, 0.15]} />
        <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[side * 0.47, 0.02, -0.08]} rotation={[0, side * 0.45, side * -0.12]} castShadow>
        <boxGeometry args={[0.32, 0.02, 0.12]} />
        <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}

/** An osprey that circles low over the lake on fine days and plunges for a fish. */
export function Osprey() {
  const still = useReducedMotion();
  const bird = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([null, null]);
  const fish = useRef<THREE.Mesh>(null);
  const splash = useRef<THREE.Group>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const heard = useRef(-1);

  useFrame((state) => {
    const body = bird.current;
    if (!body) return;
    const time = state.clock.elapsedTime;
    const pose = ospreyAt(time);
    const slot = Math.floor(time / OSPREY_CYCLE_SEC);
    if (heard.current !== slot && time >= ospreyStrikeAt(slot) && time < ospreyStrikeAt(slot) + 1) {
      heard.current = slot;
      fx.farSplash();
    }
    body.visible = !!pose;
    if (splash.current) splash.current.visible = !!pose && pose.ring >= 0;
    if (!pose) return;
    body.position.set(pose.x, Math.max(pose.y, waterHeight(pose.x, pose.z, time) + 0.05), pose.z);
    body.rotation.set(-pose.pitch, pose.yaw, 0, "YXZ");
    const beat = still ? 0 : pose.flapping ? Math.sin(time * 9) * 0.55 : Math.sin(time * 0.9) * 0.05;
    // Folding sweeps the wings back along the body and up.
    const fold = 1 - pose.spread;
    wings.current.forEach((wing, i) => {
      if (!wing) return;
      const side = i === 0 ? 1 : -1;
      wing.rotation.set(0, side * fold * 1.2, side * (0.12 + beat + fold * 0.5));
    });
    if (fish.current) fish.current.visible = pose.fish;
    if (splash.current && ringMaterial.current && pose.ring >= 0) {
      splash.current.position.set(pose.ringX, waterHeight(pose.ringX, pose.ringZ, time) + 0.03, pose.ringZ);
      splash.current.children[0]!.scale.setScalar(0.4 + pose.ring * 2.4);
      ringMaterial.current.opacity = (1 - pose.ring) * 0.6;
      splash.current.children.slice(1).forEach((drop, i) => {
        const [side, up] = SPRAY[i]!;
        const k = pose.ring * 1.6;
        drop.visible = k < 1;
        drop.position.set(side * k * 1.3, Math.max(0, up * k * (1 - k) * 2.6), (i % 2 ? 0.2 : -0.2) * k);
      });
    }
  });

  return (
    <>
      <group ref={bird} name="osprey" scale={SCALE} visible={false}>
        <mesh scale={[0.07, 0.06, 0.2]} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.02, -0.02]} scale={[0.066, 0.045, 0.19]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.03, 0.21]} scale={[0.05, 0.05, 0.06]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color={BELLY} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.03, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.014, 0.05, 6]} />
          <meshToonMaterial color="#2a2420" gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.0, -0.24]} scale={[0.06, 0.012, 0.09]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshToonMaterial color={BACK} gradientMap={toonRamp()} />
        </mesh>
        <Wing side={1} wing={(g) => void (wings.current[0] = g)} />
        <Wing side={-1} wing={(g) => void (wings.current[1] = g)} />
        {/* The catch, held head first in its talons. */}
        <mesh ref={fish} position={[0, -0.08, 0.02]} scale={[0.03, 0.035, 0.13]} visible={false}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color={FISH} gradientMap={toonRamp()} />
        </mesh>
      </group>
      <group ref={splash} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.32, 0.42, 28]} />
          <meshBasicMaterial ref={ringMaterial} color={SPLASH} transparent opacity={0} depthWrite={false} />
        </mesh>
        {SPRAY.map((_, i) => (
          <mesh key={i} scale={0.08}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshBasicMaterial color={SPLASH} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </>
  );
}
