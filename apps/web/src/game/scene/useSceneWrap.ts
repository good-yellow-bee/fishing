import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

// Cache the .scene-wrap element so frame loops don't query the DOM every frame.
export function useSceneWrap() {
  const { gl } = useThree();
  const wrap = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = gl.domElement.closest(".scene-wrap");
    wrap.current = el instanceof HTMLElement ? el : null;
  }, [gl]);
  return wrap;
}
