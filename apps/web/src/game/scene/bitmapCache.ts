import * as THREE from "three";

let shared = false;

/**
 * three's ImageBitmapLoader hands a request made while the same image is still loading `undefined` (its cached
 * promise resolves to nothing), so with THREE.Cache on, models sharing a colour map drew black: give such a
 * request the finished bitmap from the cache instead.
 */
export function shareLoadingBitmaps() {
  if (shared) return;
  shared = true;
  const load = THREE.ImageBitmapLoader.prototype.load;
  THREE.ImageBitmapLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    const key = `image-bitmap:${this.manager.resolveURL((this.path ?? "") + url)}`;
    return load.call(this, url, onLoad && ((bitmap) => onLoad(bitmap ?? THREE.Cache.get(key))), onProgress, onError);
  };
}
