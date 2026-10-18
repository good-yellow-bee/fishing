import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BoatWake } from "./BoatWake";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { bladeUp, oarSweep, scullAt, slideAt } from "./scullRow";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const HULL = "#f2efe6";
const DECK = "#c8433a";
const RIGGER = "#5f6870";
const SHAFT = "#e8e4da";
const BLADE = "#2f6fb0";
const KIT = "#2b3a55";
const TOP = "#e7c34a";
const SKIN = "#e2b48c";
/** The shell's length and the riggers' reach out to the oarlocks, either side. */
const SHELL = 5.6;
const SPAN = 0.8;
/** The oars: the handle inboard of the oarlock, the shaft outboard of it to the blade's tip, and the oarlock's height above the water. */
const INBOARD = 0.85;
const OUTBOARD = 2;
const LOCK_Y = 0.3;
/** The oarlocks sit toward the stern of the seat, where the rower's feet are. */
const LOCK_Z = -0.6;
/** How far the seat slides and the rower leans, catch to finish. */
const SLIDE = 0.45;
const LEAN = 0.85;

/** The shell: long and needle-thin, pointed at both ends, with a red deck fore and aft and the riggers out to the oarlocks. */
export function shellShape() {
  const body = SHELL - 1.6;
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.17, 0.17, body, 10), position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.45], color: HULL },
    { geometry: new THREE.ConeGeometry(0.17, 0.8, 10), position: [0, 0, body / 2 + 0.4], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.45], color: HULL },
    { geometry: new THREE.ConeGeometry(0.17, 0.8, 10), position: [0, 0, -body / 2 - 0.4], rotation: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.45], color: HULL },
    { geometry: new THREE.BoxGeometry(0.16, 0.02, 1.3), position: [0, 0.075, 1.6], color: DECK },
    { geometry: new THREE.BoxGeometry(0.16, 0.02, 1.1), position: [0, 0.075, -1.7], color: DECK },
    { geometry: new THREE.BoxGeometry(SPAN * 2, 0.03, 0.04), position: [0, LOCK_Y, LOCK_Z], color: RIGGER },
    { geometry: new THREE.BoxGeometry(0.03, LOCK_Y - 0.05, 0.03), position: [SPAN, (LOCK_Y + 0.05) / 2, LOCK_Z], color: RIGGER },
    { geometry: new THREE.BoxGeometry(0.03, LOCK_Y - 0.05, 0.03), position: [-SPAN, (LOCK_Y + 0.05) / 2, LOCK_Z], color: RIGGER },
  ]);
}

/** The rower above the seat, facing the stern (-z) with the arms reaching for the handles, which sit a hand's width apart. */
export function rowerShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.26, 0.12, 0.42), position: [0, 0.06, -0.2], color: KIT },
    { geometry: new THREE.CylinderGeometry(0.13, 0.15, 0.5, 8), position: [0, 0.32, 0], color: TOP },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.66, -0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.105, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.69, 0.01], color: KIT },
    { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.48, 6), position: [0.12, 0.38, -0.22], rotation: [-1.25, 0, 0.15], color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.48, 6), position: [-0.12, 0.38, -0.22], rotation: [-1.25, 0, -0.15], color: SKIN },
  ]);
}

/** One oar along +x from its oarlock: the handle inboard, the shaft out to a broad blade. */
export function oarShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.018, 0.018, INBOARD + OUTBOARD, 5), position: [(OUTBOARD - INBOARD) / 2, 0, 0], rotation: [0, 0, Math.PI / 2], color: SHAFT },
    { geometry: new THREE.BoxGeometry(0.45, 0.2, 0.02), position: [OUTBOARD - 0.2, 0, 0], color: BLADE },
  ]);
}

/** A sculler out on the calm water at dawn, rowing a racing shell up and down the far half of the lake. */
export function Sculler() {
  const still = useReducedMotion();
  const shell = useRef<THREE.Group>(null);
  const rower = useRef<THREE.Group>(null);
  const oars = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shapes = useMemo(() => ({ shell: shellShape(), rower: rowerShape(), oar: oarShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material].forEach((item) => item.dispose());
    },
    [shapes, material],
  );
  const course = useCallback((time: number) => scullAt(time), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const pose = scullAt(time, still);
    if (shell.current) {
      shell.current.position.set(pose.x, waterHeight(pose.x, pose.z, still ? 0 : time) + 0.06, pose.z);
      shell.current.rotation.y = pose.yaw;
    }
    // Spinning round, the strokes are short: half the sweep.
    const reach = pose.going ? 1 : 0.5;
    const slide = slideAt(pose.stroke) * reach;
    if (rower.current) {
      // Coiled up toward the stern and leaning in at the catch, legs flat and leaning back at the finish.
      rower.current.position.z = 0.2 - SLIDE * slide;
      rower.current.rotation.x = -LEAN * (slide - 0.35);
    }
    const sweep = oarSweep(pose.stroke) * reach;
    const up = bladeUp(pose.stroke);
    oars.forEach((oar, i) => {
      const group = oar.current;
      if (!group) return;
      const side = i === 0 ? 1 : -1;
      // Spinning, one oar backs while the other pulls.
      const way = pose.going ? 1 : side;
      group.rotation.set(0, -side * sweep * way, 0);
      // Dipped so the blade is just under the water, or lifted clear of it.
      const drop = Math.asin((LOCK_Y + 0.02 - 0.22 * up) / OUTBOARD);
      (group.children[0] as THREE.Object3D).rotation.z = -side * drop;
    });
  });
  return (
    <group name="sculler">
      <group ref={shell}>
        <mesh geometry={shapes.shell} material={material} />
        <group ref={rower} position={[0, 0.08, 0.2]}>
          <mesh geometry={shapes.rower} material={material} />
        </group>
        {[1, -1].map((side, i) => (
          <group key={side} ref={oars[i]} position={[side * SPAN, LOCK_Y, LOCK_Z]}>
            <group>
              <mesh geometry={shapes.oar} material={material} rotation={[0, side > 0 ? 0 : Math.PI, 0]} />
            </group>
          </group>
        ))}
      </group>
      <BoatWake at={course} stern={SHELL / 2} still={still} size={0.8} />
    </group>
  );
}
