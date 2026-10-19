import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { LILY_HEART, LILY_PETALS, easeLily, lilyBloom, lilyCup, lilyPads } from "./lilyBloom";
import { sharedLilyPetals } from "./lilyPetals";
import { useReducedMotion } from "./reducedMotion";
import { prepareToon, releaseToonCopy } from "./ToonModel";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

export type LilyAt = { url: string; position: readonly [number, number, number]; scale: number };

/** How far apart the water is sampled to tilt a pad, metres, and how much a pad follows the slope. */
const SAMPLE = 0.5;
const FOLLOW = 1.3;
const MAX_TILT = 0.28;

/** A pad riding the swell at (x, z) `time` seconds in: its rise on the water and its tilt to the slope. */
export function lilyRide(x: number, z: number, time: number) {
  const y = waterHeight(x, z, time);
  return {
    y,
    rx: THREE.MathUtils.clamp((waterHeight(x, z + SAMPLE, time) - y) * FOLLOW, -MAX_TILT, MAX_TILT),
    rz: THREE.MathUtils.clamp((y - waterHeight(x + SAMPLE, z, time)) * FOLLOW, -MAX_TILT, MAX_TILT),
  };
}

const BUD = "#9fb86a";
/** Where a flower sits on its pad, and how large it is drawn, in pad sizes (drawn a little large so it reads from the bank). */
const FLOWER_AT = new THREE.Vector3(0.12, 0, 0.08);
const FLOWER_SIZE = 1.8;

/**
 * Every lily pad on the lake riding the swell, and the flowers (or spring buds) on them: the pads are one
 * instanced draw per lily model part, and all the flowers' petals, hearts or buds one draw each.
 */
export function LilyBed({ lilies, season, open }: { lilies: readonly LilyAt[]; season: LakeSeason; open: number }) {
  const still = useReducedMotion();
  const pads = lilyPads(season);
  const bloom = lilyBloom(season);
  const urls = useMemo(() => [...new Set(lilies.map((lily) => lily.url))], [lilies]);
  const models = useGLTF(urls);
  const kinds = useMemo(
    () =>
      urls.map((url, k) => {
        const root = prepareToon(models[k]!.scene, { shadows: false, plant: { season, kind: "grass", variant: 0.5 } });
        root.updateMatrixWorld(true);
        const members = lilies.flatMap((lily, i) => (lily.url === url ? [i] : []));
        const parts: { mesh: THREE.InstancedMesh; local: THREE.Matrix4 }[] = [];
        root.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
          const mesh = new THREE.InstancedMesh(obj.geometry, obj.material, members.length);
          mesh.frustumCulled = false;
          parts.push({ mesh, local: obj.matrixWorld.clone() });
        });
        return { root, members, parts };
      }),
    [urls, models, lilies, season],
  );
  useEffect(
    () => () =>
      kinds.forEach(({ root, parts }) => {
        parts.forEach(({ mesh }) => mesh.dispose());
        releaseToonCopy(root);
      }),
    [kinds],
  );
  const flowers = useMemo(() => {
    const petals = new THREE.InstancedMesh(sharedLilyPetals(), new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: toonRamp() }), lilies.length);
    const ball = new THREE.SphereGeometry(1, 8, 6);
    const hearts = new THREE.InstancedMesh(ball, new THREE.MeshToonMaterial({ color: LILY_HEART, gradientMap: toonRamp() }), lilies.length);
    const buds = new THREE.InstancedMesh(ball, new THREE.MeshToonMaterial({ color: BUD, gradientMap: toonRamp() }), lilies.length);
    const tint = new THREE.Color();
    lilies.forEach((_, i) => petals.setColorAt(i, tint.set(LILY_PETALS[i % LILY_PETALS.length]!)));
    [petals, hearts, buds].forEach((mesh) => (mesh.frustumCulled = false));
    return { petals, hearts, buds, ball };
  }, [lilies]);
  useEffect(
    () => () => {
      [flowers.petals, flowers.hearts, flowers.buds].forEach((mesh) => {
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      });
      flowers.ball.dispose();
    },
    [flowers],
  );
  const scratch = useMemo(
    () => ({ pad: new THREE.Matrix4(), part: new THREE.Matrix4(), flower: new THREE.Matrix4(), piece: new THREE.Matrix4(), turn: new THREE.Euler(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }),
    [],
  );
  const shown = useRef(open);
  useFrame((state, delta) => {
    if (!pads) return;
    const t = state.clock.elapsedTime;
    // Every flower eases open and shut together as the hour and the weather turn.
    shown.current = still ? open : easeLily(shown.current, open, delta);
    const cup = lilyCup(shown.current);
    const { pad, part, flower, piece, turn, q, p, s } = scratch;
    const padAt = (lily: LilyAt) => {
      const ride = lilyRide(lily.position[0], lily.position[2], t);
      return pad.compose(p.set(lily.position[0], lily.position[1] + ride.y, lily.position[2]), q.setFromEuler(turn.set(ride.rx, 0, ride.rz)), s.setScalar(1));
    };
    kinds.forEach(({ members, parts }) =>
      members.forEach((i, slot) => {
        const lily = lilies[i]!;
        padAt(lily);
        part.makeScale(lily.scale * pads.grow, lily.scale * pads.grow, lily.scale * pads.grow).premultiply(pad);
        parts.forEach(({ mesh, local }) => mesh.setMatrixAt(slot, piece.multiplyMatrices(part, local)));
      }),
    );
    kinds.forEach(({ parts }) => parts.forEach(({ mesh }) => (mesh.instanceMatrix.needsUpdate = true)));
    if (!bloom) return;
    lilies.forEach((lily, i) => {
      padAt(lily);
      const size = lily.scale * FLOWER_SIZE;
      flower.compose(p.copy(FLOWER_AT).multiplyScalar(lily.scale), q.identity(), s.setScalar(size)).premultiply(pad);
      if (bloom === "bud") {
        flowers.buds.setMatrixAt(i, piece.compose(p.set(0, 0.07, 0), q, s.set(0.045, 0.08, 0.045)).premultiply(flower));
        return;
      }
      flowers.petals.setMatrixAt(i, piece.compose(p.set(0, 0.03, 0), q, s.set(cup.spread, cup.rise, cup.spread)).premultiply(flower));
      flowers.hearts.setMatrixAt(i, piece.compose(p.set(0, 0.07, 0), q, s.set(0.03, 0.022, 0.03)).premultiply(flower));
    });
    [flowers.petals, flowers.hearts, flowers.buds].forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true));
  });
  if (!pads) return null;
  return (
    <group name="lily-bed">
      {kinds.flatMap(({ parts }) => parts.map(({ mesh }) => <primitive key={mesh.uuid} object={mesh} />))}
      {bloom === "bud" && <primitive object={flowers.buds} />}
      {bloom === "flower" && <primitive object={flowers.petals} />}
      {bloom === "flower" && <primitive object={flowers.hearts} />}
    </group>
  );
}
