import * as THREE from "three";

let patched = false;

/**
 * Turns on three's file cache, so each model and the colour map they share are fetched once. Its
 * ImageBitmapLoader hands a request made while the same image is still loading `undefined` (the cached promise
 * resolves to nothing), and models sharing a colour map drew black: such a request gets the finished bitmap.
 */
export function enableModelCache() {
  THREE.Cache.enabled = true;
  if (patched) return;
  patched = true;
  const load = THREE.ImageBitmapLoader.prototype.load;
  THREE.ImageBitmapLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    const key = `image-bitmap:${this.manager.resolveURL((this.path ?? "") + (url ?? ""))}`;
    const loaded =
      onLoad &&
      ((bitmap: ImageBitmap) => {
        const got: ImageBitmap | Promise<unknown> | undefined = bitmap ?? THREE.Cache.get(key);
        if (got === undefined || got instanceof Promise) throw new Error(`No finished bitmap cached for ${key}`);
        onLoad(got);
      });
    return load.call(this, url, loaded, onProgress, onError);
  };
}
