import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOCK_PLANKS } from "@stillwater/shared";
import { settings } from "../settings";
import { DOCK_DROPS, dockDrop } from "./dockWet";
import { useReducedMotion } from "./reducedMotion";

const SHEEN_COLOR = "#b9cad8";
const SPLASH_COLOR = "#e2eff3";
const SHEEN_PEAK = 0.12;
/** The sky's glare on the soaked boards: a soft strip down the pier, off to one side. */
const SHEEN_WIDTH = 0.32;
const SHEEN_X = 0.3;

/** A wet sheen down the pier planks and raindrops splashing on them; `light` dims both at night. */
export function DockRain({ light }: { light: number }) {
  const still = useReducedMotion();
  const splashes = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const sheenGeo = useMemo(() => new THREE.PlaneGeometry(SHEEN_WIDTH, DOCK_PLANKS.maxZ - DOCK_PLANKS.minZ - 0.3), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.7, 1, 16), []);
  const sheenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SHEEN_COLOR, transparent: true, opacity: SHEEN_PEAK, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
    [],
  );
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SPLASH_COLOR, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    [],
  );
  useEffect(() => {
    sheenMat.color.set(SHEEN_COLOR).multiplyScalar(light);
    ringMat.color.set(SPLASH_COLOR).multiplyScalar(light);
  }, [light, sheenMat, ringMat]);
  useEffect(
    () => () => {
      sheenGeo.dispose();
      ringGeo.dispose();
      sheenMat.dispose();
      ringMat.dispose();
    },
    [sheenGeo, ringGeo, sheenMat, ringMat],
  );
  useFrame((state) => {
    const mesh = splashes.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    // The sheen breathes a little as gusts wet the boards afresh.
    sheenMat.opacity = still ? SHEEN_PEAK : SHEEN_PEAK * (0.8 + Math.sin(t * 0.7) * 0.2);
    if (still) {
      mesh.count = 0;
      return;
    }
    const stride = settings.particles === "lite" ? 2 : 1;
    let slot = 0;
    for (let i = 0; i < DOCK_DROPS; i += stride) {
      const drop = dockDrop(i, t);
      if (drop.age < 0) continue;
      scratch.position.set(drop.x, DOCK_PLANKS.top + 0.012, drop.z);
      scratch.rotation.set(-Math.PI / 2, 0, 0);
      scratch.scale.setScalar(0.03 + drop.age * 0.09);
      scratch.updateMatrix();
      mesh.setMatrixAt(slot++, scratch.matrix);
    }
    mesh.count = slot;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <mesh
        geometry={sheenGeo}
        material={sheenMat}
        position={[SHEEN_X, DOCK_PLANKS.top + 0.006, (DOCK_PLANKS.minZ + DOCK_PLANKS.maxZ) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      />
      <instancedMesh ref={splashes} args={[ringGeo, ringMat, DOCK_DROPS]} frustumCulled={false} renderOrder={4} />
    </>
  );
}
