import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour } from "@stillwater/shared";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp, useInstancedTwin } from "./toon";
import { CARS, CAR_LENGTH, PORTAL_EAST, PORTAL_OUT, PORTAL_WEST, PUFFS, TRACK_Y, carAt, hillFaceAt, puffAt, trackZ, windowsLit } from "./trainLine";

const ENGINE = "#2f6b45";
const CARRIAGE = "#8c2f2a";
const ROOF = "#d9d3c6";
const IRON = "#2a2624";
const BRASS = "#d7b34a";
const STONE = "#9a8f80";
const MOUTH = "#141210";
const BALLAST = "#6d5f50";
/** Window glass by day, and the lamps behind it after dark. */
const GLASS = "#3d4a52";
const LAMPLIT = "#ffd27a";
/** The steam, white by day and greying with the light. */
const STEAM: Record<LakeHour, string> = { dawn: "#c9c6c0", day: "#f2f2ee", dusk: "#b9b3ab", night: "#5d6168" };

const wheels = (count: number, half: number) =>
  [-1, 1].flatMap((side) =>
    Array.from({ length: count }, (_, k) => ({
      geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.03, 8),
      position: [side * 0.11, 0.055, -half + ((k + 0.5) / count) * half * 2] as const,
      rotation: [0, 0, Math.PI / 2] as const,
      color: IRON,
    })),
  );

/** A little steam engine, nose to +z: a green boiler with its chimney and dome, the cab behind, on six wheels. */
export function engineShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.24, 0.05, CAR_LENGTH), position: [0, 0.1, 0], color: IRON },
    { geometry: new THREE.CylinderGeometry(0.1, 0.1, 0.46, 10), position: [0, 0.22, 0.1], rotation: [Math.PI / 2, 0, 0], color: ENGINE },
    { geometry: new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8), position: [0, 0.36, 0.24], color: IRON },
    { geometry: new THREE.SphereGeometry(0.045, 8, 5), position: [0, 0.32, 0.05], color: BRASS },
    { geometry: new THREE.BoxGeometry(0.26, 0.26, 0.24), position: [0, 0.25, -0.24], color: ENGINE },
    { geometry: new THREE.BoxGeometry(0.29, 0.03, 0.28), position: [0, 0.395, -0.24], color: IRON },
    { geometry: new THREE.BoxGeometry(0.26, 0.05, 0.03), position: [0, 0.12, CAR_LENGTH / 2], color: "#b8322a" },
    ...wheels(3, 0.26),
  ]);
}

/** A carriage, along z: a maroon body under a pale roof, on four wheels. Its windows are drawn apart, to light up at night. */
export function carriageShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.24, 0.05, CAR_LENGTH), position: [0, 0.1, 0], color: IRON },
    { geometry: new THREE.BoxGeometry(0.24, 0.2, CAR_LENGTH - 0.04), position: [0, 0.23, 0], color: CARRIAGE },
    { geometry: new THREE.BoxGeometry(0.27, 0.03, CAR_LENGTH), position: [0, 0.345, 0], color: ROOF },
    ...wheels(2, 0.26),
  ]);
}

/** A carriage's row of windows down each side. */
function windowsShape() {
  const panes = [-1, 1].flatMap((side) =>
    [-0.24, -0.08, 0.08, 0.24].map((z) => ({ geometry: new THREE.BoxGeometry(0.01, 0.07, 0.1), position: [side * 0.122, 0.26, z] as const, color: "#ffffff" })),
  );
  return mergePainted(panes);
}

