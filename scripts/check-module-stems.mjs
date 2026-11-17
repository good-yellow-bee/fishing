import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function moduleStemCollisions(paths) {
  const stems = new Map();
  for (const path of new Set(paths)) {
    if (!/\.(?:[cm]?[jt]s|[jt]sx)$/i.test(path) || /\.d\.[cm]?ts$/i.test(path)) continue;
    const stem = path.replace(/\.[^.]+$/, "").toLowerCase();
    const group = stems.get(stem) ?? [];
    group.push(path);
    stems.set(stem, group);
  }
  return [...stems.values()].filter((group) => group.length > 1).map((group) => group.sort());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
    .split("\0").filter((path) => path && existsSync(path));
  const collisions = moduleStemCollisions(paths);
  if (collisions.length) {
    console.error("Case-insensitive module stem collisions (use distinct names, not just casing or extensions):");
    for (const group of collisions) console.error(`  ${group.join(" <-> ")}`);
    process.exitCode = 1;
  } else {
    console.log("No case-insensitive module stem collisions.");
  }
}
