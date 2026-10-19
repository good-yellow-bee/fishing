import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { lastSplash } from "./duckFlush";
import { mergePainted } from "./mergeParts";
import { grebePose, grebesScared, grebeUnder } from "./grebeRush";
import { STILL_TIME, useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const BACK = "#5d5246";
const WHITE = "#efeae0";
const CREST = "#1f1b18";
const RUFF = "#a8542a";
const SPRAY = "#eef6f6";
/** A touch larger than life, so the pair reads from the dock. */
const SCALE = 1.9;
const DROPS = [
  [0.08, -0.22],
  [-0.1, -0.3],
  [0.02, -0.4],
  [-0.05, -0.18],
] as const;

const BILL = "#6d4b3b";

/** The neck, head, ruff, crest and bill bake into one shape that shakes as one. */
export function grebeShapes() {
  return {
    body: new THREE.SphereGeometry(1, 12, 8),
    head: mergePainted([
      { geometry: new THREE.CylinderGeometry(0.028, 0.04, 0.18, 8), position: [0, 0.08, 0.01], rotation: [0.2, 0, 0], color: WHITE },
      { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.18, 0.03], scale: [0.045, 0.04, 0.055], color: WHITE },
      // The chestnut ruff and black crest of a bird in breeding plumage.
      { geometry: new THREE.SphereGeometry(1, 10, 6), position: [0, 0.165, 0.01], scale: [0.065, 0.035, 0.04], color: RUFF },
      ...[-1, 1].map((side) => ({
        geometry: new THREE.ConeGeometry(0.014, 0.06, 5),
        position: [side * 0.018, 0.225, 0.0] as const,
        rotation: [-0.5, 0, side * 0.3] as const,
        color: CREST,
      })),
      { geometry: new THREE.ConeGeometry(0.012, 0.07, 5), position: [0, 0.18, 0.1], rotation: [Math.PI / 2, 0, 0], color: BILL },
    ]),
    // Each drop hops on its own, so they stay apart and share this.
    drop: new THREE.SphereGeometry(1, 6, 4),
  };
}

/** A pair of grebes courting in spring: head shakes as they float, and now and then a rush across the water side by side; motion lives in grebeRush.ts. */
export function Grebes() {
  const birds = useRef<(THREE.Group | null)[]>([]);
  const bodies = useRef<(THREE.Group | null)[]>([]);
  const heads = useRef<(THREE.Group | null)[]>([]);
  const sprays = useRef<(THREE.Group | null)[]>([]);
  const yaws = useRef<(number | null)[]>([null, null]);
  const shapes = useMemo(grebeShapes, []);
  const looks = useMemo(
    () => ({
      back: new THREE.MeshToonMaterial({ color: BACK, gradientMap: toonRamp() }),
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      spray: new THREE.MeshBasicMaterial({ color: SPRAY, transparent: true, opacity: 0.8, depthWrite: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(looks)].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );
  const dove = useRef({ at: Number.NEGATIVE_INFINITY, heard: Number.NEGATIVE_INFINITY });
  const rushing = useRef(false);
  // Reduced motion keeps the pair floating at one moment: no head shaking and no rush across the water. A close cast still sends them under.
  const still = useReducedMotion();
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    // Each splash is looked at once; a close one sends the pair under together.
    const d = dove.current;
    if (lastSplash.at !== d.heard && time - lastSplash.at >= 0) {
      if (grebesScared(lastSplash, time)) {
        d.heard = lastSplash.at;
        d.at = time;
      } else if (time - lastSplash.at >= 0.6) {
        d.heard = lastSplash.at;
      }
    }
    const under = grebeUnder(time - d.at);
    const at = still ? STILL_TIME : time;
    // The pattering and calls start with each rush.
    const rush = grebePose(0, at).rushing && under === 0;
    if (rush && !rushing.current) fx.grebeRush();
    rushing.current = rush;
    for (const k of [0, 1] as const) {
      const bird = birds.current[k];
      if (!bird) continue;
      const pose = grebePose(k, at);
      // Turn smoothly toward the pose's heading rather than snapping round.
      const last = yaws.current[k] ?? pose.yaw;
      const turn = Math.atan2(Math.sin(pose.yaw - last), Math.cos(pose.yaw - last));
      const yaw = last + turn * Math.min(1, delta * (pose.rushing ? 12 : 2.5));
      yaws.current[k] = yaw;
      const surface = waterHeight(pose.x, pose.z, at);
      bird.visible = under < 1;
      bird.position.set(pose.x, surface - 0.05 + pose.upright * 0.12 - under * 0.3, pose.z);
      bird.rotation.set(under * 0.8, yaw, 0, "YXZ");
      const body = bodies.current[k];
      // Reared up, breast high, running on its feet.
      if (body) body.rotation.x = -pose.upright * 0.9;
      const head = heads.current[k];
      if (head) {
        head.rotation.y = pose.shake;
        // The neck curves forward as they run.
        head.rotation.x = pose.upright * 0.7;
      }
      const spray = sprays.current[k];
      if (spray) {
        spray.visible = pose.rushing && under === 0;
        spray.children.forEach((drop, i) => {
          const hop = (at * 6 + i * 0.27) % 1;
          drop.position.y = 0.03 + Math.sin(hop * Math.PI) * 0.12;
        });
      }
    }
  });
  return (
    <>
      {[0, 1].map((k) => (
        <group key={k} ref={(g) => void (birds.current[k] = g)} name="grebe" scale={SCALE}>
          <group ref={(g) => void (bodies.current[k] = g)}>
            <mesh geometry={shapes.body} material={looks.back} position={[0, 0.06, 0]} scale={[0.1, 0.07, 0.19]} />
            <group ref={(g) => void (heads.current[k] = g)} position={[0, 0.1, 0.13]}>
              <mesh geometry={shapes.head} material={looks.painted} />
            </group>
          </group>
          <group ref={(g) => void (sprays.current[k] = g)} visible={false}>
            {DROPS.map(([x, z], i) => (
              <mesh key={i} geometry={shapes.drop} material={looks.spray} position={[x, 0.03, z]} scale={0.022} />
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
