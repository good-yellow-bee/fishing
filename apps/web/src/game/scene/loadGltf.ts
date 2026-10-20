import { useLoader } from "@react-three/fiber";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * drei's useGLTF, without the Draco and meshopt decoders it bundles: no model here is compressed that way, and the
 * decoders were 28 kB of the lake's download. Same cache, keyed by the URL or the list of URLs.
 */
export function useGLTF<T extends string | string[]>(url: T): T extends string[] ? GLTF[] : GLTF {
  return useLoader(GLTFLoader, url as never) as never;
}

useGLTF.preload = (url: string | string[]) => useLoader.preload(GLTFLoader, url as never);
