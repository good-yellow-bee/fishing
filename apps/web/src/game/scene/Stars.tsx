import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { useReducedMotion } from "./reducedMotion";
import { STAR_COUNT, shootingStar, skyPointReflection, starAt, starReflection, type Star } from "./starField";
import { waterHeight } from "./water";

const STAR_COLOR = new THREE.Color("#eef2ff");
/** Reflections are this much fainter than the stars, and shimmer with the chop. */
const REFLECTION_DIM = 0.5;
/** Below the lake bed: where a reflection that lands off the water hides. */
const HIDDEN_Y = -50;

/** Share of the crossing the bright tail trails behind the head. */
const TAIL = 0.3;
/** The mirrored streak is a ribbon on the water, this wide, since a line is a hair from the dock. */
const MIRROR_STREAK_WIDTH = 0.22;
const MIRROR_STREAK_DIM = 0.75;

/** A clear night's stars, drawn as fixed-size dots so they stay pin points at any distance, their shimmer in the lake, and now and then a shooting star. */
export function Stars({ opacity }: { opacity: number }) {
  // No shooting stars under the phone's or computer's reduce motion setting, as under the game's.
  const still = useReducedMotion();
  const stars = useMemo<Star[]>(() => Array.from({ length: STAR_COUNT }, (_, i) => starAt(i)), []);
  const mirror = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STAR_COUNT * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(STAR_COUNT * 3), 3));
    return geo;
  }, []);
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const star = stars[i]!;
      positions.set([star.x, star.y, star.z], i * 3);
      colors.set([STAR_COLOR.r * star.brightness, STAR_COLOR.g * star.brightness, STAR_COLOR.b * star.brightness], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [stars]);
  const material = useMemo(
    () => new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }),
    [],
  );
  const streak = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    // Tail black, head white: added onto the sky, the tail fades into it.
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 1]), 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    return line;
  }, []);
  const mirrorStreak = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]), 3));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.renderOrder = 3;
    return mesh;
  }, []);
  useEffect(
    () => () => {
      mirrorStreak.geometry.dispose();
      (mirrorStreak.material as THREE.Material).dispose();
      geometry.dispose();
      mirror.dispose();
      material.dispose();
      streak.geometry.dispose();
      (streak.material as THREE.Material).dispose();
    },
    [geometry, mirror, material, streak, mirrorStreak],
  );

  useFrame((state) => {
    material.opacity = opacity;
    const count = settings.particles === "lite" ? STAR_COUNT / 2 : STAR_COUNT;
    geometry.setDrawRange(0, count);
    mirror.setDrawRange(0, count);
    const t = state.clock.elapsedTime;
    const eye = state.camera.position;
    const spot = mirror.getAttribute("position") as THREE.BufferAttribute;
    const tint = mirror.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < count; i += 1) {
      const star = stars[i]!;
      const at = starReflection(star, eye);
      if (!at) {
        spot.setXYZ(i, 0, HIDDEN_Y, 0);
        continue;
      }
      spot.setXYZ(i, at.x, waterHeight(at.x, at.z, t) + 0.03, at.z);
      const shimmer = REFLECTION_DIM * star.brightness * (0.55 + 0.45 * Math.sin(t * 2.3 + i * 1.7));
      tint.setXYZ(i, STAR_COLOR.r * shimmer, STAR_COLOR.g * shimmer, STAR_COLOR.b * shimmer);
    }
    spot.needsUpdate = true;
    tint.needsUpdate = true;
    const shot = still ? null : shootingStar(t);
    streak.visible = shot !== null;
    mirrorStreak.visible = false;
    if (!shot) return;
    const head = Math.min(1, shot.progress * 1.15);
    const tail = Math.max(0, head - TAIL);
    const at = (u: number, axis: 0 | 1 | 2) => shot.from[axis] + (shot.to[axis] - shot.from[axis]) * u;
    const position = streak.geometry.getAttribute("position") as THREE.BufferAttribute;
    position.setXYZ(0, at(tail, 0), at(tail, 1), at(tail, 2));
    position.setXYZ(1, at(head, 0), at(head, 1), at(head, 2));
    position.needsUpdate = true;
    // Bright in the middle of its run, gone at both ends.
    (streak.material as THREE.LineBasicMaterial).opacity = opacity * Math.sin(Math.PI * shot.progress);
    // The dock looks down at the lake, not up at the sky, so the streak also crosses the mirror.
    const tailAt = skyPointReflection([at(tail, 0), at(tail, 1), at(tail, 2)], eye);
    const headAt = skyPointReflection([at(head, 0), at(head, 1), at(head, 2)], eye);
    if (!tailAt || !headAt) return;
    const dx = headAt.x - tailAt.x;
    const dz = headAt.z - tailAt.z;
    const len = Math.hypot(dx, dz) || 1;
    const sx = (-dz / len) * (MIRROR_STREAK_WIDTH / 2);
    const sz = (dx / len) * (MIRROR_STREAK_WIDTH / 2);
    const tailY = waterHeight(tailAt.x, tailAt.z, t) + 0.04;
    const headY = waterHeight(headAt.x, headAt.z, t) + 0.04;
    const ribbon = mirrorStreak.geometry.getAttribute("position") as THREE.BufferAttribute;
    ribbon.setXYZ(0, tailAt.x - sx, tailY, tailAt.z - sz);
    ribbon.setXYZ(1, tailAt.x + sx, tailY, tailAt.z + sz);
    ribbon.setXYZ(2, headAt.x - sx, headY, headAt.z - sz);
    ribbon.setXYZ(3, headAt.x + sx, headY, headAt.z + sz);
    ribbon.needsUpdate = true;
    (mirrorStreak.material as THREE.MeshBasicMaterial).opacity = MIRROR_STREAK_DIM * opacity * Math.sin(Math.PI * shot.progress);
    mirrorStreak.visible = true;
  });

  return (
    <>
      <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
      <points geometry={mirror} material={material} frustumCulled={false} renderOrder={3} />
      <primitive object={streak} />
      <primitive object={mirrorStreak} />
    </>
  );
}
