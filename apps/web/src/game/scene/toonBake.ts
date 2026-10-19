import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toonRamp } from "./toon";

/**
 * A toon-shaded model's meshes baked into one: each part's colour goes into its vertices, so a model
 * made of several coloured parts (a log's bark and cut ends, a lily pad's leaf and veins) costs one draw
 * instead of one per part. Only plain models bake: opaque, untextured toon colours on one side.
 */

/** The vertex-coloured toon materials baked models share, one per side drawn. */
const bakedLooks = new Map<THREE.Side, THREE.MeshToonMaterial>();

function bakedLook(side: THREE.Side) {
  let look = bakedLooks.get(side);
  if (!look) {
    look = new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp(), side });
    bakedLooks.set(side, look);
  }
  return look;
}

function plain(material: THREE.Material): material is THREE.MeshToonMaterial {
  return material instanceof THREE.MeshToonMaterial && !material.map && !material.transparent && material.alphaTest === 0;
}

/**
 * `root`'s meshes, as applyToon left them, baked into one mesh in a fresh group, or null when the model
 * can't bake (a texture, see-through or skinned parts, parts drawn on different sides, or a single part
 * already). Baking disposes `root`'s own materials; the geometries are copied, so the loaded model's stay.
 */
export function bakeToon(root: THREE.Object3D, shadows: boolean): THREE.Group | null {
  const parts: { mesh: THREE.Mesh; material: THREE.MeshToonMaterial }[] = [];
  let bakes = true;
  root.traverse((obj) => {
    if (!bakes || !(obj instanceof THREE.Mesh) || !obj.visible) return;
    const material = obj.material as THREE.Material | THREE.Material[];
    if (obj instanceof THREE.SkinnedMesh || Array.isArray(material) || !plain(material)) {
      bakes = false;
      return;
    }
    parts.push({ mesh: obj, material });
  });
  const side = parts[0]?.material.side;
  if (!bakes || parts.length < 2 || parts.some((part) => part.material.side !== side)) return null;
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const pieces = parts.map(({ mesh, material }) => {
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const piece = new THREE.BufferGeometry();
    piece.setAttribute("position", source.getAttribute("position"));
    if (source.getAttribute("normal")) piece.setAttribute("normal", source.getAttribute("normal"));
    else piece.computeVertexNormals();
    source.dispose();
    piece.applyMatrix4(toRoot.clone().multiply(mesh.matrixWorld));
    const count = piece.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) colors.set([material.color.r, material.color.g, material.color.b], i * 3);
    piece.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return piece;
  });
  const shape = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  if (!shape) return null;
  parts.forEach(({ material }) => material.dispose());
  const mesh = new THREE.Mesh(shape, bakedLook(side!));
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  const group = new THREE.Group();
  group.add(mesh);
  group.userData.baked = true;
  return group;
}

/** Lets go of a model bakeToon made: its shape is its own; the shared material stays for the next. */
export function releaseBaked(group: THREE.Object3D) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.geometry.dispose();
  });
}
