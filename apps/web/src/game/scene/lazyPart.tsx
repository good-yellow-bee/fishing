import { use, useEffect, useLayoutEffect, useState, type ComponentType } from "react";
import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * Scene parts seen only at night, in one season or in wet weather live in their own chunks (parts/*), so a
 * first visit downloads only what its hour, season and weather show. Parts out when the scene first appears
 * hold its reveal until their chunk is in (like the models), so nothing pops in; a part that comes out later
 * draws once its chunk arrives, and the chunks a visit may turn to (the weather, the night) are fetched ahead.
 */
const GROUPS = {
  night: () => import("./parts/night"),
  winter: () => import("./parts/winter"),
  spring: () => import("./parts/spring"),
  summer: () => import("./parts/summer"),
  fall: () => import("./parts/fall"),
  weather: () => import("./parts/weather"),
};
type Groups = typeof GROUPS;
export type PartGroup = keyof Groups;
type Parts<G extends PartGroup> = Awaited<ReturnType<Groups[G]>>;

/** How long to wait before trying a chunk again after it failed to download. */
const RETRY_MS = 15_000;

const loaded: { [G in PartGroup]?: Parts<G> } = {};
const loading: Partial<Record<PartGroup, Promise<void>>> = {};
let shown = false;

/** Downloads a chunk once. A failed download is logged, not thrown, so the lake still draws; the next ask tries again. */
export function loadParts(group: PartGroup) {
  return (loading[group] ??= GROUPS[group]().then(
    (module) => {
      (loaded as Record<PartGroup, unknown>)[group] = module;
    },
    (error: unknown) => {
      console.warn(`Scene parts "${group}" failed to load; trying again shortly.`, error);
      delete loading[group];
    },
  ));
}

/** A scene part `name` from chunk `group`, loaded on first use. */
export function lazyPart<G extends PartGroup, N extends keyof Parts<G> & string>(group: G, name: N) {
  type Props = Parts<G>[N] extends ComponentType<infer P> ? P : never;
  function Part(props: Props) {
    const [, arrived] = useState(0);
    const module = loaded[group] as Parts<G> | undefined;
    useEffect(() => {
      if (module) return;
      let retry = 0;
      void loadParts(group).then(() => {
        if (loaded[group]) arrived((n) => n + 1);
        else retry = window.setTimeout(() => arrived((n) => n + 1), RETRY_MS);
      });
      return () => window.clearTimeout(retry);
    }, [module]);
    if (!module) {
      // Out as the scene first appears: hold the reveal until it is in (or has failed, when it is left out).
      if (!shown) use(loadParts(group));
      return null;
    }
    const Loaded = module[name] as ComponentType<object>;
    return <Loaded {...(props as object)} />;
  }
  Part.displayName = `lazy(${name})`;
  return Part;
}

/** Marks the scene shown from its commit (later parts then draw when their chunk arrives instead of holding it back), and fetches the chunks a visit may turn to: the wet-weather one (the sky can turn any time) and the night one. Unmounting it puts the hold back for the next scene. */
export function useSceneParts() {
  useLayoutEffect(() => {
    shown = true;
    // After the first moments' downloads.
    const timer = window.setTimeout(() => {
      void loadParts("weather");
      void loadParts("night");
    }, 4000);
    return () => {
      shown = false;
      window.clearTimeout(timer);
    };
  }, []);
}

/** The chunks a scene at this hour, sky and season is likely to show at once: asked for as soon as the lake starts, alongside its models, rather than when its parts first render. */
export function partsFor(hour: LakeHour, sky: Sky | undefined, season: LakeSeason): PartGroup[] {
  const groups: PartGroup[] = [season];
  if (hour === "dusk" || hour === "night") groups.push("night");
  if (sky === "rain" || sky === "fog") groups.push("weather");
  return groups;
}

/** Starts downloading the chunks `partsFor` names. */
export function loadPartsFor(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  for (const group of partsFor(hour, sky, season)) void loadParts(group);
}
