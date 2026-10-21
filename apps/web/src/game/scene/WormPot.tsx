import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aboard } from "./boat";
import { tinSpot } from "./bucketSpot";
import { mergePainted } from "./mergeParts";
import { anglerPose } from "./pose";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { TIN_WORMS_SHOWN, tinWorm } from "./tinWormPose";
import { toonRamp } from "./toon";

const TIN = "#9aa3a8";
const BAND = "#a8553f";
const RIM = "#6b757b";
const SOIL = "#4a3726";
const WORM = "#d98a8f";
/** The tin's height and its rim's radius. */
const HEIGHT = 0.09;
const RIM_R = 0.085;

function tinShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(RIM_R, RIM_R, HEIGHT, 14, 1, true), position: [0, HEIGHT / 2, 0], color: TIN },
    { geometry: new THREE.CylinderGeometry(RIM_R * 1.01, RIM_R * 1.01, HEIGHT * 0.4, 14, 1, true), position: [0, HEIGHT * 0.45, 0], color: BAND },
    { geometry: new THREE.TorusGeometry(RIM_R, 0.006, 4, 16).rotateX(Math.PI / 2), position: [0, HEIGHT, 0], color: RIM },
    { geometry: new THREE.CircleGeometry(RIM_R * 0.98, 14).rotateX(-Math.PI / 2), position: [0, HEIGHT * 0.75, 0], color: SOIL },
    // The lid, off and lying on the ground at the tin's left.
    { geometry: new THREE.CylinderGeometry(RIM_R * 1.04, RIM_R * 1.04, 0.01, 14), position: [RIM_R * 2.2, 0.005, 0.04], color: RIM },
  ]);
}

/** One worm, from the soil up over the rim at the origin and hanging down the tin's side along +x. */
function wormShape() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.05, -0.03, 0.01),
    new THREE.Vector3(-0.022, 0.003, -0.004),
    new THREE.Vector3(0, 0.013, 0),
    new THREE.Vector3(0.017, 0.003, 0.006),
    new THREE.Vector3(0.024, -0.022, -0.005),
    new THREE.Vector3(0.03, -0.05, 0.01),
  ]);
  return new THREE.TubeGeometry(curve, 14, 0.008, 5);
}

const turn = new THREE.Quaternion();
const lift = new THREE.Quaternion();
const at = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const matrix = new THREE.Matrix4();

/** The worm tin at the angler's feet while they stand still, a worm curling over its rim for each in it, empty when none are left (bucketSpot.ts). */
export function WormPot({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const worms = useRef<THREE.InstancedMesh>(null);
  const still = useReducedMotion();
  const shape = useMemo(tinShape, []);
  const worm = useMemo(wormShape, []);
  // Both sides, so the open tin's inner wall shows above the soil.
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  const pink = useMemo(() => new THREE.MeshToonMaterial({ color: WORM, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shape, worm, material, pink].forEach((item) => item.dispose());
    },
    [shape, worm, material, pink],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    const mesh = worms.current;
    if (!g || !mesh) return;
    const spot = !anglerPose.moving && !aboard() ? tinSpot(anglerPose.x, anglerPose.z, anglerPose.yaw) : null;
    g.visible = spot !== null;
    if (!spot) return;
    g.position.set(spot.x, spot.y, spot.z);
    g.rotation.y = anglerPose.yaw;
    const time = still ? STILL_TIME : clock.elapsedTime;
    mesh.count = Math.min(Math.max(count, 0), TIN_WORMS_SHOWN);
    for (let i = 0; i < mesh.count; i += 1) {
      const { angle, tilt } = tinWorm(i, time);
      turn.setFromAxisAngle(Y, angle).multiply(lift.setFromAxisAngle(Z, tilt));
      at.set(Math.cos(angle) * RIM_R, HEIGHT, -Math.sin(angle) * RIM_R);
      mesh.setMatrixAt(i, matrix.compose(at, turn, one));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={group} name="worm-tin" visible={false}>
      <mesh geometry={shape} material={material} castShadow />
      <instancedMesh ref={worms} args={[worm, pink, TIN_WORMS_SHOWN]} frustumCulled={false} />
    </group>
  );
}
