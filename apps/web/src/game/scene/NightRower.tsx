import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { mergePainted } from "./mergeParts";
import { OAR_REACH, lanternFlicker, nightRowAt, rowBladeUp, rowSweep } from "./nightRow";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const WOOD = "#8a5a34";
const RIM = "#5b3a22";
const BOARDS = "#6e4a2c";
const JACKET = "#4b5a3a";
const TROUSERS = "#2f3440";
const CAP = "#6b2f2a";
const SKIN = "#e2b48c";
const SHAFT = "#c9a46e";
const POLE = "#4a3322";
const FLAME = "#ffc46b";
/** The oarlocks either side, the oar's handle inboard of them, and their height above the water. */
const LOCK_X = 0.52;
const LOCK_Y = 0.16;
const LOCK_Z = 0.05;
const INBOARD = 0.55;
/** The lantern hangs from a short pole at the stern. */
const LANTERN = { z: -1.12, y: 0.78 };
/** The streak of lantern light on the water: its width, its length toward the eye, and how far its middle sits toward the eye. */
const STREAK_WIDTH = 0.7;
const STREAK_LENGTH = 4;
const STREAK_TOWARD = 1.6;

/** A small wooden rowing boat, bow toward +z, with its floorboards, thwart and the lantern pole at the stern. */
export function rowboatShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), scale: [0.58, 0.3, 1.25], color: WOOD },
    { geometry: new THREE.TorusGeometry(1, 0.035, 4, 24), position: [0, 0.01, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.57, 1.24, 1], color: RIM },
    { geometry: new THREE.CylinderGeometry(1, 1, 0.02, 14), position: [0, -0.16, 0], scale: [0.4, 1, 0.95], color: BOARDS },
    { geometry: new THREE.BoxGeometry(1.06, 0.04, 0.22), position: [0, 0.02, 0.05], color: RIM },
    { geometry: new THREE.CylinderGeometry(0.02, 0.025, LANTERN.y + 0.05, 5), position: [0, LANTERN.y / 2 - 0.02, LANTERN.z], color: POLE },
    { geometry: new THREE.BoxGeometry(0.03, 0.03, 0.2), position: [0, LANTERN.y + 0.02, LANTERN.z + 0.08], color: POLE },
  ]);
}

/** The rower on the thwart facing the stern (-z), hands forward on the oar handles. */
export function nightRowerShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.28, 0.12, 0.4), position: [0, 0.1, -0.18], color: TROUSERS },
    { geometry: new THREE.CylinderGeometry(0.14, 0.16, 0.48, 8), position: [0, 0.34, 0], color: JACKET },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.67, -0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.106, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.7, 0.01], color: CAP },
    { geometry: new THREE.CylinderGeometry(0.042, 0.042, 0.44, 6), position: [0.15, 0.36, -0.2], rotation: [-1.3, 0, 0.3], color: JACKET },
    { geometry: new THREE.CylinderGeometry(0.042, 0.042, 0.44, 6), position: [-0.15, 0.36, -0.2], rotation: [-1.3, 0, -0.3], color: JACKET },
  ]);
}

/** One oar along +x from its oarlock: the handle inboard, the shaft out to a slim blade. */
export function rowOarShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.016, 0.016, INBOARD + OAR_REACH, 5), position: [(OAR_REACH - INBOARD) / 2, 0, 0], rotation: [0, 0, Math.PI / 2], color: SHAFT },
    { geometry: new THREE.BoxGeometry(0.4, 0.13, 0.02), position: [OAR_REACH - 0.2, 0, 0], color: SHAFT },
  ]);
}

/** Someone rowing slowly round the near half of the lake on calm nights, a lantern at the stern streaking the water with light (nightRow.ts). */
export function NightRower() {
  const still = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  const rower = useRef<THREE.Group>(null);
  const streak = useRef<THREE.Mesh>(null);
  const oars = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shapes = useMemo(() => ({ boat: rowboatShape(), rower: nightRowerShape(), oar: rowOarShape(), lamp: new THREE.BoxGeometry(0.12, 0.16, 0.12), streak: new THREE.PlaneGeometry(1, 1) }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const light = useMemo(() => {
    const map = makeSoftSpotTexture(0.25);
    return {
      map,
      lamp: new THREE.MeshBasicMaterial({ color: FLAME }),
      glow: new THREE.SpriteMaterial({ map, color: FLAME, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      streak: new THREE.MeshBasicMaterial({ map, color: FLAME, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    };
  }, []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, light.map, light.lamp, light.glow, light.streak].forEach((item) => item.dispose());
    },
    [shapes, material, light],
  );
  const lampAt = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    const pose = nightRowAt(time, still);
    const group = boat.current;
    if (!group) return;
    group.position.set(pose.x, waterHeight(pose.x, pose.z, still ? 0 : time) + 0.1, pose.z);
    group.rotation.y = pose.yaw;
    const sweep = rowSweep(pose.stroke);
    const up = rowBladeUp(pose.stroke);
    // Leaning toward the stern to reach at the catch, back through the drive.
    if (rower.current) rower.current.rotation.x = -0.35 * (sweep - 0.05);
    oars.forEach((oar, i) => {
      const side = i === 0 ? 1 : -1;
      if (!oar.current) return;
      oar.current.rotation.set(0, -side * sweep, 0);
      // Blade just under the water through the drive, lifted clear through the recovery.
      const drop = Math.asin((LOCK_Y + 0.1 - 0.2 * up) / OAR_REACH);
      (oar.current.children[0] as THREE.Object3D).rotation.z = -side * drop;
    });
    const flicker = lanternFlicker(time, still);
    light.glow.opacity = 0.85 * flicker;
    // The streak lies on the water between the lantern and the eye, wavering with the flame.
    const back = LANTERN.z + 0.16;
    lampAt.set(pose.x + Math.sin(pose.yaw) * back, LANTERN.y, pose.z + Math.cos(pose.yaw) * back);
    const dx = camera.position.x - lampAt.x;
    const dz = camera.position.z - lampAt.z;
    const d = Math.hypot(dx, dz) || 1;
    const mesh = streak.current;
    if (mesh) {
      mesh.position.set(lampAt.x + (dx / d) * STREAK_TOWARD, 0.06, lampAt.z + (dz / d) * STREAK_TOWARD);
      mesh.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz));
      mesh.scale.set(STREAK_WIDTH * (0.85 + 0.3 * (flicker - 0.9)), STREAK_LENGTH, 1);
      light.streak.opacity = 0.7 * flicker;
    }
  });
  return (
    <group name="night-rower">
      <group ref={boat}>
        <mesh geometry={shapes.boat} material={material} />
        <group ref={rower} position={[0, 0.02, 0.12]}>
          <mesh geometry={shapes.rower} material={material} />
        </group>
        {[1, -1].map((side, i) => (
          <group key={side} ref={oars[i]} position={[side * LOCK_X, LOCK_Y, LOCK_Z]}>
            <group>
              <mesh geometry={shapes.oar} material={material} rotation={[0, side > 0 ? 0 : Math.PI, 0]} />
            </group>
          </group>
        ))}
        <mesh geometry={shapes.lamp} material={light.lamp} position={[0, LANTERN.y - 0.1, LANTERN.z + 0.16]} />
        <sprite material={light.glow} position={[0, LANTERN.y - 0.1, LANTERN.z + 0.16]} scale={[0.9, 0.9, 1]} />
      </group>
      <mesh ref={streak} geometry={shapes.streak} material={light.streak} renderOrder={2} />
    </group>
  );
}
