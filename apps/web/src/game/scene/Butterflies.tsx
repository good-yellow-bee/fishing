import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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

/**
 * A few butterflies fluttering over the lily pads and the water by the dock on sunny summer days.
 * All the wings are one instanced draw, coloured per instance, and all the bodies another.
 */
export function Butterflies() {
  const still = useReducedMotion();
  const wing = useMemo(wingGeometry, []);
  const body = useMemo(() => new THREE.CapsuleGeometry(0.003, 0.02, 2, 4).rotateX(Math.PI / 2), []);
  const wingMaterial = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), []);
  const bodyMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#2a2018" }), []);
  const wings = useRef<THREE.InstancedMesh>(null);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const work = useMemo(
    () => ({
      place: new THREE.Matrix4(),
      hinge: new THREE.Matrix4(),
      mirror: new THREE.Matrix4().makeScale(-1, 1, 1),
      out: new THREE.Matrix4(),
      at: new THREE.Vector3(),
      turn: new THREE.Quaternion(),
      up: new THREE.Vector3(0, 1, 0),
      size: new THREE.Vector3().setScalar(SCALE),
    }),
    [],
  );

  useEffect(
    () => () => {
      [wing, body, wingMaterial, bodyMaterial].forEach((thing) => thing.dispose());
    },
    [wing, body, wingMaterial, bodyMaterial],
  );

  useLayoutEffect(() => {
    const mesh = wings.current;
    if (!mesh) return;
    const color = new THREE.Color();
    BUTTERFLY_HOMES.forEach((_, i) => {
      color.set(BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length]!);
      mesh.setColorAt(i * 2, color);
      mesh.setColorAt(i * 2 + 1, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    const count = settings.particles === "lite" ? BUTTERFLY_HOMES.length / 2 : BUTTERFLY_HOMES.length;
    for (let i = 0; i < count; i += 1) {
      const b = butterflyAt(i, t);
      work.at.set(b.x, b.y, b.z);
      work.turn.setFromAxisAngle(work.up, b.yaw);
      work.place.compose(work.at, work.turn, work.size);
      bodies.current?.setMatrixAt(i, work.place);
      const lift = still ? 0.4 : b.flap * BEAT;
      // The right wing lifts round +z; the left is its mirror, lifting the other way.
      wings.current?.setMatrixAt(i * 2, work.out.multiplyMatrices(work.place, work.hinge.makeRotationZ(lift)));
      wings.current?.setMatrixAt(i * 2 + 1, work.out.multiplyMatrices(work.place, work.hinge.makeRotationZ(-lift)).multiply(work.mirror));
    }
    if (wings.current) {
      wings.current.count = count * 2;
      wings.current.instanceMatrix.needsUpdate = true;
    }
    if (bodies.current) {
      bodies.current.count = count;
      bodies.current.instanceMatrix.needsUpdate = true;
    }
  });

  // They flit about, so the instances' combined bounds would need refitting each frame; a few wings are cheap to draw.
  return (
    <group name="butterflies">
      <instancedMesh ref={wings} args={[wing, wingMaterial, BUTTERFLY_HOMES.length * 2]} frustumCulled={false} />
      <instancedMesh ref={bodies} args={[body, bodyMaterial, BUTTERFLY_HOMES.length]} frustumCulled={false} />
    </group>
  );
}
