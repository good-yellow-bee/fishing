import { use, useEffect, useLayoutEffect, useState, type ComponentType } from "react";
import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/** The season a scene draws when none is given. */
export const DEFAULT_SEASON: LakeSeason = "summer";

/**
 * Scene parts seen only by day, at night, in one season or in wet weather live in their own chunks (parts/*), so
 * a first visit downloads only what its hour, season and weather show. Parts out when the scene first appears
 * hold its reveal until their chunk is in (like the models), so nothing pops in; a part that comes out later
 * draws once its chunk arrives, and the chunks a visit may turn to (the weather, the night, the day) are fetched ahead.
 */
const GROUPS = {
  day: () => import("./parts/day"),
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

/**
 * Marks the scene shown from its commit (later parts then draw when their chunk arrives instead of holding it
 * back), and fetches the chunks a visit may turn to: the wet-weather one (the sky can turn any time), the night's
 * and the day's (the hour turns). Unmounting it puts the hold back for the next scene.
 */
export function useSceneParts() {
  useLayoutEffect(() => {
    shown = true;
    // After the first moments' downloads.
    const timer = window.setTimeout(() => {
      for (const group of ["weather", "night", "day"] as const) void loadParts(group);
    }, 4000);
    return () => {
      shown = false;
      window.clearTimeout(timer);
    };
  }, []);
}

/**
 * The chunks a scene at this hour, sky and season shows parts from (partsFor.test.ts checks this both ways against
 * every part's own rule): its season's (summer's are all out on dry days only), the day's at dawn and by day, the
 * night's from dusk (but not a snowy winter dusk), and the wet-weather one in rain (winter's rain falls as snow,
 * which the winter chunk draws).
 */
export function partsFor(hour: LakeHour, sky: Sky, season: LakeSeason): PartGroup[] {
  const daytime = hour === "dawn" || hour === "day";
  const groups: PartGroup[] = season !== "summer" || (daytime && sky !== "rain") ? [season] : [];
  if (daytime) groups.push("day");
  if (!daytime && !(hour === "dusk" && season === "winter" && sky === "rain")) groups.push("night");
  if (sky === "rain" && season !== "winter") groups.push("weather");
  return groups;
}

/** Asks for the chunks `partsFor` names as the lake starts, alongside its models, rather than when their parts first render. */
export function usePartsFor(hour: LakeHour, sky: Sky, season: LakeSeason) {
  useEffect(() => {
    for (const group of partsFor(hour, sky, season)) void loadParts(group);
  }, [hour, sky, season]);
}
