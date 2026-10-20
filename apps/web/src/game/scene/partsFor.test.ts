import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LAKE_HOURS, LAKE_SEASONS, SKIES, type dailyWind, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { partsFor, type PartGroup } from "./lazyPart";

/**
 * Checks partsFor against each lazy part's own rule in LakeWorld and FishingWorld (`{rule(args) && <Part`), over
 * every hour, sky and season: whenever a part would be out, its chunk is asked for up front.
 */
type Gate = { part: string; group: PartGroup; rule: (hour: LakeHour, sky: Sky, season: LakeSeason, storm: boolean, wind: Wind) => boolean };
type Wind = ReturnType<typeof dailyWind>;
/** A still day and a blustery one, for rules that read the wind. */
const WINDS: Wind[] = [
  { wind: "calm", x: 0, z: 0 },
  { wind: "strong", x: 0.4, z: 0 },
];

async function gates(): Promise<{ checked: Gate[]; unchecked: string[] }> {
  const checked: Gate[] = [];
  const unchecked: string[] = [];
  for (const file of ["LakeWorld.tsx", "FishingWorld.tsx"]) {
    const source = readFileSync(join(__dirname, file), "utf8");
    const groups = new Map([...source.matchAll(/const (\w+) = lazyPart\("(\w+)", "\w+"\)/g)].map((m) => [m[1]!, m[2] as PartGroup]));
    const modules = new Map<string, string>();
    for (const m of source.matchAll(/import \{([^}]*)\} from "(\.\/[^"]+)";/g)) for (const name of m[1]!.split(",")) modules.set(name.trim(), m[2]!);
    for (const m of source.matchAll(/\{(\w+)\(([\w., ]*)\) && <(\w+)/g)) {
      const [, fn, args, part] = m;
      const group = groups.get(part!);
      if (!group) continue;
      const from = modules.get(fn!);
      const names = args!.split(",").map((a) => a.trim()).filter(Boolean);
      if (!from || names.some((a) => !["hour", "sky", "season", "storm", "wind", "weather.rain"].includes(a))) {
        unchecked.push(part!);
        continue;
      }
      const rule = ((await import(/* @vite-ignore */ join(__dirname, from))) as Record<string, (...a: unknown[]) => boolean>)[fn!]!;
      checked.push({
        part: part!,
        group,
        rule: (hour, sky, season, storm, wind) => rule(...names.map((a) => ({ hour, sky, season, storm, wind, "weather.rain": sky === "rain" })[a])),
      });
    }
  }
  return { checked, unchecked };
}

describe("partsFor", () => {
  it("asks up front for the chunk of every part a visit's hour, sky and season bring out", async () => {
    const { checked, unchecked } = await gates();
    expect(checked.length).toBeGreaterThan(40);
    // Parts on rules this can't run (stars, the moon road, lightning, the aurora) are night- or rain-only by their own code.
    expect(unchecked.length, unchecked.join(", ")).toBeLessThan(10);
    const missed = new Set<string>();
    for (const hour of LAKE_HOURS) for (const sky of SKIES) for (const season of LAKE_SEASONS) for (const storm of [false, true]) for (const wind of WINDS) {
      const asked = partsFor(hour, sky, season);
      for (const gate of checked) if (gate.rule(hour, sky, season, storm, wind) && !asked.includes(gate.group)) missed.add(`${gate.part} (${gate.group}) at ${hour}, ${sky}, ${season}`);
    }
    expect([...missed]).toEqual([]);
  });

  it("asks for no chunk none of whose parts come out then", async () => {
    const { checked } = await gates();
    const idle = new Set<string>();
    for (const hour of LAKE_HOURS) for (const sky of SKIES) for (const season of LAKE_SEASONS)
      for (const group of partsFor(hour, sky, season))
        if (!checked.some((gate) => gate.group === group && [false, true].some((storm) => WINDS.some((wind) => gate.rule(hour, sky, season, storm, wind))))) idle.add(`${group} at ${hour}, ${sky}, ${season}`);
    expect([...idle]).toEqual([]);
  });
});
