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
