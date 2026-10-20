import * as THREE from "three";

/**
 * three draws every shadow caster with one shared depth material, copying each caster's map, alpha test and
 * side onto it and switching it between instanced, skinned and plain meshes: with the lake's casters taking
 * turns, it re-picks that material's shader dozens of times a frame. Each caster here gets a depth material of
 * its own kind instead (one per distinct set of those), so three finds nothing changed from one to the next.
 */
const cache = new Map<string, THREE.MeshDepthMaterial>();

/** What makes casters need different depth shaders: how the mesh is drawn, and what its material cuts out. */
export function depthKey(mesh: THREE.Mesh, material: THREE.Material) {
  const source = material as THREE.Material & { map?: THREE.Texture | null; alphaMap?: THREE.Texture | null };
  const kind = (mesh as THREE.InstancedMesh).isInstancedMesh ? "instanced" : (mesh as THREE.SkinnedMesh).isSkinnedMesh ? "skinned" : "plain";
  const morph = mesh.morphTargetInfluences?.length ? "morph" : "";
  return [kind, morph, material.side, material.shadowSide, source.map?.uuid ?? "", source.alphaMap?.uuid ?? "", material.alphaTest > 0 ? material.alphaTest : 0].join("|");
}

/** The shared depth material for casters like `mesh`. */
export function depthFor(mesh: THREE.Mesh, material: THREE.Material) {
  const key = depthKey(mesh, material);
  let depth = cache.get(key);
  if (!depth) {
    depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    cache.set(key, depth);
  }
  return depth;
}

/** Gives every shadow caster under `root` without one its kind's depth material. Multi-material meshes keep three's own. */
export function assignShadowDepths(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.castShadow || mesh.customDepthMaterial || Array.isArray(mesh.material)) return;
    mesh.customDepthMaterial = depthFor(mesh, mesh.material);
  });
}
