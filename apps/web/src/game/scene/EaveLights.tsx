import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { CABIN_AT, CABIN_SCALE, CABIN_YAW } from "./cabinLook";
import { BULB_COLORS, BULB_COUNT, bulbAt, bulbGlow, wireAt } from "./festiveBulbs";
import { useReducedMotion } from "./reducedMotion";

const WIRE = "#1e2a22";
/** The glow round each bulb, in world metres. */
const GLOW_SIZE = 1;

/** Coloured bulbs strung along the far cabin's front eave on winter evenings (festiveBulbs.ts). */
export function EaveLights() {
  const still = useReducedMotion();
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const colors = useMemo(() => BULB_COLORS.map((c) => new THREE.Color(c)), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.12), []);
  const parts = useMemo(() => {
    const wire = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 81 }, (_, k) => {
      const p = wireAt(k / 80);
      return new THREE.Vector3(p.x, p.y, p.z);
    }));
    const glow = new THREE.BufferGeometry();
    glow.setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: BULB_COUNT }, (_, i) => bulbAt(i)).flatMap((b) => [b.x, b.y, b.z]), 3));
    glow.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(BULB_COUNT * 3), 3));
    return { wire, glow, bulb: new THREE.SphereGeometry(0.03, 6, 4) };
  }, []);
  const materials = useMemo(
    () => ({
      wire: new THREE.LineBasicMaterial({ color: WIRE }),
      bulb: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
      glow: new THREE.PointsMaterial({ map: spot, size: GLOW_SIZE, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [spot],
  );
  const wire = useMemo(() => new THREE.Line(parts.wire, materials.wire), [parts, materials]);
  useEffect(() => {
    const mesh = bulbs.current;
    if (!mesh) return;
    const at = new THREE.Matrix4();
    for (let i = 0; i < BULB_COUNT; i++) {
      const b = bulbAt(i);
      mesh.setMatrixAt(i, at.makeTranslation(b.x, b.y, b.z));
      mesh.setColorAt(i, colors[b.color]);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [colors]);
  useEffect(
    () => () => {
      [...Object.values(parts), ...Object.values(materials), spot].forEach((item) => item.dispose());
    },
    [parts, materials, spot],
  );
  const lit = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const mesh = bulbs.current;
    const glow = parts.glow.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < BULB_COUNT; i++) {
      const c = bulbAt(i).color;
      const level = bulbGlow(c, time, still);
      lit.copy(colors[c]).multiplyScalar(0.35 + 0.65 * level);
      mesh?.setColorAt(i, lit);
      // The glow fades further than the bulb itself, so a dimmed bulb still shows its colour.
      glow.setXYZ(i, colors[c].r * level * level, colors[c].g * level * level, colors[c].b * level * level);
    }
    if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    glow.needsUpdate = true;
  });
  return (
    <group name="eave-lights" position={[CABIN_AT.x, 0, CABIN_AT.z]} rotation={[0, CABIN_YAW, 0]} scale={CABIN_SCALE}>
      <primitive object={wire} />
      <instancedMesh ref={bulbs} args={[parts.bulb, materials.bulb, BULB_COUNT]} />
      <points geometry={parts.glow} material={materials.glow} />
    </group>
  );
}
