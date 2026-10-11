import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRACK_LIMIT, type LodgeTrack } from "@stillwater/shared";
import { TRACK_RING_MAX, trackAnchor, trackOpacity, trackPulse } from "./shoreTracks";
import { waterHeight } from "./water";

const RING_COLOR = new THREE.Color("#f3e6cc");
const LIFT = 0.06;

/**
 * Faint rings where other anglers landed fish in the last hour. Additive blending lets each ring fade by
 * darkening its instance colour, so one material serves every track.
 */
export function ShoreTracks({ tracks }: { tracks: readonly LodgeTrack[] }) {
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.RingGeometry(0.86, 1, 32), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const placed = useMemo(
    () => tracks.slice(0, TRACK_LIMIT).map((track) => ({ track, at: trackAnchor(track), born: Date.parse(track.createdAt) })),
    [tracks],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const mesh = rings.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    const now = Date.now();
    for (let i = 0; i < TRACK_LIMIT; i += 1) {
      const entry = placed[i];
      const strength = entry ? trackOpacity(now - entry.born) : 0;
      const u = entry ? trackPulse(entry.track.id, time) : 0;
      const size = strength > 0 ? 0.15 + u * TRACK_RING_MAX : 0;
      scratch.position.set(entry?.at.x ?? 0, entry ? waterHeight(entry.at.x, entry.at.z, time) + LIFT : -40, entry?.at.z ?? 0);
      scratch.rotation.set(-Math.PI / 2, 0, 0);
      scratch.scale.set(size, size, 1);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
      mesh.setColorAt(i, tint.copy(RING_COLOR).multiplyScalar(strength * (1 - u)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={rings} name="shore-tracks" args={[geometry, material, TRACK_LIMIT]} frustumCulled={false} renderOrder={4} />;
}
