import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { BOLT_POINTS, boltMirror, boltPath, type BoltPoint } from "./boltPath";
import { useReducedMotion } from "./reducedMotion";
import { flashLevel, strikeGap, thunderDelay } from "./storm";
import { waterHeight } from "./water";

/** The flash's light at its brightest, on top of the storm's dim daylight. */
const FLASH_PEAK = 2.6;
const BOLT_COLOR = "#eef2ff";
/** The bolt is a ribbon, since a line is a hair at this distance; its image in the water is narrower and dimmer. */
const BOLT_WIDTH = 0.7;
const MIRROR_WIDTH = 0.32;
const MIRROR_DIM = 0.7;

/** A ribbon along up to BOLT_POINTS points: two vertices a point, one quad a segment. */
function makeStrip(order: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BOLT_POINTS * 2 * 3), 3));
  const index: number[] = [];
  for (let i = 0; i < BOLT_POINTS - 1; i += 1) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geo.setIndex(index);
  const mat = new THREE.MeshBasicMaterial({
    color: BOLT_COLOR,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = order;
  return mesh;
}

function setStrip(mesh: THREE.Mesh, points: readonly BoltPoint[], side: (i: number) => [number, number, number]) {
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  points.forEach((p, i) => {
    const [sx, sy, sz] = side(i);
    position.setXYZ(i * 2, p[0] - sx, p[1] - sy, p[2] - sz);
    position.setXYZ(i * 2 + 1, p[0] + sx, p[1] + sy, p[2] + sz);
  });
  position.needsUpdate = true;
  mesh.geometry.setDrawRange(0, Math.max(0, points.length - 1) * 6);
}

/** A storm over the lake: now and then a bolt forks down over the far shore, the whole scene flashes, its image shows in the lake, and thunder rolls in after it. */
export function Lightning() {
  // The flash follows the phone's or computer's own reduce motion setting too, not only the game's.
  const still = useReducedMotion();
  const light = useRef<THREE.AmbientLight>(null);
  const struckAt = useRef(-Infinity);
  const path = useRef<BoltPoint[]>([]);
  const bolt = useMemo(() => makeStrip(-1), []);
  const mirror = useMemo(() => makeStrip(3), []);

  useEffect(
    () => () => {
      for (const mesh of [bolt, mirror]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    },
    [bolt, mirror],
  );

  useEffect(() => {
    let timer = 0;
    const strike = () => {
      const near = Math.random();
      struckAt.current = performance.now();
      path.current = boltPath(Math.random());
      setStrip(bolt, path.current, () => [BOLT_WIDTH / 2, 0, 0]);
      fx.thunder(thunderDelay(near), near);
      timer = window.setTimeout(strike, strikeGap(Math.random()) * 1000);
    };
    // The first one comes soon enough to notice there is a storm.
    timer = window.setTimeout(strike, 4000 + Math.random() * 6000);
    return () => window.clearTimeout(timer);
  }, [bolt]);

  useFrame((state) => {
    if (!light.current) return;
    // Reduce motion keeps the thunder and drops the flash.
    const level = still ? 0 : flashLevel(performance.now() - struckAt.current);
    light.current.intensity = level * FLASH_PEAK;
    bolt.visible = level > 0;
    mirror.visible = false;
    if (level <= 0) return;
    (bolt.material as THREE.MeshBasicMaterial).opacity = level;
    const t = state.clock.elapsedTime;
    const image = boltMirror(path.current, state.camera.position);
    if (image.length < 2) return;
    const points = image.map((at) => [at.x, waterHeight(at.x, at.z, t) + 0.04, at.z] as const);
    setStrip(mirror, points, (i) => {
      const a = image[Math.max(0, i - 1)]!;
      const b = image[Math.min(image.length - 1, i + 1)]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      return [(-dz / len) * (MIRROR_WIDTH / 2), 0, (dx / len) * (MIRROR_WIDTH / 2)];
    });
    (mirror.material as THREE.MeshBasicMaterial).opacity = level * MIRROR_DIM;
    mirror.visible = true;
  });

  return (
    <>
      <ambientLight ref={light} color="#dfe8ff" intensity={0} />
      <primitive object={bolt} />
      <primitive object={mirror} />
    </>
  );
}
