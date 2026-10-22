import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Groundbait } from "../logic";
import { CLOUD_RADIUS, DIMPLES, ROLL_SPAN, SCATTER_SEC, SCATTER_WAKES, THIEVES, WAKE_ARC, cloudCenter, cloudOpacity, dimpleAt, feedersShow, openWaterYaw, PIKE_REACH, prowlAt, rollAt, scatterWakeAt, thiefAt, thiefCount } from "./groundbaitCloud";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const CLOUD = "#7a5a32";
const CARP = "#6b5524";
const SHINER = "#c8d2d6";
const PIKE = "#4a6b48";
/** The roll turns the fish over a point this far under the water, so its head, back and then tail break the surface in turn. */
const ROLL_DEPTH = 0.45;
const ROLL_ARC = 1.4;
/** Sunk this much further at the roll's start and end, so the nose and tail come up out of the water and go back under it. */
const ROLL_SINK = 0.45;

/** A +z-facing carp's body, dorsal fin and tail in one mesh. */
function carpShape() {
  const body = new THREE.SphereGeometry(1, 12, 8).scale(0.1, 0.11, 0.32);
  const fin = new THREE.ConeGeometry(0.05, 0.14, 4).scale(0.25, 1, 1.6).translate(0, 0.13, -0.04);
  const tail = new THREE.ConeGeometry(0.1, 0.16, 4).scale(0.25, 1, 1).rotateX(Math.PI / 2).translate(0, 0.02, -0.36);
  // Drawn a little larger than life so it reads from the bank.
  const merged = mergeGeometries([body, fin, tail]).scale(1.25, 1.25, 1.25);
  [body, fin, tail].forEach((part) => part.dispose());
  return merged;
}

/** A +z-facing shiner: a slim body and tail, drawn a little larger than life so it reads from the bank. */
function shinerShape() {
  const body = new THREE.SphereGeometry(1, 8, 6).scale(0.03, 0.035, 0.1);
  const tail = new THREE.ConeGeometry(0.035, 0.06, 4).scale(0.3, 1, 1).rotateX(Math.PI / 2).translate(0, 0, -0.12);
  const merged = mergeGeometries([body, tail]).scale(1.4, 1.4, 1.4);
  [body, tail].forEach((part) => part.dispose());
  return merged;
}

/** A +z-facing pike, PIKE_REACH from nose to middle and tail to middle: a long low body, a flat snout, its dorsal fin set far back by the tail. */
function pikeShape() {
  const body = new THREE.SphereGeometry(1, 12, 8).scale(0.07, 0.07, 0.38);
  const snout = new THREE.ConeGeometry(0.045, 0.2, 6).rotateX(Math.PI / 2).scale(1, 0.5, 1).translate(0, -0.01, PIKE_REACH - 0.1);
  const fin = new THREE.ConeGeometry(0.04, 0.1, 4).scale(0.25, 1, 1.6).translate(0, 0.08, -0.24);
  const tail = new THREE.ConeGeometry(0.1, 0.19, 4).scale(0.25, 1, 1).rotateX(Math.PI / 2).translate(0, 0, 0.095 - PIKE_REACH);
  const merged = mergeGeometries([body, snout, fin, tail]);
  [body, snout, fin, tail].forEach((part) => part.dispose());
  return merged;
}

/** The front of a ring, facing +z: the bow wave of a fish that bolts. */
function wakeShape() {
  return new THREE.RingGeometry(0.8, 1, 12, 1, -Math.PI / 2 - WAKE_ARC / 2, WAKE_ARC).rotateX(-Math.PI / 2);
}

