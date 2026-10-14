import * as THREE from "three";

let ramp: THREE.DataTexture | undefined;

export function toonRamp() {
  if (ramp) return ramp;
  const data = new Uint8Array([80, 80, 80, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.magFilter = THREE.NearestFilter;
  ramp.minFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

function toonMaterial(mat: THREE.Material | undefined, gradientMap: THREE.DataTexture) {
  const src = mat as THREE.MeshStandardMaterial | undefined;
  const transparent = Boolean(src?.transparent);
  let alphaTest = transparent ? 0.12 : 0;
  if (src && src.alphaTest > 0) alphaTest = src.alphaTest;
  return new THREE.MeshToonMaterial({
    color: src?.color instanceof THREE.Color ? src.color.clone() : new THREE.Color(0xffffff),
    map: src?.map ?? null,
    gradientMap,
    transparent,
    opacity: src?.opacity ?? 1,
    side: src?.side ?? THREE.FrontSide,
    alphaTest,
  });
}

export function applyToon(root: THREE.Object3D, shadows = true) {
  const gradientMap = toonRamp();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = shadows;
    obj.receiveShadow = shadows;
    const srcs = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = srcs.map((mat) => toonMaterial(mat, gradientMap));
    obj.material = next.length === 1 ? next[0]! : next;
  });
}

/** Scales every material colour under `root`; materials must be the root's own (as applyToon makes them). */
export function shadeColours(root: THREE.Object3D, shade: number) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const current = Array.isArray(obj.material) ? obj.material : [obj.material];
    current.forEach((material) => (material as THREE.MeshToonMaterial).color?.multiplyScalar(shade));
  });
}

export function disposeMaterials(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const current = Array.isArray(obj.material) ? obj.material : [obj.material];
    current.forEach((material) => materials.add(material));
  });
  materials.forEach((material) => material.dispose());
}

export function findBone(root: THREE.Object3D, pattern: RegExp) {
  let hit: THREE.Object3D | undefined;
  root.traverse((obj) => {
    if (!hit && pattern.test(obj.name)) hit = obj;
  });
  return hit;
}

/** Toon materials scenery copies share, by what they look like, with how many mesh slots use each. */
const sharedMaterials = new Map<string, { material: THREE.Material; users: number }>();

function lookKey(material: THREE.Material) {
  const toon = material as THREE.MeshToonMaterial;
  if (!(toon instanceof THREE.MeshToonMaterial)) return null;
  return [toon.color.getHexString(), toon.map?.uuid ?? "-", toon.gradientMap?.uuid ?? "-", toon.transparent, toon.opacity, toon.side, toon.alphaTest].join("|");
}

/**
 * Swaps each toon material under `root` for one shared by every copy that looks
 * the same, so a forest of cloned trees draws from a handful of materials.
 * The swapped-out copies are disposed. Release with releaseSharedMaterials.
 */
export function shareMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const own = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = own.map((material: THREE.Material) => {
      const key = lookKey(material);
      if (key === null) return material;
      const entry = sharedMaterials.get(key);
      if (entry) {
        entry.users += 1;
        if (entry.material !== material) material.dispose();
        return entry.material;
      }
      material.userData.shareKey = key;
      sharedMaterials.set(key, { material, users: 1 });
      return material;
    });
    obj.material = next.length === 1 ? next[0]! : next;
  });
}

/** Lets go of `root`'s shared materials; the last user disposes each. Materials that weren't shared are disposed as usual. */
export function releaseSharedMaterials(root: THREE.Object3D) {
  const loose = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const current = Array.isArray(obj.material) ? obj.material : [obj.material];
    current.forEach((material: THREE.Material) => {
      const key = material.userData.shareKey as string | undefined;
      const entry = key === undefined ? undefined : sharedMaterials.get(key);
      if (!entry || entry.material !== material) {
        loose.add(material);
        return;
      }
      entry.users -= 1;
      if (entry.users > 0) return;
      sharedMaterials.delete(key!);
      material.dispose();
    });
  });
  loose.forEach((material) => material.dispose());
}

/** How many distinct shared materials are live; for tests. */
export function sharedMaterialCount() {
  return sharedMaterials.size;
}
