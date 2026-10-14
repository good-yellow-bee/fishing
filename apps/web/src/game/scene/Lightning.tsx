import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "../fx";
import { settings } from "../settings";
import { flashLevel, strikeGap, thunderDelay } from "./storm";

/** The flash's light at its brightest, on top of the storm's dim daylight. */
const FLASH_PEAK = 2.6;

/** A storm over the lake: now and then the whole scene flashes, and thunder rolls in after it. */
export function Lightning() {
  const light = useRef<THREE.AmbientLight>(null);
  const struckAt = useRef(-Infinity);

  useEffect(() => {
    let timer = 0;
    const strike = () => {
      const near = Math.random();
      struckAt.current = performance.now();
      fx.thunder(thunderDelay(near), near);
      timer = window.setTimeout(strike, strikeGap(Math.random()) * 1000);
    };
    // The first one comes soon enough to notice there is a storm.
    timer = window.setTimeout(strike, 4000 + Math.random() * 6000);
    return () => window.clearTimeout(timer);
  }, []);

  useFrame(() => {
    if (!light.current) return;
    // Reduce motion keeps the thunder and drops the flash.
    light.current.intensity = settings.reduceMotion ? 0 : flashLevel(performance.now() - struckAt.current) * FLASH_PEAK;
  });

  return <ambientLight ref={light} color="#dfe8ff" intensity={0} />;
}
