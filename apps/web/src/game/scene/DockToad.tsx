import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { anglerAshore } from "./bankAngler";
import { BANK_TOAD_AWAY, bankToadAt, bankToadStart, bankToadStep, type BankToadState } from "./bankToad";
import { anglerPose } from "./pose";
import { toadAt, toadVisitIndex, type ToadPose } from "./toadHop";
import { toonRamp } from "./toon";

const SKIN = "#7a6a44";
const WART = "#5b4d30";
const BELLY = "#c9b88e";
const THROAT = "#e2d3a8";
const IRIS = "#d79a2a";
const DARK = "#17140f";
/** Drawn larger than life, so it reads from where the camera stands. */
const TOAD_SCALE = 2.4;

/** The squat warty body with its folded front legs, facing +z. */
export function toadBodyShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.022, 0], scale: [0.04, 0.025, 0.048], color: SKIN },
    { geometry: new THREE.SphereGeometry(1, 10, 7), position: [0, 0.013, 0.004], scale: [0.034, 0.016, 0.042], color: BELLY },
    ...[
      [-0.02, 0.012],
      [0.018, -0.01],
      [-0.008, -0.025],
      [0.024, 0.016],
      [0, 0.004],
    ].map(([x, z]) => ({ geometry: new THREE.SphereGeometry(0.0055, 5, 4), position: [x, 0.044, z] as const, color: WART })),
    ...[-1, 1].map((side) => ({ geometry: new THREE.CapsuleGeometry(0.006, 0.022, 2, 5), position: [side * 0.03, 0.01, 0.034] as const, rotation: [0.6, 0, side * 0.3] as const, color: SKIN })),
  ]);
}

/** The broad flat head with its golden eyes up top, from the neck forward. */
export function toadHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.006, 0.014], scale: [0.032, 0.017, 0.026], color: SKIN },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(0.0085, 8, 6), position: [side * 0.017, 0.019, 0.016] as const, color: IRIS },
      { geometry: new THREE.SphereGeometry(0.0045, 6, 4), position: [side * 0.019, 0.021, 0.022] as const, color: DARK },
    ]),
  ]);
}

/** Its lids, drawn over the eyes while it blinks. */
export function toadLidsShape() {
  return mergePainted([-1, 1].map((side) => ({ geometry: new THREE.SphereGeometry(0.0095, 8, 6), position: [side * 0.017, 0.019, 0.016] as const, color: SKIN })));
}

/** One folded hind leg from the hip, back along -z; it kicks out straight as the toad hops. */
export function toadLegShape(side: number) {
  return mergePainted([
    { geometry: new THREE.CapsuleGeometry(0.008, 0.03, 2, 6), position: [0, 0, -0.018], rotation: [Math.PI / 2, 0, 0], color: SKIN },
    { geometry: new THREE.SphereGeometry(1, 6, 4), position: [side * 0.004, -0.004, -0.04], scale: [0.009, 0.003, 0.012], color: WART },
  ]);
}

/** A toad, posed each frame by `poseAt(time, still)`; `name` labels it in the scene. */
function Toad({ name, poseAt }: { name: string; poseAt: (time: number, still: boolean) => ToadPose }) {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const scaled = useRef<THREE.Group>(null);
  const throat = useRef<THREE.Mesh>(null);
  const lids = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const shapes = useMemo(() => ({ body: toadBodyShape(), head: toadHeadShape(), lids: toadLidsShape(), left: toadLegShape(-1), right: toadLegShape(1), throat: new THREE.SphereGeometry(1, 8, 6) }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const throatMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: THROAT, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, throatMaterial].forEach((item) => item.dispose());
    },
    [shapes, material, throatMaterial],
  );
  useFrame(({ clock }) => {
    const pose = poseAt(clock.elapsedTime, still);
    const toad = root.current;
    if (!toad) return;
    toad.visible = pose.here;
    if (!pose.here) return;
    toad.position.set(pose.x, pose.y, pose.z);
    // Tipped nose-up about its own sideways axis as it pushes off, level again as it lands.
    toad.rotation.set(-pose.kick * 0.35, pose.yaw, 0);
    scaled.current?.scale.setScalar(TOAD_SCALE * pose.show);
    for (const leg of legs.current) if (leg) leg.rotation.x = -pose.kick * 1.1;
    if (throat.current) throat.current.scale.set(0.012, 0.006 + pose.throat * 0.007, 0.012);
    if (lids.current) lids.current.visible = pose.blink > 0;
  });
  useSkinnedFigure(root, material);

  return (
    <group ref={root} name={name} visible={false} rotation={[0, 0, 0, "YXZ"]}>
      <group ref={scaled} scale={TOAD_SCALE}>
        <mesh geometry={shapes.body} material={material} castShadow />
        <group position={[0, 0.022, 0.044]}>
          <mesh geometry={shapes.head} material={material} />
          <group ref={lids} visible={false}>
            <mesh geometry={shapes.lids} material={material} />
          </group>
          <mesh ref={throat} geometry={shapes.throat} material={throatMaterial} position={[0, -0.008, 0.02]} scale={[0.012, 0.006, 0.012]} />
        </group>
        {[-1, 1].map((side, i) => (
          <group
            key={side}
            ref={(leg) => {
              legs.current[i] = leg;
            }}
            position={[side * 0.03, 0.012, -0.03]}
            rotation={[0, side * 0.5, 0, "YXZ"]}
          >
            <mesh geometry={side < 0 ? shapes.left : shapes.right} material={material} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** The toad crossing the dock's boards behind the angler on wet evenings (toadHop.ts). It sits out a crossing that comes while the angler is ashore, where the bank toad comes to them instead. */
export function DockToad() {
  const outAt = useRef<number | null>(null);
  const kept = useRef(new Map<number, boolean>());
  return (
    <Toad
      name="dock-toad"
      poseAt={(time, still) => {
        outAt.current ??= time;
        const since = time - outAt.current;
        const visit = toadVisitIndex(since);
        if (!kept.current.has(visit)) kept.current.set(visit, !anglerAshore());
        const pose = toadAt(since, still);
        return still || kept.current.get(visit) ? pose : { ...pose, here: false };
      }}
    />
  );
}

/** The toad hopping past behind the angler on a bank on wet evenings (bankToad.ts). */
export function BankToad() {
  const state = useRef<BankToadState | null>(null);
  return (
    <Toad
      name="bank-toad"
      poseAt={(time, still) => {
        // With reduced motion it never comes, rather than popping up behind the angler every minute.
        if (still) return BANK_TOAD_AWAY;
        state.current = bankToadStep(state.current ?? bankToadStart(time), time, anglerPose, anglerAshore());
        return bankToadAt(state.current, time);
      }}
    />
  );
}
