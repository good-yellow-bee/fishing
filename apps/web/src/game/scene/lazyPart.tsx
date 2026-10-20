import { use, useEffect, useState, type ComponentType } from "react";
import type { LakeHour } from "@stillwater/shared";

/**
 * Scene parts seen only at night, in one season or in wet weather live in their own chunks (parts/*), so a
 * first visit downloads only what its hour, season and weather show. Parts out when the scene first appears
 * hold its reveal until their chunk is in (like the models), so nothing pops in; a part that comes out later
 * draws once its chunk arrives, and the chunks likely next are fetched ahead (preloadParts).
 */
const GROUPS = {
  night: () => import("./parts/night"),
  winter: () => import("./parts/winter"),
  spring: () => import("./parts/spring"),
  summer: () => import("./parts/summer"),
  fall: () => import("./parts/fall"),
  weather: () => import("./parts/weather"),
};
export type PartGroup = keyof typeof GROUPS;

const loaded: Partial<Record<PartGroup, Record<string, unknown>>> = {};
const loading: Partial<Record<PartGroup, Promise<void>>> = {};
let shown = false;

export function loadParts(group: PartGroup) {
  return (loading[group] ??= GROUPS[group]().then((module) => {
    loaded[group] = module;
  }));
}

/** The scene has appeared: parts coming out from now on draw when their chunk arrives rather than holding the scene back. */
export function markSceneShown() {
  shown = true;
}

/** A scene part `name` from chunk `group`, loaded on first use. */
export function lazyPart<P>(group: PartGroup, name: string): ComponentType<P> {
  function Part(props: P) {
    const [, arrived] = useState(false);
    const module = loaded[group];
    useEffect(() => {
      if (!module) void loadParts(group).then(() => arrived(true));
    }, [module]);
    if (!module) {
      // Out as the scene first appears: hold the reveal until it is in.
      if (!shown) use(loadParts(group));
      return null;
    }
    const Loaded = module[name] as ComponentType<object>;
    return <Loaded {...(props as object)} />;
  }
  Part.displayName = `lazy(${name})`;
  return Part;
}

/** Fetches the chunks likely needed next, once the scene is up: the wet-weather one (the sky can turn any time), and the night one from dusk. */
export function preloadParts(hour: LakeHour) {
  void loadParts("weather");
  if (hour === "dusk" || hour === "night") void loadParts("night");
}
