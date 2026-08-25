import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { SpotId } from "@stillwater/shared";
import { ArticulatedFish } from "./ArticulatedFish";
import { ToonModel } from "./ToonModel";
import { toonRamp } from "./toon";

type Vec3 = [number, number, number];

const LAKE_CENTER_Z = -2;
const LAKE_RX = 22.5;
const LAKE_RZ = 14.5;

const MODELS = {
  pine: "/models/tree_detailed.glb",
  pineDark: "/models/tree_detailed_dark.glb",
  oak: "/models/tree_oak.glb",
  oakDark: "/models/tree_oak_dark.glb",
  fat: "/models/tree_fat.glb",
  bushDetailed: "/models/plant_bushDetailed.glb",
  bushLarge: "/models/plant_bushLarge.glb",
  grass: "/models/grass.glb",
  grassLarge: "/models/grass_large.glb",
  canoe: "/models/canoe.glb",
  rowboat: "/models/boat-row-large.glb",
  paddle: "/models/canoe_paddle.glb",
  bridge: "/models/bridge_wood.glb",
  platform: "/models/platform_beach.glb",
  path: "/models/path_wood.glb",
  log: "/models/log.glb",
  lilyLarge: "/models/lily_large.glb",
  lilySmall: "/models/lily_small.glb",
  reed: "/models/grass_leafsLarge.glb",
} as const;

type Scatter = { url: string; position: Vec3; scale: number; rot: number };
type Lily = { url: string; position: Vec3; scale: number };
type BoatProps = { url: string; position: Vec3; heading: number; delay: number; scale: number };
type FishProps = {
  points: Vec3[];
  speed: number;
  phase: number;
  size: number;
  color: string;
  accent: string;
};

// Deterministic pseudo-random in [0, 1) so the layout is stable across renders.
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Ring of scenery around the lake, leaving the dock side (+z) open for the camera.
function scatterRing(count: number, urls: readonly string[], seed: number, spread: number, scaleMin: number, scaleMax: number): Scatter[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI * (0.72 + (1.56 * i) / (count - 1)) + (jitter(seed + i) - 0.5) * 0.14;
    const out = jitter(seed + i + 40) * spread;
    return {
      url: urls[Math.floor(jitter(seed + i + 80) * urls.length)]!,
      position: [Math.cos(angle) * (LAKE_RX + 2.6 + out), -0.08, Math.sin(angle) * (LAKE_RZ + 2.4 + out * 0.7) + LAKE_CENTER_Z] as Vec3,
      scale: scaleMin + jitter(seed + i + 120) * (scaleMax - scaleMin),
      rot: jitter(seed + i + 160) * Math.PI * 2,
    };
  });
}

const TREE_URLS = [MODELS.pine, MODELS.pineDark, MODELS.pine, MODELS.oak, MODELS.fat, MODELS.pineDark, MODELS.oakDark] as const;
const TREES = scatterRing(22, TREE_URLS, 3, 6, 3.4, 5.6);
const BACK_TREES = scatterRing(14, [MODELS.pineDark, MODELS.oakDark, MODELS.pine], 57, 6, 4.6, 6.4).map((tree) => ({
  ...tree,
  position: [tree.position[0] * 1.18, tree.position[1], tree.position[2] * 1.24 - 1.5] as Vec3,
}));
const BUSHES = scatterRing(10, [MODELS.bushDetailed, MODELS.bushLarge], 11, 2.2, 1.1, 2.1);
const GRASS = scatterRing(16, [MODELS.grass, MODELS.grassLarge], 23, 1.4, 1.2, 2.2);

const NEAR_GRASS: Scatter[] = [
  { url: MODELS.grassLarge, position: [-4.6, -0.02, 9.6], scale: 1.9, rot: 0.6 },
  { url: MODELS.grass, position: [-3.1, -0.02, 10.4], scale: 1.5, rot: 2.3 },
  { url: MODELS.grassLarge, position: [3.4, -0.02, 10.1], scale: 1.7, rot: 4.1 },
  { url: MODELS.grass, position: [5, -0.02, 9.3], scale: 1.4, rot: 1.2 },
  { url: MODELS.bushDetailed, position: [-6.4, -0.02, 9], scale: 1.4, rot: 0.9 },
  { url: MODELS.bushLarge, position: [7.1, -0.02, 9.8], scale: 1.3, rot: 2.8 },
];