/** A soft round edge, so the cloud fades into the water instead of ending in a hard disc. */
function softEdge() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const paint = canvas.getContext("2d");
  if (paint) {
    const fade = paint.createRadialGradient(32, 32, 4, 32, 32, 32);
    fade.addColorStop(0, "#fff");
    fade.addColorStop(0.55, "#bbb");
    fade.addColorStop(1, "#000");
    paint.fillStyle = fade;
    paint.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/** The muddy cloud a handful of groundbait leaves off the bank, thinning as its casts are fished out; fish dimple over it once `feeding` or topped up, more often the more it was built up, with `bigFeeders` in a carp now and then rolls at its edge, and with `thieves` shiners dart in at its edge and turn away, fewer as it is topped up, and with `prowler` a pike glides along its open-water side, slashing in at the feeders once a pass. When a lost big feeder scatters the feeders the dimples stop, bow wakes fan out toward open water and the cloud thins. */
export function GroundbaitCloud({ bait, feeding = false, bigFeeders = false, thieves = false, prowler = false }: { bait: Groundbait; feeding?: boolean; bigFeeders?: boolean; thieves?: boolean; prowler?: boolean }) {
  const still = useReducedMotion();
  const geo = useMemo(() => new THREE.CircleGeometry(CLOUD_RADIUS, 32).rotateX(-Math.PI / 2), []);
  const edge = useMemo(() => softEdge(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: CLOUD, alphaMap: edge, transparent: true, depthWrite: false }), [edge]);
  const cloud = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), []);
  const wake = useMemo(() => wakeShape(), []);
  const carpGeo = useMemo(() => carpShape(), []);
  const carp = useRef<THREE.Mesh>(null);
  const swirl = useRef<THREE.Mesh>(null);
  const shinerGeo = useMemo(() => shinerShape(), []);
  const shinerMat = useMemo(() => new THREE.MeshToonMaterial({ color: SHINER, gradientMap: toonRamp() }), []);
  const shiners = useRef<THREE.InstancedMesh>(null);
  const pikeGeo = useMemo(() => pikeShape(), []);
  const pike = useRef<THREE.Mesh>(null);
  const bow = useRef<THREE.Mesh>(null);
  const place = useMemo(() => new THREE.Object3D(), []);
  // Whether the swim was scattered last frame, and when the feeders last bolted; a swim that comes in already scattered (a reload) has no bolt to show.
  const scattered = useRef(!!bait.spooked);
  const bolted = useRef(-Infinity);
  const at = cloudCenter(bait.spot);
  const out = openWaterYaw(bait.spot);
  useEffect(
    () => () => {
      geo.dispose();
      ringGeo.dispose();
      wake.dispose();
      carpGeo.dispose();
      edge.dispose();
      mat.dispose();
      shinerGeo.dispose();
      shinerMat.dispose();
      pikeGeo.dispose();
    },
    [geo, ringGeo, wake, carpGeo, edge, mat, shinerGeo, shinerMat, pikeGeo],
  );
  useFrame((state, dt) => {
    const mesh = cloud.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.position.set(at.x, waterHeight(at.x, at.z, t) + 0.02, at.z);
    // A slow swell as the crumbs drift and settle.
    mesh.scale.setScalar(still ? 1 : 1 + 0.06 * Math.sin(t * 0.8));
    const spooked = !!bait.spooked;
    if (!scattered.current && spooked) bolted.current = t;
    scattered.current = spooked;
    const thick = cloudOpacity(bait.casts, spooked);
    // The cloud thins over the bolt; every other change shows at once.
    mat.opacity = still || t - bolted.current >= SCATTER_SEC ? thick : mat.opacity + (thick - mat.opacity) * Math.min(1, dt * 2);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const bolt = i < SCATTER_WAKES && !still ? scatterWakeAt(i, t - bolted.current, out) : null;
      ring.geometry = bolt ? wake : ringGeo;
      ring.rotation.y = bolt ? bolt.yaw : 0;
      if (bolt) {
        const x = at.x + Math.sin(bolt.yaw) * bolt.run;
        const z = at.z + Math.cos(bolt.yaw) * bolt.run;
        ring.visible = true;
        ring.position.set(x, waterHeight(x, z, t) + 0.03, z);
        ring.scale.setScalar(bolt.size);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.75 * bolt.glow;
        return;
      }
      const dimple = dimpleAt(i, t, bait.built);
      ring.visible = feedersShow(bait, feeding) && !still && dimple.age < 1;
      if (!ring.visible) return;
      const x = at.x + dimple.dx;
      const z = at.z + dimple.dz;
      ring.position.set(x, waterHeight(x, z, t) + 0.03, z);
      ring.scale.setScalar(0.08 + 0.5 * (1 - (1 - dimple.age) ** 2));
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - dimple.age);
    });
    const roll = bigFeeders && !still ? rollAt(t) : null;
    if (carp.current) {
      carp.current.visible = roll !== null && roll.age < 1;
      if (roll && roll.age < 1) {
        const tip = (roll.age - 0.5) * ROLL_ARC;
        const along = ROLL_DEPTH * Math.sin(tip);
        const x = at.x + roll.dx + Math.sin(roll.yaw) * along;
        const z = at.z + roll.dz + Math.cos(roll.yaw) * along;
        carp.current.position.set(x, waterHeight(x, z, t) - ROLL_DEPTH * (1 - Math.cos(tip)) - ROLL_SINK * Math.abs(2 * roll.age - 1) ** 3 - 0.03, z);
        // A +z-facing fish: nose up is a negative turn about x, so it rolls from nose up to nose down.
        carp.current.rotation.set(tip, roll.yaw, 0, "YXZ");
      }
    }
    if (swirl.current) {
      const k = roll ? (roll.age - 0.2) / (ROLL_SPAN - 0.2) : -1;
      swirl.current.visible = k >= 0 && k < 1;
      if (roll && swirl.current.visible) {
        const x = at.x + roll.dx;
        const z = at.z + roll.dz;
        swirl.current.position.set(x, waterHeight(x, z, t) + 0.03, z);
        swirl.current.scale.setScalar(0.25 + 0.55 * k);
        (swirl.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
      }
    }
    const school = shiners.current;
    if (school) {
      const crowd = thieves ? thiefCount(bait.built) : 0;
      school.visible = crowd > 0;
      for (let i = 0; i < crowd; i++) {
        const thief = thiefAt(i, t, still);
        if (thief) {
          const x = at.x + thief.dx;
          const z = at.z + thief.dz;
          // Its back just breaks the surface, with a quick tail-beat wobble as it darts.
          place.position.set(x, waterHeight(x, z, t) - 0.02, z);
          place.rotation.set(0, thief.yaw + (still ? 0 : 0.15 * Math.sin(t * 22 + i)), 0);
          place.scale.setScalar(thief.show);
        } else place.scale.setScalar(0);
        place.updateMatrix();
        school.setMatrixAt(i, place.matrix);
      }
      school.count = crowd;
      school.instanceMatrix.needsUpdate = true;
    }
    const prowl = prowler ? prowlAt(t, out, still) : null;
    if (pike.current) {
      pike.current.visible = prowl !== null;
      if (prowl) {
        const x = at.x + prowl.dx;
        const z = at.z + prowl.dz;
        // Its back just under the surface, breaking it as it slashes, with a tail-beat sway that swings wider as it slashes.
        pike.current.position.set(x, waterHeight(x, z, t) - 0.05 + 0.03 * prowl.slash, z);
        pike.current.rotation.set(0, prowl.yaw + (still ? 0 : (0.05 + 0.1 * prowl.slash) * Math.sin(t * 6)), 0);
      }
    }
    if (bow.current) {
      bow.current.visible = prowl !== null && !still;
      if (prowl && !still) {
        // The bow wave pushed ahead of its snout, swelling as it slashes.
        const x = at.x + prowl.dx + Math.sin(prowl.yaw) * PIKE_REACH * 0.8;
        const z = at.z + prowl.dz + Math.cos(prowl.yaw) * PIKE_REACH * 0.8;
        bow.current.position.set(x, waterHeight(x, z, t) + 0.03, z);
        bow.current.rotation.y = prowl.yaw;
        bow.current.scale.setScalar(0.16 + 0.14 * prowl.slash);
        (bow.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * prowl.speed + 0.45 * prowl.slash;
      }
    }
  });
  return (
    <>
      <mesh ref={cloud} geometry={geo} material={mat} renderOrder={1} />
      {Array.from({ length: DIMPLES }, (_, i) => (
        <mesh key={i} ref={(mesh) => void (rings.current[i] = mesh)} geometry={ringGeo} visible={false} renderOrder={4}>
          <meshBasicMaterial color="#e4efea" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={carp} geometry={carpGeo} visible={false}>
        <meshToonMaterial color={CARP} gradientMap={toonRamp()} />
      </mesh>
      <instancedMesh ref={shiners} name="bait-thieves" args={[shinerGeo, shinerMat, THIEVES]} visible={false} frustumCulled={false} />
      <mesh ref={pike} name="prowling-pike" geometry={pikeGeo} visible={false}>
        <meshToonMaterial color={PIKE} gradientMap={toonRamp()} />
      </mesh>
      <mesh ref={bow} geometry={wake} visible={false} renderOrder={4}>
        <meshBasicMaterial color="#e4efea" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={swirl} geometry={ringGeo} visible={false} renderOrder={4}>
        <meshBasicMaterial color="#e4efea" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
