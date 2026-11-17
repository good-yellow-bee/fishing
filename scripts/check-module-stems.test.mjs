import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { moduleStemCollisions } from "./check-module-stems.mjs";

test("rejects case-folded stems across extensions and directory casing", () => {
  assert.deepEqual(moduleStemCollisions([
    "src/SeasonRecap.tsx", "src/seasonRecap.ts",
    "src/BoatWake.tsx", "src/boatWake.ts",
    "src/Scene/Fog.jsx", "src/scene/fog.js",
    "lib/weather.mts", "lib/Weather.mjs",
    "lib/tide.cts", "lib/Tide.cjs",
    "src/Water.ts", "src/water.ts",
  ]), [
    ["src/SeasonRecap.tsx", "src/seasonRecap.ts"],
    ["src/BoatWake.tsx", "src/boatWake.ts"],
    ["src/Scene/Fog.jsx", "src/scene/fog.js"],
    ["lib/Weather.mjs", "lib/weather.mts"],
    ["lib/Tide.cjs", "lib/tide.cts"],
    ["src/Water.ts", "src/water.ts"],
  ]);
});

test("accepts distinct helper names, tests, declarations and separate directories", () => {
  assert.deepEqual(moduleStemCollisions([
    "src/SeasonRecap.tsx", "src/seasonRecapModel.ts", "src/seasonRecap.test.ts",
    "src/BoatWake.tsx", "src/boatWakeModel.ts", "src/BoatWake.css",
    "src/BoatWake.d.ts", "src/BoatWake.tsx", "other/BoatWake.tsx",
    "lib/tide.mjs", "lib/tide.d.mts", "lib/weather.cjs", "lib/weather.d.cts",
  ]), []);
});

test("CLI fails for tracked collisions and passes after a helper rename", () => {
  const cwd = mkdtempSync(join(tmpdir(), "module-stems-"));
  const script = fileURLToPath(new URL("./check-module-stems.mjs", import.meta.url));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd });
    mkdirSync(join(cwd, "src"));
    writeFileSync(join(cwd, "src/SeasonRecap.tsx"), "");
    writeFileSync(join(cwd, "src/seasonRecap.ts"), "");
    execFileSync("git", ["add", "."], { cwd });
    const failed = spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /src\/SeasonRecap\.tsx/);
    assert.match(failed.stderr, /src\/seasonRecap\.ts/);
    rmSync(join(cwd, "src/seasonRecap.ts"));
    writeFileSync(join(cwd, "src/seasonRecapModel.ts"), "");
    const passed = spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /No case-insensitive module stem collisions/);
    writeFileSync(join(cwd, "src/seasonRecap.js"), "");
    const untracked = spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
    assert.equal(untracked.status, 1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
