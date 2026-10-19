import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { lastSplash } from "./duckFlush";
import { mergePainted, mergeParts, poseFromHolders } from "./mergeParts";
import { swanBusk, swanPose, swanScared } from "./swanGlide";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const WHITE = "#f1f0ea";
const BEAK = "#d9682b";
const KNOB = "#1c1a18";
const WAKE = "#dcebe7";
/** The wake's two arms, each this far off the line it glides and this long. */
const WAKE_SPREAD = 0.3;
const WAKE_LENGTH = 2.6;

type SwanParts = {
  body: THREE.BufferGeometry;
  wing: THREE.BufferGeometry;
  neck: THREE.BufferGeometry;
  wake: THREE.BufferGeometry;
  white: THREE.Material;
  painted: THREE.Material;
  foam: THREE.Material;
};

/** The wake's two arms, spreading back from just ahead of the swan, in one shape. */
export function wakeShape() {
  return mergeParts(
    [-1, 1].map((side) => ({
      geometry: new THREE.PlaneGeometry(0.22, WAKE_LENGTH),
      position: [side * Math.sin(WAKE_SPREAD) * (WAKE_LENGTH / 2), 0, 0.3 - Math.cos(WAKE_SPREAD) * (WAKE_LENGTH / 2)] as const,
      rotation: [-Math.PI / 2, 0, side * WAKE_SPREAD] as const,
    })),
  );
}

/** The body and tail never move apart, nor do the neck, head, beak and knob, so each is baked into one shape. */
export function swanShapes(): Pick<SwanParts, "body" | "wing" | "neck"> {
  return {
    body: mergeParts([
      { geometry: new THREE.SphereGeometry(1, 14, 10), position: [0, 0.12, 0], scale: [0.26, 0.17, 0.5] },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.2, -0.46], rotation: [0.7, 0, 0], scale: [0.08, 0.05, 0.14] },
    ]),
    wing: new THREE.SphereGeometry(1, 10, 8),
    neck: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.045, 0.065, 0.36, 8), position: [0, 0.16, 0.02], rotation: [-0.25, 0, 0], color: WHITE },
      { geometry: new THREE.CylinderGeometry(0.04, 0.045, 0.14, 8), position: [0, 0.36, -0.02], rotation: [0.35, 0, 0], color: WHITE },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.44, 0.02], scale: [0.055, 0.05, 0.08], color: WHITE },
      { geometry: new THREE.ConeGeometry(0.025, 0.11, 6), position: [0, 0.425, 0.13], rotation: [Math.PI / 2 + 0.35, 0, 0], color: BEAK },
      { geometry: new THREE.SphereGeometry(1, 6, 5), position: [0, 0.455, 0.085], scale: 0.022, color: KNOB },
    ]),
  };
}

/**
 * One swan's poses: a deep white body with raised wings, and an S of neck hinged at its base so it
 * can tip under to feed. The groups hold no meshes; the pair's parts are drawn as instanced meshes
 * placed on them.
 */
