import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { brollySitterShape, rodRestShape } from "./BrollyFisher";
import { BOX_AHEAD, BOX_SIDE, BUTT_AHEAD, FLOAT_AT, ROD_BUTT_Y, ROD_LENGTH, ROD_LIFT, ROD_TIP, SEAT_AT, SEAT_YAW, floatGlow, headlampLook } from "./headlampFishing";
import { mergePainted, mergeParts } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const JACKET = "#3c4a5e";
const SKIN = "#d9a882";
const BEANIE = "#7a2f2a";
const STRAP = "#1e1e1e";
const ROD = "#2a2622";
const BOX = "#3f6f4a";
const LAMP = "#fffbe8";
const STICK = "#9dff7a";
/** The seat's height, the neck above it, and the lamp on the forehead. */
const SEAT_Y = 0.36;
const NECK_Y = 0.52;
const LAMP_AT: THREE.Vector3Tuple = [0, 0.15, 0.1];
/** The beam: how far it reaches and how wide it opens. */
const BEAM_LENGTH = 6;
const BEAM_RADIUS = 0.7;
const FRONT_REST = 0.75;
const LINE_POINTS = 8;
/** The angler drawn a little larger than life, as the others on the far bank are. */
const SCALE = 1.2;

/** The body above the seat in a padded jacket, facing +z, both hands resting forward. */
export function nightTorsoShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.15, 0.19, 0.5, 8), position: [0, 0.25, 0], color: JACKET },
    ...[-1, 1].map((side) => ({
      geometry: new THREE.CylinderGeometry(0.045, 0.04, 0.36, 6),
      position: [side * 0.17, 0.3, 0.12] as const,
      rotation: [0.95, 0, side * -0.1] as const,
      color: JACKET,
    })),
  ]);
}

/** The head in a beanie, the headlamp strapped round it, facing +z. */
export function nightHeadShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.1, 0.01], color: SKIN },
    { geometry: new THREE.SphereGeometry(0.107, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.13, 0], color: BEANIE },
    { geometry: new THREE.CylinderGeometry(0.108, 0.108, 0.025, 12, 1, true), position: [0, 0.15, 0], color: STRAP },
    { geometry: new THREE.BoxGeometry(0.06, 0.04, 0.03), position: [0, 0.15, 0.1], color: STRAP },
  ]);
}

export function nightRodShape() {
  return mergePainted([{ geometry: new THREE.CylinderGeometry(0.01, 0.022, ROD_LENGTH, 5), position: [0, 0, ROD_LENGTH / 2], rotation: [Math.PI / 2, 0, 0], color: ROD }]);
}

/** The beam's fall-off: bright at the lamp (the cone's point, the top of its map) fading to nothing at its open end. */
function beamFade() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.45, "#5a5a5a");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/** The headlamp's beam: an open cone with its point at the lamp, widening out along +z. */
function beamGeometry() {
  return new THREE.ConeGeometry(BEAM_RADIUS, BEAM_LENGTH, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, BEAM_LENGTH / 2);
}

/** A night angler on the far bank, a headlamp's beam following their looks and a glowing float out on the water (headlampFishing.ts). */
export function NightAngler() {
  const still = useReducedMotion();
  const head = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const shapes = useMemo(
    () => ({
      // Everything at the swim that holds still, the sitter, the rests, the rod and the box: one draw.
      rig: mergeParts([
        { geometry: brollySitterShape(), scale: SCALE },
        { geometry: nightTorsoShape(), position: [0, SEAT_Y * SCALE, -0.02 * SCALE], scale: SCALE },
        { geometry: mergePainted([{ geometry: new THREE.BoxGeometry(0.34, 0.2, 0.22), color: BOX }]), position: [BOX_SIDE, 0.1 * SCALE, BOX_AHEAD], scale: SCALE },
        { geometry: rodRestShape(ROD_BUTT_Y), position: [0, 0, BUTT_AHEAD] },
        { geometry: rodRestShape(ROD_BUTT_Y + FRONT_REST * Math.tan(ROD_LIFT)), position: [0, 0, BUTT_AHEAD + FRONT_REST] },
        { geometry: nightRodShape(), position: [0, ROD_BUTT_Y, BUTT_AHEAD], rotation: [-ROD_LIFT, 0, 0] },
      ]),
      head: nightHeadShape(),
      beam: beamGeometry(),
      stick: new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6),
      lamp: new THREE.SphereGeometry(0.02, 6, 4),
    }),
    [],
  );
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const fade = useMemo(() => beamFade(), []);
  const lights = useMemo(
    () => ({
      beam: new THREE.MeshBasicMaterial({ map: fade, color: "#fff1c4", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      lamp: new THREE.MeshBasicMaterial({ color: LAMP, toneMapped: false }),
      lampGlow: new THREE.SpriteMaterial({ map: spot, color: LAMP, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      stick: new THREE.MeshBasicMaterial({ color: STICK, toneMapped: false }),
      stickGlow: new THREE.SpriteMaterial({ map: spot, color: STICK, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [spot, fade],
  );
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINE_POINTS * 3), 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#9c9a92", transparent: true, opacity: 0.6 }));
  }, []);
  useEffect(
    () => () => {
      [...Object.values(shapes), material, spot, fade, ...Object.values(lights), line.geometry, line.material as THREE.Material].forEach((item) => item.dispose());
    },
    [shapes, material, spot, fade, lights, line],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const look = headlampLook(time, still);
    if (head.current) {
      head.current.rotation.y = look.yaw;
      head.current.rotation.x = -look.pitch;
    }
    const glow = floatGlow(time, still);
    lights.stickGlow.opacity = 0.9 * glow;
    const y = waterHeight(FLOAT_AT.x, FLOAT_AT.z, still ? 0 : time);
    bob.current?.position.set(FLOAT_AT.x, y, FLOAT_AT.z);
    const points = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    const span = Math.hypot(FLOAT_AT.x - ROD_TIP.x, FLOAT_AT.z - ROD_TIP.z);
    for (let i = 0; i < LINE_POINTS; i += 1) {
      const s = i / (LINE_POINTS - 1);
      points.setXYZ(i, ROD_TIP.x + (FLOAT_AT.x - ROD_TIP.x) * s, ROD_TIP.y + (y - ROD_TIP.y) * s - 0.06 * span * Math.sin(Math.PI * s), ROD_TIP.z + (FLOAT_AT.z - ROD_TIP.z) * s);
    }
    points.needsUpdate = true;
  });
  return (
    <group name="night-angler">
      <group position={[SEAT_AT.x, 0, SEAT_AT.z]} rotation={[0, SEAT_YAW, 0]}>
        <mesh geometry={shapes.rig} material={material} />
        <group scale={SCALE}>
          <group position={[0, SEAT_Y, -0.02]}>
            <group ref={head} position={[0, NECK_Y, 0]} rotation-order="YXZ">
              <mesh geometry={shapes.head} material={material} />
              <group position={LAMP_AT}>
                <mesh geometry={shapes.lamp} material={lights.lamp} />
                <sprite material={lights.lampGlow} scale={0.35} />
                <mesh geometry={shapes.beam} material={lights.beam} renderOrder={6} />
              </group>
            </group>
          </group>
        </group>
      </group>
      <group ref={bob}>
        <mesh geometry={shapes.stick} material={lights.stick} position={[0, 0.04, 0]} />
        <sprite material={lights.stickGlow} scale={0.8} position={[0, 0.06, 0]} />
      </group>
      <primitive object={line} frustumCulled={false} />
    </group>
  );
}
