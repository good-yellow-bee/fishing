import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOG_COCK, DOG_SPOT, DOG_YAW, dogGlance, dogMood, easeMood, dogAttention, tailSwing, type DogMood } from "./dogMood";
import { BreathPuffs, type Mouth } from "./Breath";
import { dogPuffAge } from "./breathPuff";
import { DOG_SNOW_START, dogShake, dogSnowStep, shakeFlake, type DogSnow } from "./dogSnow";
import { paperBoatAt } from "./paperDrift";
import { robinAt } from "./robinVisit";
import { mergePainted, type PaintedPart } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { useSkinnedFigure } from "./skinFigure";
import { toonRamp } from "./toon";
import type { ScenePhase } from "./types";

const COAT = "#c8954f";
const PALE = "#e2bf86";
const EAR = "#a5713a";
const NOSE = "#2a1e18";
const COLLAR = "#b8352c";
const JUMPER = "#b8322c";
const STRIPE = "#efe9df";
/** The snow on its back and the flakes it shakes off. */
const SNOW_COLOR = "#eef3f6";
const FLAKES = 9;
/** The tip of its nose, ahead along the head's +z, where its breath comes from; and its puffs against the angler's. */
const NOSE_Z = 0.22;
const PUFF_SIZE = 0.6;
/** A shade larger than life, to stand beside the chunky angler. */
const DOG_SCALE = 1.2;
/** How far its chest rises about the hips when it sits up. */
const SIT_TILT = 0.75;

/** Its winter jumper's back, a knitted red tube round the middle of the body with two cream stripes. */
function jumperBack(): PaintedPart[] {
  return [
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.135, 0.04], scale: [0.137, 0.118, 0.19], color: JUMPER },
    ...[0.12, -0.04].map((z) => ({
      geometry: new THREE.TorusGeometry(1, 0.08, 6, 18),
      position: [0, 0.135, z] as const,
      scale: [0.127, 0.11, 0.15] as const,
      color: STRIPE,
    })),
  ];
}

/** The hindquarters lying on the boards: back, haunches and folded back paws, facing +z; in a red jumper in `winter`. */
export function dogRearShape(winter = false) {
  return mergePainted([
    ...(winter ? jumperBack() : []),
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.13, -0.02], scale: [0.13, 0.11, 0.26], color: COAT },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [side * 0.085, 0.11, -0.17] as const, scale: [0.07, 0.09, 0.11] as const, color: COAT },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.11, 0.03, -0.06] as const, scale: [0.035, 0.028, 0.08] as const, color: PALE },
    ]),
  ]);
}

/** The chest and collar, from the hips forward; the jumper's front over the shoulders in `winter`, leaving the pale bib showing. */
export function dogChestShape(winter = false) {
  return mergePainted([
    ...(winter ? [{ geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.025, 0.24] as const, scale: [0.127, 0.127, 0.12] as const, color: JUMPER }] : []),
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.02, 0.27], scale: [0.12, 0.12, 0.14], color: COAT },
    { geometry: new THREE.SphereGeometry(1, 10, 7), position: [0, -0.02, 0.33], scale: [0.08, 0.08, 0.08], color: PALE },
    { geometry: new THREE.TorusGeometry(0.075, 0.014, 6, 14), position: [0, 0.08, 0.36], rotation: [Math.PI / 2 - 0.5, 0, 0], color: COLLAR },
  ]);
}

/** A front leg, from the shoulder down along -y, with its paw. */
export function dogLegShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.03, 0.026, 0.2, 7), position: [0, -0.1, 0], color: COAT },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, -0.2, 0.02], scale: [0.034, 0.025, 0.05], color: PALE },
  ]);
}