function SwanBody({
  neck,
  wing,
}: {
  neck: (g: THREE.Group | null) => void;
  wing: (side: 0 | 1, g: THREE.Group | null) => void;
}) {
  return (
    <>
      {/* Folded wings held up over the back, the mute swan's arch. */}
      {/* Hinged at the shoulder, so an angry swan can raise them. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.1, 0.22, 0.05]} ref={(g) => wing(side < 0 ? 0 : 1, g)}>
          <group name="swan-wing" position={[side * 0.03, 0.02, -0.13]} rotation={[0.25, 0, side * 0.35]} scale={[0.1, 0.1, 0.36]} />
        </group>
      ))}
      <group ref={neck} position={[0, 0.18, 0.38]} />
    </>
  );
}

/** A pair of swans gliding the far water, each with its wake; motion lives in swanGlide.ts. */
export function Swans() {
  const root = useRef<THREE.Group>(null);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const wingMeshes = useRef<THREE.InstancedMesh>(null);
  const neckMeshes = useRef<THREE.InstancedMesh>(null);
  const wakeMeshes = useRef<THREE.InstancedMesh>(null);
  const swans = useRef<(THREE.Group | null)[]>([]);
  const necks = useRef<(THREE.Group | null)[]>([]);
  const wakes = useRef<(THREE.Group | null)[]>([]);
  const wings = useRef<(THREE.Group | null)[][]>([[], []]);
  const angry = useRef({ at: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY], heard: Number.NEGATIVE_INFINITY });
  const parts = useMemo<SwanParts>(
    () => ({
      ...swanShapes(),
      wake: wakeShape(),
      foam: new THREE.MeshBasicMaterial({ color: WAKE, transparent: true, opacity: 0.28, depthWrite: false }),
      white: new THREE.MeshToonMaterial({ color: WHITE, gradientMap: toonRamp() }),
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(parts).forEach((thing) => thing.dispose());
    },
    [parts],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    // Each splash is looked at once; the nearer swan raises its wings and hisses at it.
    const mood = angry.current;
    if (lastSplash.at !== mood.heard) {
      const k = swanScared(lastSplash, time);
      if (k >= 0) {
        mood.heard = lastSplash.at;
        mood.at[k] = time;
        fx.swanHiss();
      } else if (time - lastSplash.at >= 0.6) {
        mood.heard = lastSplash.at;
      }
    }
    for (const k of [0, 1] as const) {
      const swan = swans.current[k];
      const wake = wakes.current[k];
      if (!swan || !wake) continue;
      const pose = swanPose(k, time);
      const surface = waterHeight(pose.x, pose.z, time);
      swan.position.set(pose.x, surface - 0.04, pose.z);
      // Bottoms up while it feeds: the body tips forward as the neck goes under.
      const busk = swanBusk(time - mood.at[k]!);
      // An angry swan keeps its head up.
      const dip = pose.dip * (1 - busk);
      swan.rotation.set(dip * 0.5, pose.yaw, 0, "YXZ");
      const neck = necks.current[k];
      if (neck) neck.rotation.x = dip * 1.9 - busk * 0.45;
      wings.current[k]!.forEach((wing, side) => {
        if (wing) wing.rotation.set(busk * 0.5, 0, (side === 0 ? -1 : 1) * busk * 0.9);
      });
      wake.position.set(pose.x, surface + 0.04, pose.z);
      wake.rotation.y = pose.yaw;
    }
    if (!root.current) return;
    root.current.updateMatrixWorld();
    poseFromHolders(bodies.current, root.current, swans.current);
    poseFromHolders(neckMeshes.current, root.current, necks.current);
    poseFromHolders(wingMeshes.current, root.current, wings.current.flatMap((pair) => pair.map((wing) => wing?.children[0] ?? null)));
    poseFromHolders(wakeMeshes.current, root.current, wakes.current);
  });
  return (
    <group ref={root} name="swans">
      {[0, 1].map((k) => (
        <group key={k}>
          <group ref={(g) => void (swans.current[k] = g)} name="swan" scale={k === 0 ? 1.5 : 1.38}>
            <SwanBody neck={(g) => void (necks.current[k] = g)} wing={(side, g) => void (wings.current[k]![side] = g)} />
          </group>
          <group ref={(g) => void (wakes.current[k] = g)} />
        </group>
      ))}
      <instancedMesh ref={bodies} args={[parts.body, parts.white, 2]} frustumCulled={false} />
      <instancedMesh ref={wingMeshes} args={[parts.wing, parts.white, 4]} frustumCulled={false} />
      <instancedMesh ref={neckMeshes} args={[parts.neck, parts.painted, 2]} frustumCulled={false} />
      <instancedMesh ref={wakeMeshes} args={[parts.wake, parts.foam, 2]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
