import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Hotspot } from "../hotspot";
import type { WeatherLook } from "./LakeWorld";
import { BAITFISH, baitfish, frenzyAmount } from "./frenzyBoil";
import { HOTSPOT_BUBBLES, bubbleColor, hotspotBubble } from "./hotspotBubbles";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";

const BAITFISH_SILVER = "#c8d4d8";

/**
 * Beads and thin rings on the chop. Fog still applies, so a foggy lake hides far bubbles like everything else.
 * In a feeding frenzy the patch boils, with baitfish leaping out of it (frenzyBoil.ts).
 */
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

  const fish = useRef<THREE.InstancedMesh>(null);
  const splashes = useRef<THREE.InstancedMesh>(null);
  const fishGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 5), []);
  const fishMat = useMemo(() => new THREE.MeshToonMaterial({ color: BAITFISH_SILVER, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      fishGeo.dispose();
      fishMat.dispose();
    },
    [fishGeo, fishMat],
  );
  const still = useReducedMotion();
  const boilClock = useRef(0);

  useFrame(({ clock }, delta) => {
    const bead = beads.current;
    const ring = rings.current;
    if (!bead || !ring) return;
    // In a feeding frenzy the bubbles come twice as fast; the boil builds and dies away.
    const boil = frenzyAmount(Date.now());
    boilClock.current += delta * (1 + (still ? 0 : boil));
    const time = clock.elapsedTime;
    for (let i = 0; i < HOTSPOT_BUBBLES; i += 1) {
      const bubble = hotspotBubble(hotspot, i, time, boilClock.current);
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

    // Baitfish skittering out of the water and splashing back: none at all outside a frenzy.
    const leaping = fish.current;
    const splashing = splashes.current;
    if (!leaping || !splashing) return;
    leaping.visible = splashing.visible = boil > 0 && !still;
    if (!leaping.visible) return;
    for (let i = 0; i < BAITFISH; i += 1) {
      const { leap, splash } = baitfish(hotspot, i, time, boil);
      scratch.position.set(leap?.x ?? 0, leap?.y ?? -40, leap?.z ?? 0);
      scratch.rotation.set(leap?.pitch ?? 0, leap?.yaw ?? 0, 0, "YXZ");
      scratch.scale.set(leap ? 0.027 : 0, leap ? 0.021 : 0, leap ? 0.09 : 0);
      scratch.updateMatrix();
      leaping.setMatrixAt(i, scratch.matrix);
      scratch.position.set(splash?.x ?? 0, splash?.y ?? -40, splash?.z ?? 0);
      scratch.rotation.set(-Math.PI / 2, 0, 0);
      const size = splash ? splash.size * splash.fade ** 0.3 : 0;
      scratch.scale.set(size, size, 1);
      scratch.updateMatrix();
      splashing.setMatrixAt(i, scratch.matrix);
    }
    leaping.instanceMatrix.needsUpdate = true;
    splashing.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="bubbling-hotspot">
      <instancedMesh ref={beads} args={[beadGeo, beadMat, HOTSPOT_BUBBLES]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={rings} args={[ringGeo, ringMat, HOTSPOT_BUBBLES]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={fish} args={[fishGeo, fishMat, BAITFISH]} frustumCulled={false} visible={false} />
      <instancedMesh ref={splashes} args={[ringGeo, ringMat, BAITFISH]} frustumCulled={false} renderOrder={4} visible={false} />
    </group>
  );
}
