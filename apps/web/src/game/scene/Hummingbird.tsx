import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { hummingbirdAt } from "./hummingbirdVisits";
import { flowersIn } from "./meadowFlowers";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const GREEN = "#3f8f5a";
const BELLY = "#e6e8e0";
const RUBY = "#c8283a";
const BILL = "#1f1c18";
const TAIL = "#2e4a3a";
const WING = "#d6dde0";
/** Drawn a few times life size, so it reads from the shack. */
const SCALE = 3;

/** The hummingbird's body facing +z: green back, pale belly, ruby throat, and a long thin bill. */
export function hummerShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, 0], scale: [0.012, 0.012, 0.024], color: GREEN },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.004, 0.002], scale: [0.0105, 0.0095, 0.019], color: BELLY },
    { geometry: new THREE.SphereGeometry(0.0105, 10, 8), position: [0, 0.006, 0.022], color: GREEN },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.002, 0.024], scale: [0.008, 0.006, 0.007], color: RUBY },
    { geometry: new THREE.CylinderGeometry(0.0012, 0.002, 0.024, 4), position: [0, 0.005, 0.044], rotation: [Math.PI / 2, 0, 0], color: BILL },
    { geometry: new THREE.BoxGeometry(0.012, 0.002, 0.016), position: [0, -0.002, -0.026], rotation: [0.2, 0, 0], color: TAIL },
  ]);
}

/** One wing, reaching out along +x from the shoulder. */
function wingGeometry() {
  const wing = new THREE.SphereGeometry(1, 8, 4);
  wing.scale(0.02, 0.001, 0.006);
  wing.translate(0.02, 0, 0);
  return wing;
}

/** A hummingbird working the wildflowers by the shack on a summer's day. */
export function Hummingbird({ season }: { season: LakeSeason }) {
  const still = useReducedMotion();
  const flowers = useMemo(() => flowersIn(season), [season]);
  const root = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Mesh | null)[]>([]);
  const body = useMemo(hummerShape, []);
  const wing = useMemo(wingGeometry, []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  // The wings beat too fast to see, so they are drawn as a pale blur.
  const blur = useMemo(() => new THREE.MeshBasicMaterial({ color: WING, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [body, wing, material, blur].forEach((item) => item.dispose());
    },
    [body, wing, material, blur],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = hummingbirdAt(time, flowers, still);
    const bird = root.current;
    if (!bird) return;
    bird.visible = pose !== null;
    if (!pose) return;
    bird.position.set(pose.x, pose.y, pose.z);
    // Hovering it hangs nearly upright, tail down; darting it levels out.
    bird.rotation.set(pose.hovering ? -0.7 : -0.15, pose.yaw, 0, "YXZ");
    const beat = still ? 0.3 : Math.sin(time * 70) * 0.9;
    wings.current.forEach((mesh, side) => {
      if (mesh) mesh.rotation.set(0, side === 0 ? 0 : Math.PI, beat * (side === 0 ? 1 : -1));
    });
  });
  return (
    <group ref={root} name="hummingbird" scale={SCALE} visible={false}>
      <mesh geometry={body} material={material} />
      {[0, 1].map((side) => (
        <mesh key={side} ref={(m) => void (wings.current[side] = m)} geometry={wing} material={blur} position={[side === 0 ? 0.008 : -0.008, 0.006, 0.004]} />
      ))}
    </group>
  );
}
