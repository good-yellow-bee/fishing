import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { toadstoolPatches, type ToadstoolKind } from "./toadstoolPatches";
import { toonRamp } from "./toon";

/** Drawn larger than life, so a patch reads from the bank path. */
const SCALE = 2.2;
const CAP_COLORS: Record<ToadstoolKind, string> = { "fly-agaric": "#c4291f", brown: "#8a5a34", tan: "#c8a061" };
/** The white flecks on a fly agaric's cap: round the crown, as angles from the top and round it. */
const SPOTS = [
  [0, 0],
  [0.7, 0.3],
  [0.75, 2.4],
  [0.65, 4.4],
  [1.05, 1.3],
  [1.1, 3.5],
  [1.0, 5.4],
] as const;

/** Little patches of toadstools at the feet of the shore trees in fall; nothing moves, so the instances are placed once. */
export function Toadstools({ trees }: { trees: readonly { position: readonly [number, number, number] }[] }) {
  const caps = useMemo(() => toadstoolPatches(trees), [trees]);
  const agarics = useMemo(() => caps.filter((cap) => cap.kind === "fly-agaric").length, [caps]);
  const stems = useRef<THREE.InstancedMesh>(null);
  const tops = useRef<THREE.InstancedMesh>(null);
  const spots = useRef<THREE.InstancedMesh>(null);
  const shapes = useMemo(
    () => ({
      stem: new THREE.CylinderGeometry(0.75, 1, 1, 7).translate(0, 0.5, 0),
      top: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      spot: new THREE.IcosahedronGeometry(1, 0),
    }),
    [],
  );
  const looks = useMemo(
    () => ({
      stem: new THREE.MeshToonMaterial({ color: "#efe6d2", gradientMap: toonRamp() }),
      top: new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: toonRamp() }),
      spot: new THREE.MeshToonMaterial({ color: "#f6f0e2", gradientMap: toonRamp() }),
    }),
    [],
  );
  useEffect(
    () => () => {
      [...Object.values(shapes), ...Object.values(looks)].forEach((thing) => thing.dispose());
    },
    [shapes, looks],
  );

  useLayoutEffect(() => {
    const base = new THREE.Matrix4();
    const part = new THREE.Matrix4();
    const out = new THREE.Matrix4();
    const turn = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const color = new THREE.Color();
    let spot = 0;
    caps.forEach((cap, i) => {
      euler.set(cap.tilt, cap.lean, 0, "YXZ");
      turn.setFromEuler(euler);
      base.compose(new THREE.Vector3(cap.x, 0, cap.z), turn, new THREE.Vector3().setScalar(SCALE));
      const stem = cap.cap * 0.28;
      stems.current?.setMatrixAt(i, out.multiplyMatrices(base, part.makeScale(stem, cap.height, stem)));
      const crown = new THREE.Matrix4().makeTranslation(0, cap.height - cap.cap * 0.1, 0).multiply(part.makeScale(cap.cap, cap.cap * 0.62, cap.cap));
      tops.current?.setMatrixAt(i, out.multiplyMatrices(base, crown));
      tops.current?.setColorAt(i, color.set(CAP_COLORS[cap.kind]));
      if (cap.kind !== "fly-agaric") return;
      for (const [down, round] of SPOTS) {
        const at = new THREE.Vector3(Math.sin(down) * Math.cos(round), Math.cos(down), Math.sin(down) * Math.sin(round)).applyMatrix4(crown);
        spots.current?.setMatrixAt(spot, out.multiplyMatrices(base, part.compose(at, turn.identity(), new THREE.Vector3().setScalar(cap.cap * 0.13))));
        spot += 1;
      }
    });
    for (const mesh of [stems.current, tops.current, spots.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [caps]);

  return (
    <group name="toadstools">
      <instancedMesh ref={stems} args={[shapes.stem, looks.stem, caps.length]} />
      <instancedMesh ref={tops} args={[shapes.top, looks.top, caps.length]} />
      <instancedMesh ref={spots} args={[shapes.spot, looks.spot, agarics * SPOTS.length]} />
    </group>
  );
}
