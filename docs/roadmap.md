# Stillwater roadmap

Living plan for the game. Two sources, both written on 2026-10-08: a whole-app review (fixes) and a design proposal (new upgrades). Each item ships as its own PR with tests; strike items through as they merge.

## In flight

- Weather of the day (#53): sky, fog, rain, bites and ambience follow the day.
- Fight teaches itself: visible controls, verb-first fight lines, surges that matter.
- Honest first hour: safe default lure, a shop that explains skills, cast feedback, level-up toast.

## Fixes from the review (do before new content)

1. **Fish you see is the fish you hook.** Roll the species when the wait starts, show its shadow colour and size (`shadowSize`), give landed fish their real size (`bodyScale` is capped at 0.95, so every fish looks the same), and let a too-heavy bite be a losing fight or a pass instead of a 1.4 s cutscene.
2. **Touch can play.** Movement is keyboard-only, so phones can never leave the dock or reach the shack. Tap-to-walk or a stick, a HUD shop button, `prefers-reduced-motion`, 11 px minimum text, no email on the play HUD.
3. **Night and weather look.** Shadows off when the sun is hidden; a visible line and float at night (the line is near black on night water).
4. **Smaller fixes.** Nibble timing is fully predictable; the Log summary uses the last 20 catches while the guide is all-time; the first game save seeds the sample logbook; one fish mesh for all 13 species; ~125 cloned scenery models with their own materials; charging a cast re-renders the page every frame; per-frame water normals and aim raycasts; copy nits (pale vs moss band, lure select keeps Space focus, mute not remembered, hour frozen at page load).

Already queued from the original plan: bubbling hotspot, level 4-8 unlocks, daily requests board, landing lift, scene memo and reset, camera clipping into the hill. Server-side catch verification is deferred.

## Next 25 upgrades

| # | Title | Area | Size | Wave | Depends on |
|---|---|---|---|---|---|
| P1 | On-water cast band | feel | S | A | perf memo (power via ref) |
| P2 | Hookset hit-stop + haptics | feel | S | A | — (#55 merged) |
| P3 | Drag clicker (tension audio) | feel/audio | S | A | — |
| P4 | First-cast walkthrough | onboarding | S/M | A | — |
| P5 | Mercy bites for the first three fish | onboarding | S | A | — |
| P6 | Fast recast from any result | QoL | S | A | — |
| P7 | Tap-to-walk + thumb controls | mobile | M | B | — |
| P8 | Settings & quality panel | access/QoL | S/M | B | — |
| P9 | Screen reader & keyboard parity | access | S | B | — |
| P10 | Live hour crossfade | visual/feel | M | B | #53 look table |
| P11 | Catch conditions on the server | data enabler | S | C | #53 |
| P12 | Lodge badges | progression | M | C | P11 |
| P13 | Weekly board + species record wall | social | M | C | — |
| P14 | Tracks on the shore (async presence) | social | S/M | C | — |
| P15 | Day-on-the-water recap → field-log trip | journal | M | C | #53 |
| P16 | Three-day forecast at the shack | retention | S | C | #53 |
| P17 | Lure classes (keeps the field-log tie-in) | content | M | D | #50 |
| P18 | Five new species + the Inlet bank | content | L | D | level unlocks |
| P19 | Rowboat open-water stance | content | L | D | P18, landing lift |
| P20 | Fight & landing camera | camera | M | E | landing lift, P8 |
| P21 | Catch photo → field log | journal/visual | M | E | P20 |
| P22 | Water: caustics, sun road, rim | visual | M | E | perf memo |
| P23 | Atmosphere pass (fireflies, mist, bloom) | visual | M | E | P8, #53 |
| P24 | Seasons on the lake | progression/content | L | F | #53, #50 |
| P25 | Species lore + silhouettes | collection | S | F | — |

---

## Wave A — Feel the bite

### P1 · On-water cast band
- **Pitch:** while you hold, the aim ring on the water grows and turns moss-green inside the sweet band. Release there. Eyes never leave the lake.
- **Borrowed:** Stardew (cast meter drawn on the character, not the HUD); Webfishing (in-world cast indicator); Cast n Chill (near-zero HUD).
- **Why fun:** `PowerMeter` sits bottom-right while the aim marker sits on the water → split attention. New players eat "The lure slapped the dock" (<0.22) and "Backlash" (>0.94) because they are watching the wrong thing.
- **Sketch:**
  - `scene/castRing.ts` (pure): `castRing(power, band) → { radius, inBand, opacity }`; radius `0.4 + power*0.9`.
  - `FishingWorld.tsx` `WaterAim`: second ring in the marker group driven by `castRing`; colour `#e7f2ea` → `--moss` when `inBand`.
  - Read `powerRef` (already returned by `useFishingGame`, unused by `Dock.tsx`) via a new `powerRef` prop — not the `power` prop, which re-renders `FishingWorld` every frame on master (fix is only on `codex/scene`).
  - `band` prop from `sweetBand(me.profile.accuracy)` in `Dock.tsx` (changes only on upgrade). Keep `PowerMeter` as the phone fallback behind P8.
- **Size:** S. **Deps:** queued perf memo (power through a ref).
- **Test:** `castRing.test.ts` (radius monotonic, `inBand` matches `sweetBand`); manual `?hour=day`, hold at the dock, ring green inside band, release outside → existing miss toast.

### P2 · Hookset hit-stop + haptics
- **Pitch:** the strike lands with an 80 ms freeze, a white blink, and a buzz in your hand.
- **Borrowed:** Dredge (rumble on the bite); Stardew ("!" + rod jolt); fighting-game hit-stop.
- **Why fun:** today the bite is two sine blips (`fx.bite`) plus a 0.05 shake on the plunge, and the strike itself (fight entry) is `fx.splash` plus a 0.09 shake in `CameraRig`. The strike is the moment the game is about; impact should be unmistakable — the hit-stop targets fight entry, the haptic targets both beats.
- **Sketch:**
  - `fx.ts`: `fx.haptic(pattern)` → `navigator.vibrate?.(pattern)`; patterns nibble `[15]`, bite `[40]`, surge start `[30,40,30]`, snap `[80]`, land `[20,30,60]`. Call sites already exist in `useFishingGame.ts` next to `fx.nibble/bite/surge/snap/land`. Note: `vibrate` is absent on iOS Safari — Android Chrome and desktop only.
  - Hit-stop render-side only: `fightView.freezeUntil` set in `FightMotion` on `prevPhase !== "fight" && phase === "fight"`; `LineAndBobber`, `HookedFish`, `CameraRig` skip their per-frame writes while `t < freezeUntil`. Do not pause `makeFight.step` — it schedules surges from wall-clock `nowMs`.
  - Blink: `.scene-wrap[data-phase="fight"]::after` white overlay, 1 frame, under the existing `prefers-reduced-motion` block (`index.css:1310`).
- **Size:** S. **Deps:** none (#55 is merged; build on its `strikeSplash.ts` timings).
- **Test:** `fx.test.ts` (on #53) with a mocked `navigator.vibrate`; `fightMotion.test.ts` `isFrozen(t, until)`.

### P3 · Drag clicker (continuous tension audio)
- **Pitch:** the reel's drag sings — a tick that rises as tension climbs, a rasp when it goes red, a hiss when line pays out. Silence means slack.
- **Borrowed:** Stardew fishing bar (the whine you learn to react to); Dredge creaking rod.
- **Why fun:** the fight is tension management and the only continuous cue is `FightBar` colour. The clean-fight 1.5× depends on staying under `RED_TENSION` 0.8; an audible pre-red warning lets you watch the fish instead of the bar.
- **Sketch:**
  - `game/dragTone.ts` (pure): `dragTone(tension, surge, reeling) → { gain, hz, rasp, hiss }` — hz 120→420 over tension, rasp true ≥ 0.72, hiss when `!reeling && surge === 2`.
  - `fx.ts`: `fx.drag.start()/set(tone)/stop()` — looping sawtooth → bandpass → gain; `gain.setTargetAtTime`, rasp via `noiseBurst` at 3 Hz.
  - Call from the rAF loop in `useFishingGame.ts` where `fx.reel()` is throttled (`lastReelFx`); `fx.drag.stop()` in `clearFight()`.
- **Size:** S. **Deps:** none.
- **Test:** `dragTone.test.ts` (monotonic gain, rasp threshold); `fx.test.ts` asserts `setTargetAtTime` calls with a mocked `AudioContext`.

### P4 · First-cast walkthrough
- **Pitch:** a new angler gets five quiet chips that light up as they do the thing — aim, charge, wait for the real dip, strike, ease on the run — then they vanish forever.
- **Borrowed:** A Short Hike (diegetic prompts, no modal); Stardew (Willy's rod moment); Animal Crossing (first-day nudges).
- **Why fun:** onboarding today is the `hint` string plus the `camera-help` key list. The nibble-then-bite rule and the band are only explained after a failure.
- **Sketch:**
  - `game/walkthrough.ts` (pure): `nextStep(step, snapshot)` over `{ stance, phase, cast, nibble, surge, reeling, outcome }`; steps `aim → charge → wait → strike → ease → landed`. Spawn is already the dock (`pose.ts` `DOCK_STAND_X/Z`), so step 1 is "aim".
  - `components/Walkthrough.tsx` reads `game.phase/stance/nibble/outcome` and `surfaceRef.dataset.cast`; chips reuse `.stance-chip` styling. Skip button.
  - Show only when `me.speciesStats` total caught is 0; persist done flag at `stillwater.walkthrough.<userId>.v1`.
- **Size:** S/M. **Deps:** none.
- **Test:** `walkthrough.test.ts` step machine; `Dock.test.tsx` (on #53) renders the first chip with zero stats.

### P5 · Mercy bites for the first three fish
- **Pitch:** your first three fish come fast, bite hard, and fight fair.
- **Borrowed:** Stardew (training rod, easy early fish); A Short Hike (no-fail feel).
- **Why fun:** at level 1 on the dock by day, `pickBite` can draw carp (`minStrength` 3) at `OUT_OF_REACH_BITE` 0.35 → "Line parted" on cast one; `waitMs` is 2.2–6 s. `d1700d0` already fills in landable fish for big lures — extend that for newcomers.
- **Sketch:**
  - `logic.ts`: `pickBite(..., mercy)` → when true, pool = `canLand && rarity === "common"`, skip the out-of-reach weighting; `waitMs(patience, hour, mercy)` capped at 2600 ms; `hookWindowMs` +400.
  - `useFishingGame(profile, hour, lureRef, sky, caughtTotal)`; `Dock.tsx` passes `speciesStats.reduce(caught)`; mercy while `< 3`. No server change (`validateCatch` unaffected).
- **Size:** S. **Deps:** none.
- **Test:** extend `biteMix.test.ts` — 1000 mercy draws never yield `!canLand` or non-common.

### P6 · Fast recast from any result
- **Pitch:** a miss or a landed card never blocks the next cast — click the water or press Space and you are charging.
- **Borrowed:** Cast n Chill / Webfishing zero-friction loop.
- **Why fun:** `strikeOrCast` has no `result` case; after a miss you must click "Cast again", after a landing "Keep fishing". Every extra click is loop friction.
- **Sketch:**
  - `useFishingGame.ts` `strikeOrCast`: `case "result": dismissResult(); startCast(via)` (keeps field-log save keyed on `outcome.id`).
  - `Dock.tsx`: landed card collapses to a small stamp after 6 s unless hovered; Enter = Keep fishing.
- **Size:** S. **Deps:** none.
- **Test:** `useFishingGame.test.tsx` harness — pointerdown in `result` → phase `casting`.

## Wave B — Reach every player

### P7 · Tap-to-walk + thumb controls
- **Pitch:** on a phone, tap where you want to stand and the angler walks there; hold the big Strike/Reel button; signposts jump you to a bank.
- **Borrowed:** A Short Hike (touch port); Animal Crossing Pocket Camp (tap-to-move).
- **Why fun:** `Player.tsx` reads keys only (`MOVE_KEYS`). The angler spawns on the dock, so a phone can fish the dock but never reach the reeds, point, drop-off, or the shack (`E`). Touch casting works (#36); the rest of the shore does not exist on mobile.
- **Sketch:**
  - `lake.ts`: `walkPath(fromX, fromZ, toX, toZ) → {x,z}[]` — BFS on a 0.5 m grid over `walkableAt` within the 10 `WALK` boxes (~70×30 cells), line-of-sight smoothing.
  - `Player.tsx`: `anglerPose.goal` consumed like `wish`; cleared on key input.
  - `WaterAim` pointerdown on non-water shore (`dataset.cast === "shore"`, ground ray at y=0, `walkableAt(hit)`) sets the goal. Today that same tap reaches `useFishingGame`'s `pointerdown` → `startCast` → hint "Bait landed on shore"; `startCast` must defer (return without a hint) when `dataset.cast === "shore"` and the hit is walkable.
  - Signposts: keys 1–4 and HUD chips Dock/Reeds/Point/Drop-off → `walkPath` to `DOCK_PAD`/`REEDS_STAND`/`POINT_PAD`/`DROPOFF_STAND`.
  - Thumb HUD: `.thumb-strike` (pointerdown/up routed to the same surface handlers, excluded from camera control), shop button when `stance === "shop"`; `touch-action: none` on `.scene-wrap`.
- **Size:** M. **Deps:** none.
- **Test:** `lake.test.ts` — `walkPath` from `DOCK_STAND` reaches `REEDS_STAND` and `DROPOFF_STAND`, every node `walkableAt`; `Player` stays key-driven in existing tests.

### P8 · Settings & quality panel
- **Pitch:** a small gear in the HUD: volume, shake, particles, shadows, sharpness, reel mode — remembered next visit.
- **Borrowed:** Stardew options; Dredge accessibility toggles (motion).
- **Why fun:** `fx.enabled` and `chosenLure` are in-memory (reset on reload); `Canvas` is fixed `shadows dpr=[1,1.75]`; shake amplitude fixed in `CameraRig`; `RAIN_COUNT` 128 whenever it rains. Low-end phones need a lever and the perf memo needs a place to land.
- **Sketch:**
  - `game/settings.ts`: typed store under `stillwater.settings.v1` `{ volume, shake, particles: "full"|"lite", shadows, dpr, reelMode: "hold"|"toggle", reduceMotion, lastLure }` + `useSettings()`.
  - `components/SettingsPanel.tsx` reusing `.shop-overlay`; HUD gear next to Mute.
  - `FishingWorld` `Canvas` props from settings; `CameraRig` `shakeAmp *= settings.shake`; `LakeRain` count from `particles`; `fx` master gain = volume; `Dock.tsx` initial lure from `lastLure` if still packed.
- **Size:** S/M. **Deps:** none; P7 and P23 consume it.
- **Test:** `settings.test.ts` parse/defaults/corrupt storage; existing `Dock.test.tsx`.

### P9 · Screen reader & keyboard parity
- **Pitch:** every state change is spoken; every control reachable by Tab.
- **Borrowed:** — (hygiene, no borrow; Stardew and Dredge both ship this as plain options).
- **Why fun:** `.hint` has no `aria-live`; `FightBar` writes status via `textContent` on a ref so it is never announced; the shop overlay has no dialog role or focus trap; tension bar has no `role="meter"`. (Tension ticks at 55/80 % already exist — colour is not the only cue; keep them.)
- **Sketch:** `.hint` → `aria-live="polite"`; `FightBar` `role="meter" aria-valuenow` throttled to 4 Hz plus a visually-hidden live region for surge changes; shop overlay `role="dialog" aria-modal`, focus first button on open, restore on Esc; `strike-cue` keeps `role="alert"`.
- **Size:** S. **Deps:** none.
- **Test:** `FightBar.test.tsx` aria attributes; `Dock.test.tsx` focus moves into the shop.

### P10 · Live hour crossfade
- **Pitch:** fish through dusk and watch the lake go to night without reloading.
- **Borrowed:** Animal Crossing (real-time clock, the world turns while you play).
- **Why fun:** `Dock.tsx` captures `lakeHour()` once at mount; a session crossing 17:00 stays "day" in look and bites. Real time is the game's identity — honour it live.
- **Sketch:**
  - `hour.ts`: `hourBlend(date) → { from, to, t }` with ±20 min ramps around 5/8/17/21.
  - `Dock.tsx`: 30 s interval recomputes `hour` (`pickBite`/`waitMs` already take `hour` by argument); `?hour=` still forces.
  - `LakeWorld.tsx`: lerp `LAKE_HOUR_LOOK[from] → [to]` (fog, hemi, sun, clouds, water) with `THREE.Color.lerp`; regenerate the sky texture at 2 % steps; `Tone` exposure lerps. Hud chip animates.
- **Size:** M. **Deps:** #53 extends the look table — build on top of it.
- **Test:** `hour.test.ts` `hourBlend` at boundaries; `weatherLook.test.ts` pattern for blended colours.

## Wave C — Reasons to come back

### P11 · Catch conditions on the server (enabler)
- **Pitch:** the lodge remembers when and under what sky each fish came in.
- **Borrowed:** Animal Crossing (every catch records time and weather for the Critterpedia).
- **Why fun:** `catch` rows hold species, weight, points, spot, clean, created_at only. "Night owl" or "rain pike" badges are impossible; deriving hour from `created_at` on the server breaks across timezones (client `lakeHour` uses local `getHours`). The field log already records weather (#53).
- **Sketch:** `types.ts` `CatchRequest` + `hour: LakeHour; sky: Sky` (optional for already-queued rows); `pendingCatches.isSubmission`; `routes/catches.ts` validate with `isLakeHour` / `SKIES`; `db.ts` migration like `clean` (`ALTER TABLE catch ADD COLUMN hour TEXT`, `sky TEXT`); `sameCatch` includes them; `toCatch` exposes; `Log.tsx` hour/sky column.
- **Size:** S. **Deps:** #53 for `Sky`. Client-asserted until anti-cheat lands (deferred).
- **Test:** `catches.test.ts` rejects a bad hour; `db.test.ts` migration adds columns on an old schema.

### P12 · Lodge badges
- **Pitch:** brass badges on the lodge wall — Four banks, Night owl, Rain pike, Clean sweep, Full book, Lodge record.
- **Borrowed:** Stardew achievements; Animal Crossing Nook Miles stamps; Webfishing journal milestones.
- **Why fun:** after 13 species the guide is done and lifetime points is the only long goal. Badges give mid-term goals that push players to night, rain, and the other banks.
- **Sketch:**
  - `shared/badges.ts`: `BADGES: { id, label, blurb, rule(facts) }[]`, `earnedBadges(facts)`; `BadgeFacts = { speciesCaught, perSpot, perHour, perSky, cleanCount, trophyCount, heaviest, total }`.
  - Facts: species counts and heaviest already come from `listSpeciesStats` (full-history `GROUP BY`); `perSpot/perHour/perSky/cleanCount` need one new `db.ts` query `listBadgeFacts(userId)` — must be SQL, since `listCatches` is `LIMIT 20` and `me.catches` is not history. `trophyCount` = rows where `isTrophyWeight(species, weight)` (`guide.ts`, from #50), computed in JS over the grouped rows.
  - `/api/me` returns `badges: string[]`; `Dock.tsx` diffs before/after a save → toast "Badge · Night owl" (reuse `.toast`); `Log.tsx` badge wall; board shows count.
- **Size:** M. **Deps:** P11.
- **Test:** `badges.test.ts` table-driven; `db.test.ts` facts query on seeded rows.

### P13 · Weekly board + species record wall
- **Pitch:** a fresh race every Monday, and a wall of who holds the heaviest of each species.
- **Borrowed:** Animal Crossing fishing tourney; Stardew museum donor plaques; Dredge's "the one that got away" chase.
- **Why fun:** `rankBoard` sorts lifetime points only — newcomers never catch leaders; weight is stored but nobody competes on it.
- **Sketch:**
  - `board.ts`: `BoardPeriod = "all" | "week"`; weekly stats sum points from catch rows since Monday (`listBoardStats(sinceIso)` filters the `LEFT JOIN`), `rankBoard` sorts on a `score` field; `speciesRecords()` SQL `MAX(weight) GROUP BY species_id` with holder.
  - `/api/board?period=week`, `/api/board/records`; `Board.tsx` tabs; landed card gets `lodgeStamp(records, species, weight)` beside `catchStamp` → "Lodge record · was 12.3 lb (Mara)".
- **Size:** M. **Deps:** none.
- **Test:** `board.test.ts` weekly rank from catch rows; `db.test.ts` records query.

### P14 · Tracks on the shore (async presence)
- **Pitch:** faint rings on the water where someone landed a fish in the last hour — "Mara · pike · reeds · 12 min ago".
- **Borrowed:** Webfishing (shared-lobby warmth); Journey / Dark Souls (asynchronous traces); Dredge (other sailors' logs).
- **Why fun:** the lodge is a table on another page and the lake feels empty. Async presence gives social warmth with no netcode.
- **Sketch:** `/api/lodge/recent` → last 20 catches lodge-wide (`display_name, species_id, spot, created_at`), 60 s cache; `Dock.tsx` polls every 2 min while idle; `scene/shoreTracks.ts` (pure: per-spot anchor point + `trackOpacity(age)`), `<ShoreTracks>` instanced rings on `waterHeight`, tap/hover chip. Display names only (already public on the board).
- **Size:** S/M. **Deps:** none.
- **Test:** `shoreTracks.test.ts` opacity curve and anchors inside `inLake`; `db.test.ts` recent query.

### P15 · Day-on-the-water recap → field-log trip
- **Pitch:** when you leave the dock, one card: fish, points, best, new entries — and "Write it in the book" files the session as a trip.
- **Borrowed:** Stardew end-of-day shipping summary; Dredge day roll-over; A Short Hike's quiet closure.
- **Why fun:** `keepLandedCatch` saves every fish with `tripId: null`, so the field log's Trips page never links game sessions; sessions end with no beat.
- **Sketch:** `game/session.ts` reducer over `game.outcome` changes (count, points, heaviest, firsts, clean), draft persisted at `stillwater.session.<userId>.v1`; recap opens from a HUD "Pack up" button or after 20 min idle (`main.tsx` uses `<BrowserRouter>` + `<Routes>`, so `useBlocker` is not available without moving to a data router); `visibilitychange`/`beforeunload` silently save the draft so the next visit can offer "Write yesterday in the book"; `logbook.ts` `keepPlayTrip(book, { date, hour, sky, catchIds }) → Trip` on `PLAY_LAKE`, sets `tripId` via `replaceCatch`; title "Dusk at the dock · overcast".
- **Size:** M. **Deps:** #53 for sky.
- **Test:** `logbook.test.ts` `keepPlayTrip` links catches and is idempotent; `session.test.ts`.

### P16 · Three-day forecast at the shack
- **Pitch:** a chalk board at the shack: today fog, tomorrow rain, Thursday clear — come back for pike.
- **Borrowed:** Stardew TV forecast; Animal Crossing morning announcements.
- **Why fun:** #53 seeds sky from the date (`weatherForDay`), so a forecast is free and it turns weather into a reason to return; `SKY_BLURB` already names the favoured fish.
- **Sketch:** `weather.ts` `forecast(date, days = 3)` → `weatherForDay(date + n)`; `components/ForecastBoard.tsx` beside `UpgradePanel` in the shop overlay (same overlay the queued requests board targets).
- **Size:** S. **Deps:** #53.
- **Test:** `weather.test.ts` deterministic forecast for a fixed date.

## Wave D — A bigger lake

### P17 · Lure classes (keeps the field-log tie-in)
- **Pitch:** the lures you packed in the field log each have a character — a Mepps turns bass and pike at dusk, a nightcrawler under a bobber pulls perch and catfish, a popper only works dawn and dusk.
- **Borrowed:** Stardew bait and tackle (spinner, trap bobber); Animal Crossing fish bait; real tackle lore.
- **Why fun:** `favorsLargeFish` is a regex that halves the pool by weight — lure choice is a coarse size switch. Keep lures sourced from `luresPacked(readTackle())` (the distinctive field-log link, lure saved on the catch) but give them depth.
- **Sketch:** `tackle.ts` `LURE_CLASSES: { match: RegExp, size, species?: Record<id, mul>, hours?: Partial<Record<LakeHour, number>> }[]` (spinner, spoon, crank, tube/jig, popper, fly/nymph, worm/crawler, bobber) + `lureClass(label)` with today's regex as the fallback class; `logic.ts` `poolForLure` keeps the size split, `appeal` multiplies by `species`/`hours`; FieldGuide clue "Draws on: Mepps, spinnerbait" (extends #50's lure-size clue); Gear page shows the class tag per row.
- **Size:** M. **Deps:** #50.
- **Test:** `biteMix.test.ts` — popper at night adds nothing; nightcrawler at night favours catfish; unknown label falls back to the size rule.

### P18 · Five new species + the Inlet bank
- **Pitch:** walleye at dusk off the point, crappie under the dock at dawn, largemouth in the lilies, whitefish deep, a ghost pike in the fog — and a fifth bank where the creek comes in, level 6.
- **Borrowed:** Stardew (location-specific fish lists); Animal Crossing (river-mouth species); Dredge (regions with their own catch).
- **Why fun:** 13 species, the point holds three. Content runs out by level 5 and the queued level 6–8 unlocks need somewhere to point.
- **Sketch:**
  - `fish.ts` +5 (walleye rare dusk/night dropoff+point; crappie common dock dawn; largemouth uncommon reeds+point; lake whitefish uncommon dropoff; ghost pike legendary inlet, fog/night); `hour.ts` `HOUR_SPECIES`; #53 `WEATHER_SPECIES`.
  - Inlet touches: `types.ts` `SpotId`, `progression.ts` `SPOT_IDS`/`SPOT_LABELS`/`canUseSpot` (`INLET_LEVEL` 6), `lake.ts` `INLET_PAD` + an inlet branch inserted *first* in `spotAt` (e.g. `x ≤ -14 && z ≤ -6 → "inlet"`) because the existing order claims every `x ≤ REEDS_MAX_X (-7)` as reeds and every `z ≤ LAKE_CENTER_Z` as drop-off; a new `WALK` box (no box covers that shore today); `STANCE_LABELS`; `bankWalk.ts` `INLET_WALK`; `LakeWorld.tsx` creek mesh + rocks; `me.ts` spots record; `useFishingGame` hint maps. `pendingCatches.isSubmission` already uses `SPOT_IDS`; `validateCatch` requires `species.spots.includes("inlet")`, so the new species rows carry it.
  - Current: `waitMotion.applyWaitShift` drifts more at the inlet.
- **Size:** L. **Deps:** level unlocks; P17 optional.
- **Test:** `rules.test.ts` spot lock; `lake.test.ts` `spotAt`/`walkableAt` for the pad; `biteMix.test.ts` per-spot pools.

### P19 · Rowboat open-water stance
- **Pitch:** at level 7 untie the canoe, row to the buoy over the deep hole, and cast anywhere in the basin while the boat rocks.
- **Borrowed:** Dredge (the boat is the game); A Short Hike (boat as a reward); Stardew (pier vs. open water).
- **Why fun:** the basin is scenery; sturgeon and salmon live at the drop-off only. A boat stance makes the middle a place, using the existing `MODELS.canoe` and `buoy.glb`.
- **Sketch:** new `SpotId "open"` on P18's pattern; `lake.ts` `OPEN_PAD` inside the basin and `spotAt` returns "open" inside `inRadius(OPEN_PAD)` checked first (`waterDepth` lives in `scene/water.ts`, not shared, so it cannot gate the rule); sturgeon/salmon/whitefish rows add `"open"` to `spots` or `validateCatch` rejects; `game/boat.ts` state machine `dock → rowing → anchored → rowingBack`; `Player.tsx` walking off while aboard; `Angler` root follows `boatPose` with the `Boat` rock math from `LakeWorld`; cast range ×1.3 from the boat; `landHoldPoint` offset to the gunwale; `canUseSpot("open", level ≥ 7)`.
- **Size:** L. **Deps:** P18, landing lift. Owner wrote "boats?" — needs a yes before D.
- **Test:** `boat.test.ts` state machine; `rules.test.ts` lock.

## Wave E — Golden hour

### P20 · Fight & landing camera
- **Pitch:** the camera leans in when the hook sets, tracks the run, then drops to a low three-quarter portrait as the fish comes up into your hands.
- **Borrowed:** Animal Crossing (catch pose + push-in); Stardew (zoom on the perfect catch); Dredge (catch reveal).
- **Why fun:** `CameraRig` only blends the target toward the chest/bobber midpoint (0.35) and shakes; distance stays wherever the player left it. The queued landing lift deserves a framed beat.
- **Sketch:** `scene/cameraBeats.ts` (pure) `fightFraming(surge, tension) → { distance, polar }`, `landingFraming(age)`; `CameraRig`: lerp `orbit.minDistance/maxDistance` toward 5.5 in `fight`, dolly to `landHoldPoint` + offset on `landView.active` for `LAND_PRESENT_SEC`, then the existing `returning` path. Honour `settings.reduceMotion`.
- **Size:** M. **Deps:** landing lift (same `updateLanding`/`landView` code), P8.
- **Test:** `cameraBeats.test.ts`; manual `?hour=dusk` landing.

### P21 · Catch photo → field log
- **Pitch:** as the fish is held up, the game snaps a photo and pins it to the field-log entry.
- **Borrowed:** Animal Crossing ("I caught a…!" pose); Webfishing screenshot culture.
- **Why fun:** the field log already stores catch photos (`photoStore.ts`, `putCatchPhoto`, 130 KB cap) for real trips; game catches arrive without one.
- **Sketch:** `Canvas gl={{ preserveDrawingBuffer: true }}` or a `useFrame` after render in `CaughtFish` when `landView.age` crosses `LAND_SWING_SEC + 0.2` → `gl.domElement.toDataURL("image/jpeg", 0.6)` downscaled to 640 px (reuse the canvas path in `photoFile.ts`); `Dock.saveFieldLog` → `putCatchPhoto` + `savePhotos`, respecting `catchPhotoWriteBlocked`.
- **Size:** M. **Deps:** P20 (portrait framing), landing lift.
- **Test:** pure `photoFrameAt(age)` in `landMotion.test.ts`; `photo.test.ts` caps already covered.

### P22 · Water: caustics, sun road, rim
- **Pitch:** light dances on the sand in the shallows, the sun road follows the real sun, the far water catches the sky.
- **Borrowed:** A Short Hike (flat water with sparkle); Animal Crossing (shallow caustics); Dredge (sky on the water).
- **Why fun:** `GLITTER_DIR` is fixed to the day sun `[38,-60]` even when `discPos` moves at dawn/dusk; the lakebed is flat vertex colour; the water is `MeshToonMaterial` + CPU `displaceWater` with no shader hook.
- **Sketch:** `SunGlitter` takes `look.discPos`; `makeCausticTexture()` (cell canvas, like `makeWaterDetailTexture`) on the bed material scrolled by `delta`, masked where `waterDepth < 0.4`; rim via `onBeforeCompile` on the water material adding `pow(1 - dot(n, v), 3) * skyColor`, or a small `ShaderMaterial` consuming the existing `color` attribute. Keep CPU displacement until the perf memo decides.
- **Size:** M. **Deps:** perf memo.
- **Test:** `water.test.ts` `glitterDirection(discPos)`; visual `?hour=dawn|dusk`.

### P23 · Atmosphere pass (quality-gated)
- **Pitch:** fireflies over the reeds at night, mist lying on the water at dawn and in fog, a soft bloom on the sun.
- **Borrowed:** Sunless Sea / Dredge (atmosphere through light and sound); Stardew (night fireflies); A Short Hike (golden hour).
- **Why fun:** night is the least-dressed hour (birds off, glitter off) yet carries the best rare odds (`HOUR_RARITY.night.rare` 1.4). It should be the most beautiful.
- **Sketch:** `scene/fireflies.ts` (pure positions over the reeds region + pulse) and `<Fireflies>` instanced, night only — same split as `skyWeather.ts`/`LakeRain.tsx`; `scene/mist.ts` + two scrolling translucent planes at y 0.15 for dawn/fog; sun bloom only if `@react-three/postprocessing` is added (new dep) behind `settings.quality === "full"`, otherwise a larger additive `look.glow` disc. Loons are on #53.
- **Size:** M. **Deps:** P8, #53.
- **Test:** `fireflies.test.ts` / `mist.test.ts` — counts and bounds inside `inLake`.

## Wave F — The long year

### P24 · Seasons on the lake
- **Pitch:** the lake has a year — ice at the edges in winter, cedars red in fall, salmon running in October, burbot in February.
- **Borrowed:** Animal Crossing (real-calendar availability); Stardew (seasonal fish lists).
- **Why fun:** #53's `dailyConditions` already computes `dayOfYear` and a seasonal cosine for water temp — a season layer is one step further and the genre's biggest replay driver.
- **Sketch:** `shared/season.ts` `lakeSeason(date)` by month + `?season=`; `SEASON_SPECIES` (salmon fall 2.0, burbot winter 2.0, carp summer 1.5, whitefish winter) + `SEASON_RARITY`; `logic.ts` `appeal` × season; `LakeWorld` `LAKE_SEASON_LOOK` tint on tree materials in `applyToon`, winter ice ring via `makeEdgeRingGeometry`; field guide clue adds season. Trade-off: real months lock content for weeks.
- **Size:** L. **Deps:** #53, #50.
- **Test:** `season.test.ts`; `biteMix.test.ts` season tables.

### P25 · Species lore + silhouettes
- **Pitch:** each species gets a true silhouette and two lines of lake lore; the landed card and the board use the same mark.
- **Borrowed:** Dredge (encyclopedia entries); Animal Crossing (Blathers blurbs); Stardew (fish descriptions).
- **Why fun:** `FieldGuide` draws one shared `SILHOUETTE` path for all 13; the landed card has no picture; names alone do not build attachment.
- **Sketch:** `fish.ts` `silhouette: string` (80×36 box) and `lore: string`; `FieldGuide.FishMark` uses it, unknown species render it at the #50 shadow size; `Dock.tsx` landed card, `Log.tsx`, P13 records wall.
- **Size:** S. **Deps:** none.
- **Test:** `fish.test.ts` — every species has a silhouette and lore ≤ 160 chars.

---

## Recommended order

| Wave | Goal (one line) | Items |
|---|---|---|
| A · Feel the bite | A first-time player lands a fish in three minutes and the strike feels like a strike. | P1 P2 P3 P4 P5 P6 |
| B · Reach every player | Phone, keyboard-only, screen reader, and a low-end laptop can all walk the whole shore. | P7 P8 P9 P10 |
| C · Reasons to come back | A reason to return tomorrow and a goal beyond lifetime points. | P11 P12 P13 P14 P15 P16 |
| D · A bigger lake | Lures, species, and places that keep levels 5–8 interesting. | P17 P18 P19 |
| E · Golden hour | The landing and the night look like the screenshots players share. | P20 P21 P22 P23 |
| F · The long year | A calendar and a book worth filling. | P24 P25 |

Sequencing notes: A and B are independent of the queued work except P1 (power via ref). C waits for #53 to merge. P20/P21 go after the landing lift since they share `updateLanding`. P22/P23 go after the perf memo and P8.

## Risks / open questions for the owner

1. **Boat stance (P19) and the Inlet (P18) both widen `SpotId` across shared, API (`me.ts` spots record), scene, and tests — L each.** Go, or keep the lake at four banks and spend D on P17 + species only?
2. **Lures stay bound to packed field-log gear (P17 keeps `luresPacked(readTackle())`).** Keep that link, or move to a server-side tackle inventory bought with points (needs a table + endpoint, and the field-log tie-in weakens)?
3. **`hour`/`sky`/`clean` on catches are client-asserted until the deferred anti-cheat.** P12 badges and the P13 weekly board raise the stakes of that — acceptable for now, or should C wait for the replay engine on `codex/gameplay`?

Also worth a call: seasons by real month (P24) vs a faster cadence; tap-to-walk vs a joystick for P7.