/** The head from the neck: skull, muzzle, nose, eyes and floppy ears. */
export function dogHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.04, 0.04], scale: [0.085, 0.08, 0.095], color: COAT },
    { geometry: new THREE.SphereGeometry(1, 10, 7), position: [0, 0.0, 0.13], scale: [0.05, 0.045, 0.08], color: PALE },
    { geometry: new THREE.SphereGeometry(0.02, 8, 6), position: [0, 0.02, 0.205], color: NOSE },
    ...[-1, 1].flatMap((side) => [
      { geometry: new THREE.SphereGeometry(0.012, 6, 5), position: [side * 0.045, 0.07, 0.11] as const, color: NOSE },
      { geometry: new THREE.SphereGeometry(1, 8, 6), position: [side * 0.085, 0.0, 0.02] as const, rotation: [0, 0, side * 0.25] as const, scale: [0.02, 0.075, 0.05] as const, color: EAR },
    ]),
  ]);
}

/** The tail, from its root back along -z. */
export function dogTailShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.014, 0.03, 0.26, 7), position: [0, 0, -0.13], rotation: [Math.PI / 2, 0, 0], color: COAT }]);
}

type Props = {
  phase: ScenePhase;
  /** While the dock robin is about, the time a strike last startled it (useStrikeStartle); null when it is not. The dog watches it. */
  robin?: Readonly<{ current: number }> | null;
  /** The breeze the paper boat drifts on while one is out, null when not. The dog watches it go by. */
  paperWind?: number | null;
  /** Where the float is while a fish nibbles at it, else null: it wakes, cocks its head and watches the float. */
  nibble?: Readonly<{ x: number; z: number }> | null;
  /** Snow is falling: it settles on its back and it shakes it off now and then (dogSnow.ts). */
  snowfall?: boolean;
  /** In winter it wears a knitted jumper, and its breath shows (breathPuff.ts). Its shape is baked once, so give the dog a fresh key when this changes. */
  winter?: boolean;
};

