import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LakeHour, LakeSeason } from "@stillwater/shared";
import { MIRROR_PX, MIRROR_PY, MIRROR_SPAN_X, hillMirror, mirrorCanvasPoint, mirrorStale, treeMirror, type MirrorBlob } from "./mirrorImage";
import { seasonPlantColor } from "./seasonLook";

type Vec3 = [number, number, number];
export type MirrorTree = { position: Vec3; scale: number; variant: number };
export type MirrorHill = { position: Vec3; scale: Vec3; color: string };

/** The models' summer leaf colour, which the season turns. */
const LEAF = new THREE.Color("#5fae86");
const TRUNK = "#5a4632";
/** A mirror image is darker than what it shows, and darker again once the sun is low or gone. */
const HOUR_SHADE: Record<LakeHour, number> = { dawn: 0.75, day: 0.8, dusk: 0.65, night: 0.3 };
/** Meters from the eye over which the mirror fades in. */
const MIRROR_FADE = 17;
/** Every few pixel rows the chop breaks the image into bands. */
const RIPPLE_GAP = 3;

function blob(ctx: CanvasRenderingContext2D, shape: MirrorBlob, color: string) {
  const at = mirrorCanvasPoint(shape.x, shape.z);
  const sx = MIRROR_PX / MIRROR_SPAN_X;
  ctx.save();
  ctx.translate(at.px, at.py);
  // The canvas runs z down, so the world's angle reads the same here.
  ctx.rotate(shape.angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(1, shape.along * sx), Math.max(1, shape.across * sx), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Paints the bank's mirror image as the eye sees it: hills first, then trunks and crowns, then the chop's breaks. */
function paintMirror(ctx: CanvasRenderingContext2D, eye: THREE.Vector3, trees: readonly MirrorTree[], hills: readonly MirrorHill[], season: LakeSeason) {
  ctx.clearRect(0, 0, MIRROR_PX, MIRROR_PY);
  ctx.filter = "blur(1.5px)";
  for (const hill of hills) {
    const shape = hillMirror(hill.position, hill.scale, eye);
    if (shape) blob(ctx, shape, hill.color);
  }
  const sx = MIRROR_PX / MIRROR_SPAN_X;
  for (const tree of trees) {
    const shape = treeMirror(tree.position, tree.scale, eye);
    if (!shape) continue;
    const from = mirrorCanvasPoint(shape.trunk.from.x, shape.trunk.from.z);
    const to = mirrorCanvasPoint(shape.trunk.to.x, shape.trunk.to.z);
    ctx.strokeStyle = TRUNK;
    ctx.lineWidth = Math.max(1, shape.trunk.width * sx);
    ctx.beginPath();
    ctx.moveTo(from.px, from.py);
    ctx.lineTo(to.px, to.py);
    ctx.stroke();
    blob(ctx, shape.crown, `#${seasonPlantColor(LEAF, season, "leafy", tree.variant).getHexString()}`);
  }
  ctx.filter = "none";
  // Water underfoot is seen from above and shows the bed, not the bank: the image fades out toward the eye.
  const near = mirrorCanvasPoint(eye.x, eye.z);
  const reach = MIRROR_FADE * (MIRROR_PX / MIRROR_SPAN_X);
  const fade = ctx.createRadialGradient(near.px, near.py, 0, near.px, near.py, reach);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.35, "rgba(0,0,0,0.9)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, MIRROR_PX, MIRROR_PY);
  // Thin breaks across the image where wavelets catch the sky instead of the bank.
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let y = 0; y < MIRROR_PY; y += RIPPLE_GAP) {
    const wobble = Math.sin(y * 12.9898) * 0.5 + 0.5;
    ctx.fillRect(0, y + wobble, MIRROR_PX, 1);
  }
  ctx.globalCompositeOperation = "source-over";
}

/**
 * The far bank's trees and hills mirrored on still water, on the lake's own chop. Painted into a small
 * canvas laid over the lake, and painted again only when the eye moves to another bank.
 */
export function BankMirror({
  geometry,
  trees,
  hills,
  season,
  hour,
  strength,
}: {
  geometry: THREE.BufferGeometry;
  trees: readonly MirrorTree[];
  hills: readonly MirrorHill[];
  season: LakeSeason;
  hour: LakeHour;
  strength: number;
}) {
  const canvas = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = MIRROR_PX;
    el.height = MIRROR_PY;
    return el;
  }, []);
  const texture = useMemo(() => {
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [canvas]);
  const painted = useRef<{ x: number; y: number; z: number } | null>(null);
  useEffect(() => () => texture.dispose(), [texture]);
  // A new season repaints wherever the eye is.
  useEffect(() => {
    painted.current = null;
  }, [season, trees, hills]);

  useFrame(({ camera }) => {
    if (!mirrorStale(painted.current, camera.position)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintMirror(ctx, camera.position, trees, hills, season);
    painted.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    texture.needsUpdate = true;
  });

  const shade = useMemo(() => new THREE.Color().setScalar(HOUR_SHADE[hour]), [hour]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
      <meshBasicMaterial map={texture} color={shade} transparent opacity={strength} depthWrite={false} />
    </mesh>
  );
}
