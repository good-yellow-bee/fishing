import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Hotspot } from "../hotspot";
import type { WeatherLook } from "./LakeWorld";
import { HOTSPOT_BUBBLES, bubbleColor, hotspotBubble } from "./hotspotBubbles";

/** Beads and thin rings on the chop. Fog still applies, so a foggy lake hides far bubbles like everything else. */
export function BubblingHotspot({ hotspot, weather }: { hotspot: Hotspot; weather: WeatherLook }) {
  const beads = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const beadGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.8, 1, 24), []);
  const beadMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }),
    [],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    const color = bubbleColor(weather);
    beadMat.color.set(color);
    ringMat.color.set(color);
  }, [weather, beadMat, ringMat]);

  useEffect(
    () => () => {
      beadGeo.dispose();
      ringGeo.dispose();
      beadMat.dispose();
      ringMat.dispose();
    },
    [beadGeo, ringGeo, beadMat, ringMat],
  );

  useFrame(({ clock }) => {
    const bead = beads.current;
    const ring = rings.current;
    if (!bead || !ring) return;
    const time = clock.elapsedTime;
    for (let i = 0; i < HOTSPOT_BUBBLES; i += 1) {
      const bubble = hotspotBubble(hotspot, i, time);
      scratch.position.set(bubble?.x ?? 0, bubble?.y ?? -40, bubble?.z ?? 0);
      scratch.rotation.set(0, 0, 0);
      scratch.scale.setScalar(bubble?.kind === "bead" ? bubble.size : 0);
      scratch.updateMatrix();
      bead.setMatrixAt(i, scratch.matrix);

      scratch.rotation.set(-Math.PI / 2, 0, 0);
      const ringSize = bubble?.kind === "ring" ? bubble.size : 0;
      scratch.scale.set(ringSize, ringSize, 1);
      scratch.updateMatrix();
      ring.setMatrixAt(i, scratch.matrix);
    }
    bead.instanceMatrix.needsUpdate = true;
    ring.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="bubbling-hotspot">
      <instancedMesh ref={beads} args={[beadGeo, beadMat, HOTSPOT_BUBBLES]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={rings} args={[ringGeo, ringMat, HOTSPOT_BUBBLES]} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
