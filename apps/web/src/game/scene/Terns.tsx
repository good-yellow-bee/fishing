import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TERN_COUNT, TERN_STILL_TIME, ternPose } from "./ternHover";
import { pitchTurn } from "./bodyPitch";
import { mergePainted, mergeParts } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const WHITE = "#f4f5f2";
const GREY = "#c9d0d3";
const CAP = "#1b1b1b";
const BILL = "#d2452b";
/** Larger than life, so they read against the far bank. */
const SCALE = 1.8;
/** Meters a second they shift across when the fish patch moves. */
const FOLLOW = 1.5;
const SPLASH_SEC = 0.6;

/** A tern's body, cap, bill and forked tail bake into one shape; each long, narrow wing into another, hinged at the shoulder. */
export function ternShapes() {
  const wing = (side: 1 | -1) =>
    mergeParts([{ geometry: new THREE.BoxGeometry(0.26, 0.006, 0.05), position: [side * 0.13, 0, -0.01], rotation: [0, side * 0.2, 0] }]);
  return {
    body: mergePainted([
      { geometry: new THREE.SphereGeometry(1, 8, 6), scale: [0.035, 0.032, 0.11], color: WHITE },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.02, 0.09], scale: 0.03, color: CAP },
      { geometry: new THREE.ConeGeometry(0.008, 0.05, 5), position: [0, 0.015, 0.14], rotation: [Math.PI / 2, 0, 0], color: BILL },
      // The forked tail.
      ...[-1, 1].map((side) => ({
        geometry: new THREE.BoxGeometry(1, 1, 1),
        position: [side * 0.015, 0, -0.14] as const,
        rotation: [0, side * 0.3, 0] as const,
        scale: [0.008, 0.004, 0.07] as const,
        color: WHITE,
      })),
    ]),
    right: wing(1),
    left: wing(-1),
  };
}

/** Where each wing hinges at the shoulder, right then left, in the bird's own size. */
const SHOULDERS = [new THREE.Vector3(0.025, 0.01, 0.01), new THREE.Vector3(-0.025, 0.01, 0.01)];

/** Terns circling and plunging over the day's fish patch; motion lives in ternHover.ts. Bodies and each side's wings are one instanced mesh apiece: three draws. */
export function Terns({ center }: { center: { x: number; z: number } }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const rights = useRef<THREE.InstancedMesh>(null);
  const lefts = useRef<THREE.InstancedMesh>(null);
  const splashes = useRef<(THREE.Mesh | null)[]>([]);
  const shapes = useMemo(ternShapes, []);
  // Reduced motion hangs them over the patch, wings out: no 2-a-second beats or plunges. They still slide to a new patch.
  const still = useReducedMotion();
  const looks = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      wing: new THREE.MeshToonMaterial({ color: GREY, gradientMap: toonRamp() }),
    }),
    [],
  );
  const scratch = useMemo(() => ({ root: new THREE.Matrix4(), wing: new THREE.Matrix4(), turn: new THREE.Euler(0, 0, 0, "YXZ"), flap: new THREE.Euler(), quat: new THREE.Quaternion(), at: new THREE.Vector3(), size: new THREE.Vector3(SCALE, SCALE, SCALE) }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.right, shapes.left, looks.painted, looks.wing].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );
  // Where they are working now; it slides over to a new patch rather than jumping.
  const working = useRef<{ x: number; z: number } | null>(null);
  useFrame(({ clock }, delta) => {
    const time = still ? TERN_STILL_TIME : clock.elapsedTime;
    const at = (working.current ??= { ...center });
    const dx = center.x - at.x;
    const dz = center.z - at.z;
    const gap = Math.hypot(dx, dz);
    const step = Math.min(gap, FOLLOW * delta);
    if (gap > 1e-6) {
      at.x += (dx / gap) * step;
      at.z += (dz / gap) * step;
    }
    const body = bodies.current;
    const sides = [rights.current, lefts.current];
    if (!body || !sides[0] || !sides[1]) return;
    for (let k = 0; k < TERN_COUNT; k += 1) {
      const pose = ternPose(k, time, at);
      const surface = waterHeight(pose.x, pose.z, time);
      // Nose down through the plunge.
      scratch.turn.set(pitchTurn(pose.diving ? -1.2 : 0), pose.yaw, 0);
      scratch.root.compose(scratch.at.set(pose.x, surface + pose.y, pose.z), scratch.quat.setFromEuler(scratch.turn), scratch.size);
      body.setMatrixAt(k, scratch.root);
      sides.forEach((wings, side) => {
        scratch.flap.set(0, 0, (side === 0 ? 1 : -1) * pose.flap * 0.7);
        scratch.wing.makeRotationFromEuler(scratch.flap).setPosition(SHOULDERS[side]!);
        wings!.setMatrixAt(k, scratch.wing.premultiply(scratch.root));
      });
      const splash = splashes.current[k];
      if (splash) {
        splash.visible = pose.splash >= 0 && pose.splash < SPLASH_SEC;
        if (splash.visible) {
          const u = pose.splash / SPLASH_SEC;
          splash.position.set(pose.x, surface + 0.03, pose.z);
          splash.scale.setScalar(0.15 + u * 0.5);
          (splash.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.6;
        }
      }
    }
    [body, ...sides].forEach((mesh) => (mesh!.instanceMatrix.needsUpdate = true));
  });
  return (
    <>
      {/* The terns follow the fish patch about the lake, so they are never culled by a stale bound. */}
      <instancedMesh ref={bodies} name="tern" args={[shapes.body, looks.painted, TERN_COUNT]} frustumCulled={false} />
      <instancedMesh ref={rights} args={[shapes.right, looks.wing, TERN_COUNT]} frustumCulled={false} />
      <instancedMesh ref={lefts} args={[shapes.left, looks.wing, TERN_COUNT]} frustumCulled={false} />
      {Array.from({ length: TERN_COUNT }, (_, k) => (
        <mesh key={k} ref={(m) => void (splashes.current[k] = m)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.7, 1, 18]} />
          <meshBasicMaterial color="#eef6f6" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
