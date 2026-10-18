import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WHITECAP_MAX, whitecapAt } from "./whitecapLife";
import { useReducedMotion } from "./reducedMotion";
import { waterHeight } from "./water";

/** A broken crest: a bright curl along the front and a scatter of foam behind it. */
function crestTexture() {
  const w = 64;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = "blur(1px)";
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, 12);
  ctx.quadraticCurveTo(w / 2, 4, w - 6, 12);
  ctx.stroke();
  for (let i = 0; i < 26; i += 1) {
    const x = 8 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * (w - 16);
    const y = 13 + ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1 * (h - 18);
    ctx.fillStyle = `rgba(255,255,255,${0.35 + (i % 4) * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * White crests breaking out on the open lake on breezy and strong days, in one draw; motion lives in
 * whitecapLife.ts. `light` dims them after dark. Reduced motion holds them out of sight.
 */
export function Whitecaps({ wind, light }: { wind: { x: number; z: number }; light: number }) {
  const still = useReducedMotion();
  const geometry = useMemo(() => new THREE.PlaneGeometry(2.4, 1.1).rotateX(-Math.PI / 2), []);
  const texture = useMemo(crestTexture, []);
  // Additive, so each cap's instance colour is its brightness and it fades without a material each.
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    [texture],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const work = useMemo(() => ({ helper: new THREE.Object3D(), color: new THREE.Color() }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
    [geometry, texture, material],
  );
  useFrame(({ clock }) => {
    const caps = mesh.current;
    if (!caps) return;
    const time = clock.elapsedTime;
    let shown = 0;
    for (let i = 0; i < WHITECAP_MAX && !still; i += 1) {
      const cap = whitecapAt(i, time, wind);
      if (!cap) continue;
      work.helper.position.set(cap.x, waterHeight(cap.x, cap.z, time) + 0.06, cap.z);
      work.helper.rotation.set(0, cap.yaw, 0);
      work.helper.scale.setScalar(cap.scale);
      work.helper.updateMatrix();
      caps.setMatrixAt(shown, work.helper.matrix);
      caps.setColorAt(shown, work.color.setScalar(cap.alpha * light));
      shown += 1;
    }
    caps.count = shown;
    caps.instanceMatrix.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, WHITECAP_MAX]} frustumCulled={false} renderOrder={2} />;
}
