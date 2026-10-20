import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { anglerAshore } from "./bankAngler";
import { BANK_MOUSE_AWAY, bankMouseAt, bankMouseStart, bankMouseStep, nextTracks, tracksShow, type BankMouseState, type MouseTracks } from "./bankMouse";
import { mouseAt, type MousePose } from "./mouseScurry";
import { anglerPose } from "./pose";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { toonRamp } from "./toon";

const FUR = "#86776a";
const BELLY = "#cdbfae";
const EAR = "#c99c94";
const PINK = "#e0a8a0";
const EYE = "#141210";
/** Drawn larger than life, so it reads from where the camera stands. */
const MOUSE_SCALE = 2.2;

/** The body and belly, hung forward of the haunches so it can sit up about them, facing +z. */
export function mouseBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.018, 0.035], scale: [0.032, 0.028, 0.055], color: FUR },
    { geometry: new THREE.SphereGeometry(1, 10, 7), position: [0, 0.01, 0.04], scale: [0.026, 0.02, 0.045], color: BELLY },
  ]);
}

/** The head, snout, nose, eyes and round ears, from the neck forward. */
export function mouseHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0, 0.012], scale: [0.022, 0.02, 0.028], color: FUR },
    { geometry: new THREE.ConeGeometry(0.014, 0.03, 8), position: [0, -0.003, 0.045], rotation: [Math.PI / 2, 0, 0], color: FUR },
    { geometry: new THREE.SphereGeometry(0.005, 6, 4), position: [0, -0.003, 0.06], color: PINK },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(0.0045, 6, 4), position: [side * 0.013, 0.007, 0.03] as const, color: EYE },
      { geometry: new THREE.CylinderGeometry(0.012, 0.012, 0.003, 10), position: [side * 0.015, 0.02, 0.004] as const, rotation: [Math.PI / 2 - 0.3, 0, side * 0.4] as const, color: EAR },
    ]),
  ]);
}

/** The long thin tail, from its root back along -z. */
export function mouseTailShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.002, 0.004, 0.1, 5), position: [0, 0, -0.05], rotation: [Math.PI / 2 - 0.15, 0, 0], color: PINK }]);
}

/** A mouse, posed each frame by `poseAt(time, still)`; `name` labels it in the scene. */
function Mouse({ name, poseAt }: { name: string; poseAt: (time: number, still: boolean) => MousePose }) {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const scaled = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ body: mouseBodyShape(), head: mouseHeadShape(), tail: mouseTailShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [shapes.body, shapes.head, shapes.tail, material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = poseAt(time, still);
    const mouse = root.current;
    if (!mouse) return;
    mouse.visible = pose.here;
    if (!pose.here) return;
    // The quick patter of its feet bounces it as it runs.
    mouse.position.set(pose.x, pose.y + pose.running * 0.004 * Math.abs(Math.sin(time * 38)), pose.z);
    mouse.rotation.y = pose.yaw;
    scaled.current?.scale.setScalar(MOUSE_SCALE * pose.show);
    // Up on its haunches, the head tipped back down to the crumb in its paws.
    if (body.current) body.current.rotation.x = -pose.sitting * 1.05;
    if (head.current) head.current.rotation.x = pose.sitting * 0.75 + pose.nibble * 0.12;
    if (tail.current) tail.current.rotation.y = pose.running * Math.sin(time * 17) * 0.35 + 0.15;
  });
  useSkinnedFigure(root, material);

  return (
    <group ref={root} name={name} visible={false}>
      <group ref={scaled} scale={MOUSE_SCALE}>
        <group ref={body} position={[0, 0.006, -0.02]}>
          <mesh geometry={shapes.body} material={material} castShadow />
          <group ref={head} position={[0, 0.03, 0.085]}>
            <mesh geometry={shapes.head} material={material} />
          </group>
        </group>
        <group ref={tail} position={[0, 0.012, -0.03]}>
          <mesh geometry={shapes.tail} material={material} />
        </group>
      </group>
    </group>
  );
}

/** A field mouse that now and then scurries across the dock behind the angler on evenings and nights (mouseScurry.ts). */
export function DockMouse() {
  return <Mouse name="dock-mouse" poseAt={(time, still) => mouseAt(time, still)} />;
}

/** Footprints this far apart along its way, and this far to each side of it. */
const TRACK_STEP = 0.045;
const TRACK_SIDE = 0.016;
const TRACKS = 80;
const TRACK_TINT = "#8794a8";

/** A wood mouse popping out of the snow behind the angler on a winter bank, and its line of tracks (bankMouse.ts). */
export function BankMouse() {
  const state = useRef<BankMouseState | null>(null);
  const tracks = useRef<MouseTracks | null>(null);
  const prints = useRef<THREE.InstancedMesh>(null);
  const print = useMemo(() => new THREE.CircleGeometry(0.009, 6).rotateX(-Math.PI / 2), []);
  const printMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: TRACK_TINT, transparent: true, opacity: 0.7, depthWrite: false }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      print.dispose();
      printMaterial.dispose();
    },
    [print, printMaterial],
  );
  useFrame(({ clock }) => {
    const mesh = prints.current;
    const shown = tracks.current;
    if (!mesh) return;
    mesh.visible = shown !== null;
    if (!shown) return;
    printMaterial.opacity = 0.7 * tracksShow(shown, clock.elapsedTime);
    const { from, crumb, to } = shown.way;
    const first = Math.hypot(crumb.x - from.x, crumb.z - from.z);
    let count = 0;
    for (let d = TRACK_STEP / 2; d < shown.reach && count < TRACKS; d += TRACK_STEP) {
      const [a, b, k] = d < first ? [from, crumb, d / first] : [crumb, to, (d - first) / Math.max(1e-6, Math.hypot(to.x - crumb.x, to.z - crumb.z))];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const side = (count % 2 ? 1 : -1) * TRACK_SIDE;
      const x = a.x + dx * k - (dz / len) * side;
      const z = a.z + dz * k + (dx / len) * side;
      scratch.position.set(x, shown.way.y(x, z) + 0.004, z);
      scratch.updateMatrix();
      mesh.setMatrixAt(count, scratch.matrix);
      count += 1;
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <Mouse
        name="bank-mouse"
        poseAt={(time, still) => {
          // With reduced motion it never comes, rather than popping up behind the angler every minute.
          if (still) return BANK_MOUSE_AWAY;
          state.current = bankMouseStep(state.current ?? bankMouseStart(time), time, anglerPose, anglerAshore());
          tracks.current = nextTracks(state.current, tracks.current, time);
          return bankMouseAt(state.current, time);
        }}
      />
      <instancedMesh ref={prints} args={[print, printMaterial, TRACKS]} frustumCulled={false} visible={false} />
    </>
  );
}