/** The track's ballast, a strip on the hills' face from tunnel to tunnel, and a stone tunnel mouth at each end. */
export function lineShape() {
  const positions: number[] = [];
  const step = 0.25;
  for (let x = PORTAL_WEST; x < PORTAL_EAST; x += step) {
    const a = { x, z: trackZ(x) - 0.04 };
    const b = { x: Math.min(PORTAL_EAST, x + step), z: trackZ(Math.min(PORTAL_EAST, x + step)) - 0.04 };
    const low = TRACK_Y - 0.05;
    const high = TRACK_Y + 0.04;
    positions.push(a.x, low, a.z, b.x, low, b.z, b.x, high, b.z, a.x, low, a.z, b.x, high, b.z, a.x, high, a.z);
  }
  const strip = new THREE.BufferGeometry();
  strip.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  strip.computeVertexNormals();
  // The box and cylinder parts carry texture coordinates, so the strip needs some to bake with them.
  strip.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
  const mouth = (x: number) => {
    const z = hillFaceAt(x) + PORTAL_OUT;
    return [
      { geometry: new THREE.BoxGeometry(0.84, 0.66, 0.06), position: [x, TRACK_Y + 0.28, z - 0.02] as const, color: STONE },
      { geometry: new THREE.CylinderGeometry(0.21, 0.21, 0.02, 12, 1, false, -Math.PI / 2, Math.PI), position: [x, TRACK_Y + 0.33, z + 0.02] as const, rotation: [-Math.PI / 2, 0, 0] as const, color: MOUTH },
      { geometry: new THREE.BoxGeometry(0.42, 0.34, 0.02), position: [x, TRACK_Y + 0.16, z + 0.02] as const, color: MOUTH },
    ];
  };
  return mergePainted([{ geometry: strip, color: BALLAST }, ...mouth(PORTAL_WEST), ...mouth(PORTAL_EAST)]);
}

/** The railway along the foot of the far hills, and its steam train (trainLine.ts): five draws. */
export function Railway({ hour, wind }: { hour: LakeHour; wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const engine = useRef<THREE.Mesh>(null);
  const carriages = useRef<THREE.InstancedMesh>(null);
  const panes = useRef<THREE.InstancedMesh>(null);
  const puffs = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(() => ({ engine: engineShape(), carriage: carriageShape(), windows: windowsShape(), line: lineShape(), puff: new THREE.IcosahedronGeometry(0.1, 0) }), []);
  const looks = useMemo(
    () => ({
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      glass: new THREE.MeshBasicMaterial({ color: GLASS }),
      steam: new THREE.MeshBasicMaterial({ color: STEAM.day, transparent: true, opacity: 0.75, depthWrite: false }),
    }),
    [],
  );
  const paintedTwin = useInstancedTwin(looks.painted);
  useEffect(() => {
    looks.glass.color.set(windowsLit(hour) ? LAMPLIT : GLASS);
    looks.steam.color.set(STEAM[hour]);
  }, [hour, looks]);
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(looks)].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );
  const scratch = useMemo(() => ({ place: new THREE.Object3D(), hidden: new THREE.Matrix4().makeScale(0, 0, 0) }), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const { place, hidden } = scratch;
    const front = carAt(0, time, still);
    if (engine.current) {
      engine.current.visible = front !== null;
      if (front) {
        engine.current.position.set(front.x, front.y, front.z);
        engine.current.rotation.y = front.yaw;
      }
    }
    const cars = carriages.current;
    const windows = panes.current;
    if (cars && windows) {
      for (let i = 1; i < CARS; i += 1) {
        const pose = carAt(i, time, still);
        if (pose) {
          place.position.set(pose.x, pose.y, pose.z);
          place.rotation.set(0, pose.yaw, 0);
          place.updateMatrix();
        }
        cars.setMatrixAt(i - 1, pose ? place.matrix : hidden);
        windows.setMatrixAt(i - 1, pose ? place.matrix : hidden);
      }
      cars.instanceMatrix.needsUpdate = true;
      windows.instanceMatrix.needsUpdate = true;
    }
    const steam = puffs.current;
    if (steam) {
      for (let j = 0; j < PUFFS; j += 1) {
        const puff = puffAt(j, time, wind, still);
        if (puff) {
          place.position.set(puff.x, puff.y, puff.z);
          place.rotation.set(0, 0, 0);
          place.scale.setScalar(0.6 + puff.age * 1.6 * (1 - puff.age * 0.5));
          place.updateMatrix();
          place.scale.setScalar(1);
        }
        steam.setMatrixAt(j, puff && puff.age < 0.95 ? place.matrix : hidden);
      }
      steam.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group name="railway">
      <mesh geometry={shapes.line} material={looks.painted} />
      <mesh ref={engine} geometry={shapes.engine} material={looks.painted} visible={false} />
      {/* The cars and steam move along the line, so they are never culled by a stale bound. */}
      <instancedMesh ref={carriages} args={[shapes.carriage, paintedTwin, CARS - 1]} frustumCulled={false} />
      <instancedMesh ref={panes} args={[shapes.windows, looks.glass, CARS - 1]} frustumCulled={false} />
      <instancedMesh ref={puffs} args={[shapes.puff, looks.steam, PUFFS]} frustumCulled={false} />
    </group>
  );
}
