import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WEB_CENTER, webDew, webThreads } from "./orbWeb";
import { useReducedMotion } from "./reducedMotion";

const THREAD_COLOR = "#dfe6ea";
const DEW_COLOR = "#ffffff";

/** A small orb web in the dock's front corner, its threads beaded with dew that glints in the dawn light. */
export function DewWeb() {
  const still = useReducedMotion();
  const threads = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(webThreads().flatMap(([x, y]) => [x, y, 0]), 3));
    return geo;
  }, []);
  const dew = useMemo(() => {
    const beads = webDew();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(beads.flatMap(([x, y]) => [x, y, 0.002]), 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(beads.flatMap(() => [1, 1, 1]), 3));
    return geo;
  }, []);
  const threadMat = useMemo(() => new THREE.LineBasicMaterial({ color: THREAD_COLOR, transparent: true, opacity: 0.5, depthWrite: false }), []);
  const dewMat = useMemo(
    () => new THREE.PointsMaterial({ color: DEW_COLOR, size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      threads.dispose();
      dew.dispose();
      threadMat.dispose();
      dewMat.dispose();
    },
    [threads, dew, threadMat, dewMat],
  );
  useFrame((state) => {
    if (still) return;
    // Each bead catches the light in turn as the web sways a hair.
    const t = state.clock.elapsedTime;
    const tint = dew.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < tint.count; i++) {
      const glint = 0.45 + 0.55 * Math.max(0, Math.sin(t * 1.3 + i * 2.1));
      tint.setXYZ(i, glint, glint, glint);
    }
    tint.needsUpdate = true;
  });
  return (
    <group position={[WEB_CENTER.x, WEB_CENTER.y, WEB_CENTER.z]}>
      <lineSegments geometry={threads} material={threadMat} />
      <points geometry={dew} material={dewMat} />
    </group>
  );
}
