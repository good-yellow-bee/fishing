import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from "../settings";
import { BUTTERFLY_COLORS, BUTTERFLY_HOMES, butterflyAt } from "./butterflyFlit";
import { useReducedMotion } from "./reducedMotion";

/** Drawn larger than life, so a fluttering one reads from the dock. */
const SCALE = 4.5;
/** A wing's lift at the top of the beat, radians from flat. */
const BEAT = 1.25;

/** One rounded wing, 5 cm long, lying flat on the +x side of its hinge. */
function wingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.004);
  shape.bezierCurveTo(0.02, 0.035, 0.05, 0.03, 0.045, 0.008);
  shape.bezierCurveTo(0.05, -0.012, 0.03, -0.035, 0, -0.012);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 6);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** A few butterflies fluttering over the lily pads and the water by the dock on sunny summer days. */
export function Butterflies() {
  const still = useReducedMotion();
  const wing = useMemo(wingGeometry, []);
  const materials = useMemo(
    () => BUTTERFLY_COLORS.map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })),
    [],
  );
  const bodies = useRef<(THREE.Group | null)[]>([]);
  const lefts = useRef<(THREE.Mesh | null)[]>([]);
  const rights = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(
    () => () => {
      wing.dispose();
      materials.forEach((m) => m.dispose());
    },
    [wing, materials],
  );

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    const count = settings.particles === "lite" ? BUTTERFLY_HOMES.length / 2 : BUTTERFLY_HOMES.length;
    BUTTERFLY_HOMES.forEach((_, i) => {
      const body = bodies.current[i];
      if (!body) return;
      body.visible = i < count;
      const b = butterflyAt(i, t);
      body.position.set(b.x, b.y, b.z);
      body.rotation.y = b.yaw;
      const lift = still ? 0.4 : b.flap * BEAT;
      lefts.current[i]?.rotation.set(0, 0, -lift);
      rights.current[i]?.rotation.set(0, 0, lift);
    });
  });

  return (
    <group name="butterflies">
      {BUTTERFLY_HOMES.map((_, i) => {
        const material = materials[i % materials.length]!;
        return (
          <group key={i} ref={(g) => void (bodies.current[i] = g)} scale={SCALE}>
            <mesh ref={(m) => void (rights.current[i] = m)} geometry={wing} material={material} />
            <mesh ref={(m) => void (lefts.current[i] = m)} geometry={wing} material={material} scale={[-1, 1, 1]} />
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.003, 0.02, 2, 4]} />
              <meshBasicMaterial color="#2a2018" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
