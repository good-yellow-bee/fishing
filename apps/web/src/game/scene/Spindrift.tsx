import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { WISPS, driftSide, spindriftStrength, wispAt } from "./blowingSnow";
import { useReducedMotion } from "./reducedMotion";

const SNOW = "#f4f8fb";
/** How solid the thickest part of a wisp is in a full gale. */
const OPACITY = 0.85;

/** A wisp of blown snow: a long, thin, soft streak, densest a little behind its leading end. */
function wispTexture() {
  const w = 128;
  const h = 16;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const along = ctx.createLinearGradient(0, 0, w, 0);
  along.addColorStop(0, "rgba(255,255,255,0)");
  along.addColorStop(0.65, "rgba(255,255,255,0.9)");
  along.addColorStop(0.85, "rgba(255,255,255,1)");
  along.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, w, h);
  const across = ctx.createLinearGradient(0, 0, 0, h);
  across.addColorStop(0, "rgba(0,0,0,1)");
  across.addColorStop(0.5, "rgba(0,0,0,0)");
  across.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(canvas);
}

/** Snow lifted by the wind and streamed along the far hills and the far shore on blowy winter days (blowingSnow.ts). */
export function Spindrift({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useMemo(wispTexture, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, color: SNOW, transparent: true, depthWrite: false, side: THREE.DoubleSide }), [texture]);
  useEffect(() => {
    material.opacity = OPACITY * spindriftStrength(wind);
  }, [material, wind]);
  useEffect(
    () => () => {
      [geometry, texture, material].forEach((item) => item.dispose());
    },
    [geometry, texture, material],
  );
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const wisps = mesh.current;
    if (!wisps) return;
    const stride = settings.particles === "lite" ? 2 : 1;
    // The texture's dense end leads, so a wisp blowing west is turned round.
    const side = driftSide(wind);
    let slot = 0;
    for (let i = 0; i < WISPS; i += stride) {
      const wisp = wispAt(i, clock.elapsedTime, wind, still);
      if (!wisp || wisp.thick <= 0.01) continue;
      scratch.position.set(wisp.x, wisp.y, wisp.z);
      scratch.rotation.set(0, side === 1 ? 0 : Math.PI, 0);
      scratch.scale.set(wisp.length, wisp.thick, 1);
      scratch.updateMatrix();
      wisps.setMatrixAt(slot++, scratch.matrix);
    }
    wisps.count = slot;
    wisps.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, WISPS]} frustumCulled={false} renderOrder={2} name="spindrift" />;
}
