import * as THREE from "three";

/** three draws all shadow casters with one depth material, re-picking its shader as casters of different kinds take turns: each kind gets its own here. */
const cache = new Map<string, THREE.MeshDepthMaterial>();
/** The key each caster was given its depth material for, so a changed material gets a new one. */
const given = new WeakMap<THREE.Mesh, string>();

/** What makes casters need different depth shaders (what three's renderer switches programs on), or null for casters left to three. */
export function depthKey(mesh: THREE.Mesh, material: THREE.Material): string | null {
  const source = material as THREE.Material & { map?: THREE.Texture | null; alphaMap?: THREE.Texture | null; displacementMap?: THREE.Texture | null };
  if (source.displacementMap || material.clippingPlanes?.length) return null;
  const instanced = mesh as THREE.InstancedMesh;
  const kind = instanced.isInstancedMesh ? `instanced${instanced.instanceColor ? "+colour" : ""}${instanced.morphTexture ? "+morph" : ""}` : (mesh as THREE.SkinnedMesh).isSkinnedMesh ? "skinned" : "plain";
  const morphs = mesh.geometry.morphAttributes.position?.length ?? 0;
  const alphaTest = material.alphaToCoverage ? 0.5 : material.alphaTest;
  return [kind, morphs, material.side, material.shadowSide, Boolean(source.map), Boolean(source.alphaMap), alphaTest > 0].join("|");
}

/** The shared depth material for casters under `key`. */
function depthMaterial(key: string) {
  let depth = cache.get(key);
  if (!depth) {
    depth = new THREE.MeshDepthMaterial();
    cache.set(key, depth);
  }
  return depth;
}

/** Gives every shadow caster under `root` its kind's depth material, again when its kind has changed; casters with a depth material of their own, multi-material meshes and clipped or displaced ones keep three's handling. */
export function assignShadowDepths(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.castShadow || Array.isArray(mesh.material)) return;
    const had = given.get(mesh);
    if (mesh.customDepthMaterial && had === undefined) return;
    const key = depthKey(mesh, mesh.material);
    if (key === had) return;
    if (key === null) {
      mesh.customDepthMaterial = undefined;
      given.delete(mesh);
      return;
    }
    mesh.customDepthMaterial = depthMaterial(key);
    given.set(mesh, key);
  });
}
