import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergePainted } from "./mergeParts";
import { paperBoatAt } from "./paperBoat";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

const PAPER = "#f4f1ea";
const FOLD = "#dcd6ca";
/** Drawn larger than life, so it reads from the dock camera. */
const SCALE = 2;

/** A side-on outline extruded across its width, centred, standing on y = 0. */
function prism(points: readonly [number, number][], width: number) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geometry.translate(0, 0, -width / 2);
  // Lengthwise along z, as the models face.
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

/** A folded paper boat: the flared hull, and the tall peaked fold standing up its middle. */
export function paperBoatShape() {
  return mergePainted([
    {
      geometry: prism(
        [
          [-0.07, 0],
          [0.07, 0],
          [0.12, 0.045],
          [-0.12, 0.045],
        ],
        0.075,
      ),
      color: PAPER,
    },
    {
      geometry: prism(
        [
          [-0.06, 0.04],
          [0.06, 0.04],
          [0, 0.115],
        ],
        0.012,
      ),
      color: FOLD,
    },
  ]);
}

/** A little paper boat that now and then drifts across in front of the dock with the breeze (paperBoat.ts). */
export function PaperBoat({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  const boat = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => paperBoatShape(), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const mesh = boat.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    const pose = paperBoatAt(time, wind.x, still);
    mesh.visible = pose.here;
    if (!pose.here) return;
    // Sat a little down in the water, rocking on the ripples.
    mesh.position.set(pose.x, waterHeight(pose.x, pose.z, time) - 0.01, pose.z);
    mesh.rotation.set(pose.rock * 0.6, pose.yaw, pose.rock);
  });
  return <mesh ref={boat} name="paper-boat" geometry={geometry} material={material} scale={SCALE} visible={false} castShadow={false} />;
}
