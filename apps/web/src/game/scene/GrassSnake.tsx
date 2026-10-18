import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SNAKE_BEADS, snakeBody } from "./snakeSwim";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { waterHeight } from "./water";

/** Drawn larger than life, so it reads from the bank. */
const SNAKE_SCALE = 2.4;
const BODY = "#4b5a33";
const HEAD = "#2f3a22";
/** A grass snake's yellow collar, just behind the head. */
const COLLAR = "#e6c34a";

/** A grass snake swimming out from the lily pads and back, head up and body waving, in one draw (snakeSwim.ts). */
export function GrassSnake() {
  const still = useReducedMotion();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp() }), []);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useEffect(() => {
    const snake = mesh.current;
    if (!snake) return;
    for (let i = 0; i < SNAKE_BEADS; i += 1) snake.setColorAt(i, new THREE.Color(i === 0 ? HEAD : i === 1 ? COLLAR : BODY));
    if (snake.instanceColor) snake.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const snake = mesh.current;
    if (!snake) return;
    const body = snakeBody(clock.elapsedTime, still);
    snake.visible = body !== null;
    if (!body) return;
    const time = still ? 0 : clock.elapsedTime;
    body.forEach((bead, i) => {
      scratch.position.set(bead.x, waterHeight(bead.x, bead.z, time) + bead.lift * SNAKE_SCALE, bead.z);
      // Flattened, as a body lying along the water.
      scratch.scale.set(bead.size * SNAKE_SCALE, bead.size * SNAKE_SCALE * 0.6, bead.size * SNAKE_SCALE);
      scratch.updateMatrix();
      snake.setMatrixAt(i, scratch.matrix);
    });
    snake.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="grass-snake" args={[geometry, material, SNAKE_BEADS]} frustumCulled={false} visible={false} />;
}
