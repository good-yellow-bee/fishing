import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DEPTH, SQUALL_RINGS, TALL, WIDTH, squallAt, squallRing } from "./rainSquall";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

const VEIL = "#b4c2cb";
const RING = "#e2eff3";
/** Sheets of the curtain, one behind another through its depth. */
const SHEETS = 3;
const FALL_SPEED = 1.6;

/** Falling streaks on a soft-sided sheet, fading out toward the top. */
function streakTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 260; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 128;
    const y = (Math.sin(i * 47.3 + 1) * 0.5 + 0.5) * 128;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * (Math.sin(i * 13.1) * 0.5 + 0.5)})`;
    ctx.fillRect(x, y, 1, 10 + (i % 7) * 3);
    // Wrap the streaks that run off the bottom, so the texture repeats seamlessly as it scrolls.
    ctx.fillRect(x, y - 128, 1, 10 + (i % 7) * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

/** A soft mask over the sheet: clear at its sides and top, full at the water. */
function veilMask() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(64, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const side = Math.sin((Math.PI * (x + 0.5)) / 64);
      const up = Math.min(1, (y + 0.5) / 40);
      const a = Math.round(255 * side * side * up);
      img.data.set([a, a, a, 255], (y * 64 + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

/** Now and then in a shower a heavier squall sweeps across the far half of the lake as a grey curtain of rain, the water boiling with rings beneath it (rainSquall.ts). `light` dims it toward night. */
export function RainCurtain({ light }: { light: number }) {
  const still = useReducedMotion();
  const veil = useRef<THREE.Group>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const textures = useMemo(() => ({ streaks: streakTexture(), mask: veilMask() }), []);
  const shapes = useMemo(() => ({ sheet: new THREE.PlaneGeometry(WIDTH, TALL).translate(0, TALL / 2, 0), ring: new THREE.RingGeometry(0.82, 1, 16) }), []);
  const materials = useMemo(
    () => ({
      sheet: new THREE.MeshBasicMaterial({ color: VEIL, map: textures.streaks, alphaMap: textures.mask, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      ring: new THREE.MeshBasicMaterial({ color: RING, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    }),
    [textures],
  );
  useEffect(() => {
    materials.sheet.color.set(VEIL).multiplyScalar(light);
    materials.ring.color.set(RING).multiplyScalar(light);
  }, [light, materials]);
  useEffect(
    () => () => {
      [...Object.values(textures), ...Object.values(shapes), ...Object.values(materials)].forEach((item) => item.dispose());
    },
    [textures, shapes, materials],
  );
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const squall = squallAt(time, still);
    const group = veil.current;
    if (group) {
      group.visible = !!squall;
      if (squall) {
        group.position.set(squall.x, 0, squall.z);
        materials.sheet.opacity = 0.8 * squall.fade;
        textures.streaks.offset.y = time * FALL_SPEED * 0.5;
      }
    }
    const water = rings.current;
    if (!water) return;
    let slot = 0;
    for (let i = 0; i < SQUALL_RINGS; i++) {
      const ring = squallRing(i, time, still);
      if (!ring) continue;
      scratch.position.set(ring.x, waterHeight(ring.x, ring.z, time) + 0.012, ring.z);
      scratch.rotation.set(-Math.PI / 2, 0, 0);
      scratch.scale.set(ring.radius, ring.radius, 1);
      scratch.updateMatrix();
      water.setMatrixAt(slot++, scratch.matrix);
    }
    water.count = slot;
    water.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="rain-squall">
      <group ref={veil} visible={false}>
        {Array.from({ length: SHEETS }, (_, i) => (
          <mesh key={i} geometry={shapes.sheet} material={materials.sheet} position={[(i - 1) * 1.3, 0, (i - 1) * (DEPTH / SHEETS)]} renderOrder={5} />
        ))}
      </group>
      <instancedMesh ref={rings} args={[shapes.ring, materials.ring, SQUALL_RINGS]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