const LILIES: Lily[] = [
  { url: MODELS.lilyLarge, position: [-8.4, 0.04, 5.5], scale: 1.35 },
  { url: MODELS.lilySmall, position: [-6.8, 0.04, 4.8], scale: 1.5 },
  { url: MODELS.lilyLarge, position: [7.8, 0.04, -8.4], scale: 1.2 },
  { url: MODELS.lilySmall, position: [9.1, 0.04, -7.7], scale: 1.4 },
  { url: MODELS.lilySmall, position: [-12.2, 0.04, -4.1], scale: 1.2 },
  { url: MODELS.lilyLarge, position: [-10.6, 0.04, -6.8], scale: 1.15 },
];

const BOATS: BoatProps[] = [
  { url: MODELS.canoe, position: [-8.5, 0.08, -5], heading: 0.72, delay: 0.2, scale: 2.6 },
  { url: MODELS.rowboat, position: [10.5, 0.06, -9.8], heading: -0.82, delay: 1.4, scale: 0.66 },
];

const FISH: FishProps[] = [
  {
    points: [[-8, -0.36, 3], [-2, -0.24, 5], [5, -0.41, 2], [7, -0.31, -4], [1, -0.48, -7], [-7, -0.34, -5]],
    speed: 0.027,
    phase: 0,
    size: 1.05,
    color: "#b9673e",
    accent: "#e7bd72",
  },
  {
    points: [[3, -0.46, 4], [9, -0.26, 0], [6, -0.41, -7], [-1, -0.36, -9], [-5, -0.26, -3]],
    speed: 0.034,
    phase: 0.22,
    size: 0.85,
    color: "#779057",
    accent: "#c6ce85",
  },
  {
    points: [[-12, -0.28, -1], [-8, -0.44, -8], [-1, -0.52, -11], [4, -0.34, -6], [0, -0.28, 0]],
    speed: 0.023,
    phase: 0.48,
    size: 1.12,
    color: "#566f78",
    accent: "#b7c7bd",
  },
  {
    points: [[-5, -0.32, 1], [0, -0.24, 3], [5, -0.36, -1], [2, -0.48, -5], [-4, -0.32, -4]],
    speed: 0.039,
    phase: 0.67,
    size: 0.8,
    color: "#c5893d",
    accent: "#f1cf77",
  },
  {
    points: [[8, -0.32, 2], [12, -0.44, -4], [7, -0.41, -10], [1, -0.28, -7], [2, -0.36, -1]],
    speed: 0.031,
    phase: 0.84,
    size: 0.95,
    color: "#8b5c4b",
    accent: "#d4a071",
  },
];

for (const url of Object.values(MODELS)) useGLTF.preload(url);

function lakeEdge(angle: number) {
  return 1 + Math.sin(angle * 3) * 0.025 + Math.sin(angle * 7 + 0.7) * 0.018;
}

function makeLakeGeometry(radiusX: number, radiusZ: number) {
  const geometry = new THREE.CircleGeometry(1, 96);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    if (x === 0 && z === 0) continue;
    const edge = lakeEdge(Math.atan2(z, x));
    positions.setXY(i, x * radiusX * edge, z * radiusZ * edge);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function edgePoints(offset: number) {
  return Array.from({ length: 96 }, (_, i) => {
    const angle = (i / 96) * Math.PI * 2;
    const edge = lakeEdge(angle);
    return new THREE.Vector2(Math.cos(angle) * (LAKE_RX * edge + offset), Math.sin(angle) * (LAKE_RZ * edge + offset));
  });
}

function makeEdgeRingGeometry(outerOffset: number, innerOffset: number) {
  const shape = new THREE.Shape(edgePoints(outerOffset));
  shape.holes.push(new THREE.Path(edgePoints(innerOffset).reverse()));
  return new THREE.ShapeGeometry(shape);
}

// Terrain with a lake-shaped hole so the lakebed and fish stay visible under the water.
function makeGroundGeometry() {
  const shape = new THREE.Shape([
    new THREE.Vector2(-55, -39.5),
    new THREE.Vector2(55, -39.5),
    new THREE.Vector2(55, 45.5),
    new THREE.Vector2(-55, 45.5),
  ]);
  shape.holes.push(new THREE.Path(edgePoints(0.15).reverse()));
  return new THREE.ShapeGeometry(shape);
}

// Subtle wave streaks multiplied over the water color; offset scrolls each frame.
function makeWaterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2f8f9";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i += 1) {
    const y = jitter(i + 1) * 256;
    const x = jitter(i + 50) * 256;
    const w = 24 + jitter(i + 100) * 56;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.32)" : "rgba(170,200,212,0.22)";
    ctx.lineWidth = 1 + jitter(i + 150) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + 4, x + w / 2, y);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  return texture;
}

function makeSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 256, 0, 0);
  gradient.addColorStop(0, "#e6ead8");
  gradient.addColorStop(0.42, "#b7d2dc");
  gradient.addColorStop(1, "#79a8c6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Sky() {
  const texture = useMemo(() => makeSkyTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      <mesh scale={90}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
      </mesh>
      <mesh position={[38, 34, -62]}>
        <circleGeometry args={[5.5, 24]} />
        <meshBasicMaterial color="#fff3cf" fog={false} />
      </mesh>
      <mesh position={[38, 34, -61.8]}>
        <circleGeometry args={[9, 24]} />
        <meshBasicMaterial color="#f4e9c5" transparent opacity={0.35} fog={false} />
      </mesh>
    </>
  );
}

const CLOUDS: { y: number; z: number; scale: number; speed: number; offset: number }[] = [
  { y: 17, z: -38, scale: 1, speed: 0.32, offset: 0 },
  { y: 21, z: -28, scale: 1.5, offset: 30, speed: 0.24 },
  { y: 14.5, z: -47, scale: 0.8, offset: 55, speed: 0.42 },
  { y: 19, z: -34, scale: 1.2, offset: 72, speed: 0.28 },
];

function Cloud({ y, z, scale, speed, offset }: (typeof CLOUDS)[number]) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = ((state.clock.elapsedTime * speed + offset) % 110) - 55;
  });
  return (
    <group ref={ref} position={[0, y, z]} scale={scale}>
      <mesh position={[0, 0, 0]} scale={[2.6, 1.1, 1.6]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshBasicMaterial color="#f4f8f6" fog={false} />
      </mesh>
      <mesh position={[1.9, 0.35, 0.2]} scale={[1.5, 0.85, 1.2]}>
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color="#eef4f2" fog={false} />
      </mesh>
      <mesh position={[-1.8, 0.2, -0.3]} scale={[1.3, 0.7, 1]}>
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color="#eef4f2" fog={false} />
      </mesh>
    </group>
  );
}

function LakeSurface({ spot }: { spot: SpotId }) {
  const material = useRef<THREE.MeshToonMaterial>(null);
  const glintA = useRef<THREE.MeshBasicMaterial>(null);
  const glintB = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => makeLakeGeometry(LAKE_RX, LAKE_RZ), []);
  const bedGeometry = useMemo(() => makeLakeGeometry(LAKE_RX + 0.4, LAKE_RZ + 0.4), []);
  const foamGeometry = useMemo(() => makeEdgeRingGeometry(0.32, 0.02), []);
  const waterMap = useMemo(() => makeWaterTexture(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      bedGeometry.dispose();
      foamGeometry.dispose();
      waterMap.dispose();
    };
  }, [geometry, bedGeometry, foamGeometry, waterMap]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    waterMap.offset.x += delta * 0.014;
    waterMap.offset.y += delta * 0.008;
    if (material.current) material.current.opacity = 0.8 + Math.sin(t * 0.45) * 0.02;
    if (glintA.current) glintA.current.opacity = 0.14 + Math.sin(t * 0.65) * 0.05;
    if (glintB.current) glintB.current.opacity = 0.1 + Math.sin(t * 0.52 + 2) * 0.04;
  });

  return (
    <group position={[0, 0, LAKE_CENTER_Z]}>
      <mesh geometry={bedGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <meshToonMaterial color="#23444f" gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshToonMaterial
          ref={material}
          color={spot === "dropoff" ? "#2c6784" : "#357795"}
          map={waterMap}
          gradientMap={toonRamp()}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={foamGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <meshBasicMaterial color="#e9f3ef" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[-5, 0.035, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.8, 0.55, 1]}>
        <ringGeometry args={[2.4, 2.48, 64]} />
        <meshBasicMaterial ref={glintA} color="#e3f0ec" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh position={[7, 0.038, -4]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 0.42, 1]}>
        <ringGeometry args={[3.2, 3.3, 64]} />
        <meshBasicMaterial ref={glintB} color="#d8eae6" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Hill({ position, scale, color }: { position: Vec3; scale: Vec3; color: string }) {
  return (
    <mesh position={position} scale={scale} castShadow={false}>
      <icosahedronGeometry args={[1, 2]} />
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </mesh>
  );
}

function Rock({ position, scale, rotation = 0 }: { position: Vec3; scale: Vec3; rotation?: number }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.15, rotation, -0.08]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshToonMaterial color="#75796f" gradientMap={toonRamp()} />
    </mesh>
  );
}

