import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOAT_DECK } from "./boat";
import { ANCHORED_AT, anglerAt, boatYaw } from "./fogFishing";
import { mergePainted } from "./mergeParts";
import { useReducedMotion } from "./reducedMotion";
import { toonRamp } from "./toon";
import { ToonModel } from "./ToonModel";
import { waterHeight } from "./water";

const ROWBOAT = "/models/boat-row-large.glb";
const COAT = "#e8b923";
const TROUSERS = "#3d4a5c";
const SKIN = "#d9a882";
const BOOTS = "#2e3a2c";
const ROD = "#2a2622";
const FLOAT_TOP = "#e0412f";
const FLOAT_BOTTOM = "#f4f1e8";
/** How high the thwart is above the hull's origin, and where the hands hold the rod, from the angler's seat. */
const SEAT_Y = 0.32;
const HANDS: THREE.Vector3Tuple = [0.1, 0.3, 0.3];
const ROD_LENGTH = 1.8;
/** How far the float hangs below the rod tip when it is not out on the water. */
const DANGLE = 0.35;
const LINE_POINTS = 8;

/** The angler sitting on the thwart, facing +z: yellow oilskin coat and sou'wester, both hands forward on the rod. */
export function oilskinShape() {
  return mergePainted([
    { geometry: new THREE.BoxGeometry(0.28, 0.12, 0.38), position: [0, 0.06, 0.14], color: TROUSERS },
    { geometry: new THREE.BoxGeometry(0.26, 0.3, 0.1), position: [0, -0.12, 0.34], color: TROUSERS },
    { geometry: new THREE.BoxGeometry(0.27, 0.08, 0.16), position: [0, -0.28, 0.38], color: BOOTS },
    { geometry: new THREE.CylinderGeometry(0.13, 0.18, 0.5, 8), position: [0, 0.32, -0.02], rotation: [0.12, 0, 0], color: COAT },
    { geometry: new THREE.SphereGeometry(0.1, 10, 8), position: [0, 0.66, 0.02], color: SKIN },
    // The sou'wester: a crown and a broad brim, longer at the back to shed the rain.
    { geometry: new THREE.SphereGeometry(0.108, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.69, 0.01], color: COAT },
    { geometry: new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), position: [0, 0.69, -0.02], rotation: [-0.12, 0, 0], color: COAT },
    { geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.32, 6), position: [-0.06, 0.38, 0.16], rotation: [1.15, 0, -0.35], color: COAT },
    { geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.3, 6), position: [0.11, 0.36, 0.16], rotation: [1.15, 0, 0.05], color: COAT },
  ]);
}

/** The rod, butt at the origin, reaching out along +z. */
export function rodShape() {
  return mergePainted([
    { geometry: new THREE.CylinderGeometry(0.008, 0.02, ROD_LENGTH, 5), position: [0, 0, ROD_LENGTH / 2], rotation: [Math.PI / 2, 0, 0], color: ROD },
    { geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), position: [0.04, 0, 0.22], rotation: [0, 0, Math.PI / 2], color: "#8f8a80" },
  ]);
}

/** The float: red cap over a white body. */
export function floatShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.01, 0], color: FLOAT_TOP },
    { geometry: new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), position: [0, 0.01, 0], color: FLOAT_BOTTOM },
  ]);
}

/** A lone angler in a rowboat at anchor out on the lake on a foggy day, waiting on the float, reeling in now and then and casting again. */
export function FogAngler() {
  const still = useReducedMotion();
  const hull = useRef<THREE.Group>(null);
  const sitter = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Object3D>(null);
  const bob = useRef<THREE.Mesh>(null);
  const shapes = useMemo(() => ({ body: oilskinShape(), rod: rodShape(), float: floatShape() }), []);
  const material = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINE_POINTS * 3), 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#d8d6cf", transparent: true, opacity: 0.8 }));
  }, []);
  useEffect(
    () => () => {
      [shapes.body, shapes.rod, shapes.float, material, line.geometry, line.material as THREE.Material].forEach((item) => item.dispose());
    },
    [shapes, material, line],
  );
  const scratch = useMemo(() => ({ tip: new THREE.Vector3(), float: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const t = still ? 0 : time;
    const yaw = boatYaw(time, still);
    const pose = anglerAt(time, still);
    if (hull.current) {
      const y = waterHeight(ANCHORED_AT.x, ANCHORED_AT.z, t);
      const sample = 0.75;
      hull.current.position.set(ANCHORED_AT.x, y + BOAT_DECK - 0.14, ANCHORED_AT.z);
      hull.current.rotation.order = "YXZ";
      hull.current.rotation.y = yaw;
      hull.current.rotation.x = THREE.MathUtils.clamp((waterHeight(ANCHORED_AT.x, ANCHORED_AT.z + sample, t) - y) * 1.15, -0.2, 0.2);
      hull.current.rotation.z = THREE.MathUtils.clamp((y - waterHeight(ANCHORED_AT.x + sample, ANCHORED_AT.z, t)) * 1.15, -0.2, 0.2);
    }
    if (sitter.current) sitter.current.rotation.y = pose.aim - yaw;
    if (rod.current) rod.current.rotation.x = -pose.rod;
    if (!tip.current) return;
    hull.current?.updateMatrixWorld(true);
    tip.current.getWorldPosition(scratch.tip);
    const out = pose.float;
    if (out) scratch.float.set(out.x, waterHeight(out.x, out.z, t) + out.y, out.z);
    else scratch.float.set(scratch.tip.x, scratch.tip.y - DANGLE, scratch.tip.z);
    bob.current?.position.copy(scratch.float);
    // The line runs from the rod tip to the float, sagging a little when it is out on the water.
    const span = Math.hypot(scratch.float.x - scratch.tip.x, scratch.float.z - scratch.tip.z);
    const sag = out && out.y === 0 ? 0.08 * span : 0;
    const points = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < LINE_POINTS; i += 1) {
      const s = i / (LINE_POINTS - 1);
      points.setXYZ(
        i,
        scratch.tip.x + (scratch.float.x - scratch.tip.x) * s,
        scratch.tip.y + (scratch.float.y - scratch.tip.y) * s - sag * Math.sin(Math.PI * s),
        scratch.tip.z + (scratch.float.z - scratch.tip.z) * s,
      );
    }
    points.needsUpdate = true;
  });
  return (
    <group name="fog-angler">
      <group ref={hull}>
        <ToonModel url={ROWBOAT} scale={0.66} shadows={false} />
        <group ref={sitter} position={[0, SEAT_Y, 0]}>
          <mesh geometry={shapes.body} material={material} />
          <group ref={rod} position={HANDS}>
            <mesh geometry={shapes.rod} material={material} />
            <object3D ref={tip} position={[0, 0, ROD_LENGTH]} />
          </group>
        </group>
      </group>
      <mesh ref={bob} geometry={shapes.float} material={material} />
      <primitive object={line} frustumCulled={false} />
    </group>
  );
}
