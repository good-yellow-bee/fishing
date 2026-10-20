import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * The lake's models, loaded by three's own glTF loader: drei's useGLTF bundled Draco and meshopt decoders no model here
 * needs (28 kB of the lake's download; loadGltf.test.ts keeps the models uncompressed). Its own cache, keyed by the URL
 * or the list of URLs, so models load through this hook, not drei's.
 */
export function useGLTF<T extends string | string[]>(url: T) {
  return useLoader(GLTFLoader, url);
}

useGLTF.preload = (url: string | string[]) => useLoader.preload(GLTFLoader, url);
