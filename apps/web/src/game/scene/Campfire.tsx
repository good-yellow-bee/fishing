import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeSoftSpotTexture } from "./Atmosphere";
import { FIRE_AT, PUFF_COUNT, flicker, smokePuff } from "./campfireSmoke";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const NO_WIND = { x: 0, z: 0 };
const STONES = 9;
const RING = 0.34;
/** The smoke's grey by hour: pale in the dawn light, dim against the dark. */
const SMOKE_COLOR = { dawn: "#c9c6c0", day: "#d8d6d0", dusk: "#8d8782", night: "#6a6662" } as const;

/**
 * Smoke puffs fade one by one, so each instance carries its own opacity, which a basic material
 * cannot; this one reads it from a per-instance attribute.
 */
function smokeMaterial(map: THREE.Texture) {
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float puffAlpha;\nvarying float vPuffAlpha;\n${shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvPuffAlpha = puffAlpha;",
    )}`;
    shader.fragmentShader = `varying float vPuffAlpha;\n${shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.a *= vPuffAlpha;",
    )}`;
  };
  material.customProgramCacheKey = () => "campfire-smoke";
  return material;
}

/**
 * The fire pit by the shack: a ring of stones round a few charred sticks, always there, and from
 * dusk to dawn (`lit`) a flickering fire whose smoke rises and leans away on the day's wind.
 */
export function Campfire({ lit, hour, wind = NO_WIND }: { lit: boolean; hour: keyof typeof SMOKE_COLOR; wind?: { x: number; z: number } }) {
  const still = useReducedMotion();
  const flames = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const puffs = useRef<THREE.InstancedMesh>(null);
  const stone = useMemo(() => new THREE.MeshToonMaterial({ color: "#8a8780", gradientMap: toonRamp() }), []);
  const wood = useMemo(() => new THREE.MeshToonMaterial({ color: "#3b2c22", gradientMap: toonRamp() }), []);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff9a3c", toneMapped: false, transparent: true, opacity: 0.92 }), []);
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffe08a", toneMapped: false }), []);
  const spot = useMemo(() => makeSoftSpotTexture(0.1), []);
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: spot,
        color: "#ff9a4a",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [spot],
  );
  const puffSpot = useMemo(() => makeSoftSpotTexture(0.6), []);
  const smoke = useMemo(() => smokeMaterial(puffSpot), [puffSpot]);
  const puffGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute("puffAlpha", new THREE.InstancedBufferAttribute(new Float32Array(PUFF_COUNT), 1));
    return geometry;
  }, []);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  useEffect(
    () => () => {
      [stone, wood, flame, core, spot, puffSpot, glowMaterial, smoke, puffGeometry].forEach((item) => item.dispose());
    },
    [stone, wood, flame, core, spot, puffSpot, glowMaterial, smoke, puffGeometry],
  );
  useEffect(() => {
    smoke.color.set(SMOKE_COLOR[hour]);
  }, [smoke, hour]);

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    const burn = flicker(time, still);
    flames.current?.scale.set(1.3, 1.3 * burn * (0.9 + 0.1 * Math.sin(time * 17)), 1.3);
    glow.current?.scale.setScalar(2.4 * burn);
    glowMaterial.opacity = (hour === "night" ? 0.7 : 0.45) * burn;
    const mesh = puffs.current;
    if (!mesh) return;
    const alpha = mesh.geometry.getAttribute("puffAlpha") as THREE.InstancedBufferAttribute;
    for (let i = 0; i < PUFF_COUNT; i += 1) {
      const puff = smokePuff(i, time, wind);
      scratch.position.set(puff.x - FIRE_AT.x, puff.y, puff.z - FIRE_AT.z);
      scratch.quaternion.copy(camera.quaternion);
      scratch.scale.setScalar(puff.size);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
      alpha.setX(i, puff.alpha);
    }
    mesh.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = true;
  });

  return (
    <group name="campfire" position={[FIRE_AT.x, 0, FIRE_AT.z]}>
      {Array.from({ length: STONES }, (_, i) => {
        const a = (i / STONES) * Math.PI * 2;
        return (
          <mesh key={i} material={stone} position={[Math.cos(a) * RING, 0.05, Math.sin(a) * RING]} rotation={[i, i * 1.7, 0]} scale={[1, 0.7, 1]}>
            <dodecahedronGeometry args={[0.09 + (i % 3) * 0.015, 0]} />
          </mesh>
        );
      })}
      {[0, 1.1, 2.2].map((yaw) => (
        <mesh key={yaw} material={wood} position={[0, 0.06, 0]} rotation={[0, yaw, Math.PI / 2 - 0.2]}>
          <cylinderGeometry args={[0.035, 0.04, 0.62, 6]} />
        </mesh>
      ))}
      {lit && (
        <>
          <group ref={flames} position={[0, 0.06, 0]} scale={1.3}>
            <mesh material={flame} position={[0, 0.17, 0]}>
              <coneGeometry args={[0.15, 0.36, 7]} />
            </mesh>
            {[0, 2.1, 4.2].map((a) => (
              <mesh key={a} material={flame} position={[Math.cos(a) * 0.08, 0.11, Math.sin(a) * 0.08]}>
                <coneGeometry args={[0.07, 0.22, 6]} />
              </mesh>
            ))}
            <mesh material={core} position={[0, 0.1, 0]}>
              <coneGeometry args={[0.07, 0.18, 6]} />
            </mesh>
          </group>
          <mesh ref={glow} material={glowMaterial} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <instancedMesh ref={puffs} args={[puffGeometry, smoke, PUFF_COUNT]} frustumCulled={false} renderOrder={6} />
        </>
      )}
    </group>
  );
}