function Boat({ url, position, heading, delay, scale }: BoatProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const boat = ref.current;
    if (!boat) return;
    const t = state.clock.elapsedTime + delay;
    boat.position.y = position[1] + Math.sin(t * 1.05) * 0.035;
    boat.rotation.z = Math.sin(t * 0.85) * 0.025;
    boat.rotation.x = Math.sin(t * 0.7) * 0.018;
  });
  return (
    <group ref={ref} position={position} rotation={[0, heading, 0]}>
      <ToonModel url={url} scale={scale} shadows={false} />
    </group>
  );
}

function SwimmingFish({ points, speed, phase, size, color, accent }: FishProps) {
  const ref = useRef<THREE.Group>(null);
  const bank = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Group>(null);
  const rippleMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true, "catmullrom", 0.35), [points]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const fish = ref.current;
    if (!fish) return;
    const t = (state.clock.elapsedTime * speed + phase) % 1;
    curve.getPointAt(t, position);
    curve.getTangentAt(t, tangent);
    // Keep the whole fish body between the surface and the bed.
    const half = 0.34 * size;
    position.y = THREE.MathUtils.clamp(
      position.y + Math.sin(state.clock.elapsedTime * 0.9 + phase * 20) * 0.05,
      -1 + half,
      -0.07 - half,
    );
    fish.position.copy(position);
    const target = Math.atan2(tangent.x, tangent.z);
    const turn = Math.atan2(Math.sin(target - fish.rotation.y), Math.cos(target - fish.rotation.y));
    fish.rotation.y += turn * (1 - Math.exp(-5 * delta));
    if (bank.current) {
      const targetBank = THREE.MathUtils.clamp(-turn * 0.7, -0.22, 0.22);
      bank.current.rotation.z = THREE.MathUtils.damp(bank.current.rotation.z, targetBank, 7, delta);
    }
    if (ripple.current && rippleMaterial.current) {
      // Ripple stays on the water surface above the fish; child y compensates group y and scale.
      ripple.current.position.y = (0.03 - position.y) / size;
      const pulse = (state.clock.elapsedTime * 0.55 + phase) % 1;
      ripple.current.scale.setScalar((0.7 + pulse * 1.9) / size);
      rippleMaterial.current.opacity = (1 - pulse) * 0.16;
    }
  });

  return (
    <group ref={ref} scale={size}>
      <group ref={bank}>
        <ArticulatedFish color={color} accent={accent} phase={phase * 10} speed={0.85 + speed * 8} />
      </group>
      <group ref={ripple}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.58, 24]} />
          <meshBasicMaterial ref={rippleMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Dock() {
  return (
    <group>
      <ToonModel url={MODELS.bridge} position={[0, 0, 7.4]} rotation={[0, Math.PI / 2, 0]} scale={1.8} />
      <ToonModel url={MODELS.bridge} position={[0, 0, 6.25]} rotation={[0, Math.PI / 2, 0]} scale={1.8} />
      <ToonModel url={MODELS.path} position={[0, 0.02, 9]} rotation={[0, Math.PI / 2, 0]} scale={1.75} />
      <ToonModel url={MODELS.platform} position={[0, 0, 7.9]} scale={1.55} />
      <ToonModel url={MODELS.log} position={[1.35, 0.12, 7.2]} rotation={[0, 0.5, 0]} scale={1.1} />
      <ToonModel url={MODELS.paddle} position={[-1, 0.18, 7.05]} rotation={[0.15, 0.6, 1.15]} scale={1.25} />
    </group>
  );
}

function Reeds({ count, origin }: { count: number; origin: Vec3 }) {
  const keyPrefix = origin.join("-");
  return Array.from({ length: count }, (_, i) => (
    <ToonModel
      key={`${keyPrefix}-${i}`}
      url={MODELS.reed}
      position={[origin[0] + (i % 4) * 0.52, origin[1], origin[2] - Math.floor(i / 4) * 0.44]}
      rotation={[0, i * 0.73, 0]}
      scale={1.45 + (i % 3) * 0.16}
      shadows={false}
    />
  ));
}

function ScatterModels({ items, shadows = false }: { items: Scatter[]; shadows?: boolean }) {
  return items.map((item, i) => (
    <ToonModel
      key={`${item.url}-${i}`}
      url={item.url}
      position={item.position}
      rotation={[0, item.rot, 0]}
      scale={item.scale}
      shadows={shadows}
      sitOnGround
    />
  ));
}

export function LakeWorld({ spot }: { spot: SpotId }) {
  const shore = useMemo(() => makeEdgeRingGeometry(1.8, 0.15), []);
  const ground = useMemo(() => makeGroundGeometry(), []);
  useEffect(() => {
    return () => {
      shore.dispose();
      ground.dispose();
    };
  }, [shore, ground]);
  return (
    <>
      <fog attach="fog" args={["#b6cbd2", 40, 110]} />
      <hemisphereLight args={["#d3e6ef", "#41564a", 1.05]} />
      <directionalLight
        castShadow
        position={[16, 22, 10]}
        intensity={2.5}
        color="#ffdf9e"
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={22}
        shadow-camera-bottom={-20}
      />
      <Sky />
      {CLOUDS.map((cloud, i) => (
        <Cloud key={i} {...cloud} />
      ))}
      <mesh geometry={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, LAKE_CENTER_Z]} receiveShadow>
        <meshToonMaterial color="#4d6c48" gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={shore} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, LAKE_CENTER_Z]} receiveShadow>
        <meshToonMaterial color="#9a815b" gradientMap={toonRamp()} />
      </mesh>
      {spot === "dropoff" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, -0.02, -5]} scale={[1.7, 1, 1]}>
          <circleGeometry args={[4.2, 48]} />
          <meshBasicMaterial color="#1c3d4c" transparent opacity={0.55} />
        </mesh>
      )}
      <LakeSurface spot={spot} />

      <Hill position={[-28, 4.5, -26]} scale={[17, 7, 10]} color="#587a5f" />
      <Hill position={[-5, 5.2, -30]} scale={[20, 8, 10]} color="#628468" />
      <Hill position={[20, 4.6, -27]} scale={[18, 7, 11]} color="#547459" />
      <ScatterModels items={BACK_TREES} />
      <ScatterModels items={TREES} />
      <ScatterModels items={BUSHES} />
      <ScatterModels items={GRASS} />
      <ScatterModels items={NEAR_GRASS} />
      <Rock position={[-17.5, 0.45, 6.2]} scale={[1.7, 0.75, 1.15]} rotation={0.3} />
      <Rock position={[16.2, 0.5, 3.5]} scale={[1.4, 0.85, 1.1]} rotation={1.1} />
      <Rock position={[12.8, 0.3, -12.7]} scale={[1.1, 0.55, 0.8]} rotation={0.7} />
      <Rock position={[-14.8, 0.35, -10.9]} scale={[1.2, 0.6, 0.9]} rotation={1.8} />
      <Rock position={[19.6, 0.28, -6.4]} scale={[0.9, 0.5, 0.7]} rotation={2.6} />
      <Dock />
      <Reeds count={spot === "reeds" ? 14 : 7} origin={[-13.2, 0.03, 1.8]} />
      <Reeds count={6} origin={[11.4, 0.03, -9.7]} />
      {LILIES.map((lily, i) => (
        <ToonModel key={`${lily.url}-${i}`} url={lily.url} position={lily.position} scale={lily.scale} shadows={false} />
      ))}
      {BOATS.map((boat, i) => (
        <Boat key={`${boat.url}-${i}`} {...boat} />
      ))}
      {FISH.map((fish, i) => (
        <SwimmingFish key={i} {...fish} />
      ))}
    </>
  );
}