/** The angler's dog lying on the dock by day: it watches the line, the robin and the paper boat, cocks its head at a nibble, dozes, and sits up wagging for a bite (dogMood.ts). */
export function DockDog({ phase, robin = null, paperWind = null, winter = false, nibble = null, snowfall = false }: Props) {
  const still = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const shapes = useMemo(() => ({ rear: dogRearShape(winter), chest: dogChestShape(winter), leg: dogLegShape(), head: dogHeadShape(), tail: dogTailShape() }), [winter]);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const snow = useRef<DogSnow>(DOG_SNOW_START);
  const snowLayer = useRef<THREE.Mesh>(null);
  const flakes = useRef<(THREE.Mesh | null)[]>([]);
  const snowMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: SNOW_COLOR, gradientMap: toonRamp() }), []);
  const snowGeometry = useMemo(() => new THREE.SphereGeometry(1, 10, 6), []);
  useEffect(
    () => () => {
      snowMaterial.dispose();
      snowGeometry.dispose();
    },
    [snowMaterial, snowGeometry],
  );
  const nose = useRef<THREE.Object3D>(null);
  const breathAt = useMemo(() => {
    const ahead = new THREE.Vector3();
    return (out: Mouth) => {
      if (!nose.current) return;
      nose.current.getWorldPosition(ahead);
      [out.x, out.y, out.z] = [ahead.x, ahead.y, ahead.z];
      nose.current.getWorldDirection(ahead);
      const flat = Math.hypot(ahead.x, ahead.z) || 1;
      out.fx = ahead.x / flat;
      out.fz = ahead.z / flat;
    };
  }, []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const state = useRef<{ phase: ScenePhase; since: number; mood: DogMood | null; look: number; cock: number }>({ phase, since: 0, mood: null, look: 0, cock: 0 });

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const track = state.current;
    const nibbling = nibble && phase === "waiting" ? nibble : null;
    // A change of phase restarts its doze; so does a nibble, which wakes it for a while.
    if (track.phase !== phase || nibbling) {
      track.phase = phase;
      track.since = time;
    }
    const bird = robin && !still ? robinAt(time, false, false, robin.current) : null;
    const boat = paperWind !== null && !still ? paperBoatAt(time, paperWind) : null;
    const { turn: seen, mood: target, cock } = dogAttention(dogMood(phase, time - track.since), nibbling, bird?.here ? bird : null, boat?.here ? boat : null);
    const mood = (track.mood = still || !track.mood ? target : easeMood(track.mood, target, Math.min(delta, 0.1)));
    // The chest rises about the hips as it sits up; the front legs swing from lying forward to straight down.
    if (front.current) front.current.rotation.x = -mood.sit * SIT_TILT;
    for (const leg of legs.current) if (leg) leg.rotation.x = (1 - mood.sit) * (Math.PI / 2) + mood.sit * SIT_TILT;
    if (head.current) {
      const awake = mood.headUp;
      // Asleep its chin drops onto its paws; awake it holds its head up level, glancing about now and then.
      head.current.position.y = 0.12 - (1 - awake) * 0.1;
      head.current.rotation.x = (1 - awake) * 0.45 + mood.sit * SIT_TILT * 0.8;
      const turn = seen ?? dogGlance(time);
      track.look += (turn - track.look) * (1 - Math.exp(-4 * Math.min(delta, 0.1)));
      head.current.rotation.y = still ? 0 : awake * (1 - mood.sit) * track.look;
      track.cock += ((cock ? 1 : 0) - track.cock) * (1 - Math.exp(-5 * Math.min(delta, 0.1)));
      head.current.rotation.z = still ? 0 : awake * (1 - mood.sit) * track.cock * DOG_COCK;
    }
    if (tail.current) tail.current.rotation.y = still ? 0 : tailSwing(time, mood.wag);
    snow.current = dogSnowStep(snow.current, time, Math.min(delta, 0.1), snowfall, still);
    const layer = snow.current.snow;
    if (snowLayer.current) {
      snowLayer.current.visible = layer > 0.02;
      snowLayer.current.scale.set(0.11 * Math.min(1, layer * 2.5), 0.03 * layer, 0.2 * Math.min(1, layer * 2.5));
    }
    // A shake rolls it about its spine, throwing its snow off in a burst of flakes.
    if (root.current) root.current.rotation.z = still ? 0 : dogShake(snow.current, time) * 0.3;
    flakes.current.forEach((flake, i) => {
      if (!flake) return;
      const at = still ? null : shakeFlake(snow.current, i, time);
      flake.visible = at !== null;
      if (!at) return;
      flake.position.set(at.x, at.y, at.z);
      flake.scale.setScalar(at.size);
    });
  });
  useSkinnedFigure(root, material);

  return (
    <>
      <group ref={root} name="dock-dog" position={[DOG_SPOT.x, DOG_SPOT.y, DOG_SPOT.z]} rotation={[0, DOG_YAW, 0]} scale={DOG_SCALE}>
      <mesh geometry={shapes.rear} material={material} castShadow />
      {snowfall && <mesh ref={snowLayer} geometry={snowGeometry} material={snowMaterial} position={[0, 0.235, -0.02]} visible={false} />}
      {snowfall &&
        Array.from({ length: FLAKES }, (_, i) => (
          <mesh
            key={i}
            geometry={snowGeometry}
            material={snowMaterial}
            visible={false}
            ref={(flake) => {
              flakes.current[i] = flake;
            }}
          />
        ))}
      <group ref={tail} position={[0, 0.15, -0.27]} rotation={[0.25, 0, 0]}>
        <mesh geometry={shapes.tail} material={material} />
      </group>
      {/* Hinged at the hips, so the chest, legs and head rise together when it sits. */}
      <group ref={front} position={[0, 0.12, 0]}>
        <mesh geometry={shapes.chest} material={material} castShadow />
        {[-1, 1].map((side, i) => (
          <group
            key={side}
            ref={(leg) => {
              legs.current[i] = leg;
            }}
            position={[side * 0.07, -0.02, 0.32]}
          >
            <mesh geometry={shapes.leg} material={material} />
          </group>
        ))}
        {/* Turned, then nodded, then cocked about its own muzzle, so the cock stays a clean tilt. */}
        <group ref={head} position={[0, 0.12, 0.4]} rotation={[0, 0, 0, "YXZ"]}>
          <mesh geometry={shapes.head} material={material} castShadow />
          <object3D ref={nose} position={[0, 0, NOSE_Z]} />
        </group>
      </group>
    </group>
      {winter && <BreathPuffs light={1} age={dogPuffAge} mouth={breathAt} size={PUFF_SIZE} />}
    </>
  );
}
