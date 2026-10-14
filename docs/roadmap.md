# Stillwater roadmap

Living plan for the game. Two sources, both written on 2026-10-08: a whole-app review (fixes) and a design proposal (new upgrades). Each item ships as its own PR with tests; strike items through as they merge.

## In flight

- Weather of the day (#53): sky, fog, rain, bites and ambience follow the day.
- Fight teaches itself: visible controls, verb-first fight lines, surges that matter.
- Honest first hour: safe default lure, a shop that explains skills, cast feedback, level-up toast.

## Fixes from the review (do before new content)

1. **Fish you see is the fish you hook.** Roll the species when the wait starts, show its shadow colour and size (`shadowSize`), give landed fish their real size (`bodyScale` is capped at 0.95, so every fish looks the same), and let a too-heavy bite be a losing fight or a pass instead of a 1.4 s cutscene.
2. ~~**Touch can play.** Movement is keyboard-only, so phones can never leave the dock or reach the shack. Tap-to-walk or a stick, a HUD shop button, `prefers-reduced-motion`, 11 px minimum text, no email on the play HUD.~~ Tap-to-walk, bank signposts and an Open shop button shipped; P7 keeps only the thumb strike button.
3. ~~**Night and weather look.** Shadows off when the sun is hidden; a visible line and float at night (the line is near black on night water).~~ Shadows already soften to 0.3 under cloud (#53); the line turns pale and the float wears a lit tip at dusk and night.
4. **Smaller fixes.** Nibble timing is fully predictable; the Log summary uses the last 20 catches while the guide is all-time; the first game save seeds the sample logbook; one fish mesh for all 13 species; ~125 cloned scenery models with their own materials; charging a cast re-renders the page every frame; per-frame water normals and aim raycasts; copy nits (pale vs moss band, lure select keeps Space focus, mute not remembered, hour frozen at page load).

Already queued from the original plan: bubbling hotspot, level 4-8 unlocks, daily requests board, landing lift, scene memo and reset, camera clipping into the hill. Server-side catch verification is deferred.

## Next 25 upgrades

| # | Title | Area | Size | Wave | Depends on |
|---|---|---|---|---|---|
| P1 | ~~On-water cast band~~ (shipped) | feel | S | A | perf memo (power via ref) |
| P2 | ~~Hookset hit-stop + haptics~~ (shipped) | feel | S | A | — (#55 merged) |
| P3 | ~~Drag clicker (tension audio)~~ (shipped) | feel/audio | S | A | — |
| P4 | ~~First-cast walkthrough~~ (shipped) | onboarding | S/M | A | — |
| P5 | ~~Mercy bites for the first three fish~~ (shipped) | onboarding | S | A | — |
| P6 | ~~Fast recast from any result~~ (shipped) | QoL | S | A | — |
| P7 | ~~Tap-to-walk + thumb controls~~ (shipped) | mobile | M | B | — |
| P8 | ~~Settings & quality panel~~ (shipped) | access/QoL | S/M | B | — |
| P9 | ~~Screen reader & keyboard parity~~ (shipped) | access | S | B | — |
| P10 | ~~Live hour crossfade~~ (shipped) | visual/feel | M | B | #53 look table |
| P11 | ~~Catch conditions on the server~~ (shipped) | data enabler | S | C | #53 |
| P12 | ~~Lodge badges~~ (shipped) | progression | M | C | P11 |
| P13 | ~~Weekly board + species record wall~~ (shipped) | social | M | C | — |
| P14 | ~~Tracks on the shore (async presence)~~ (shipped) | social | S/M | C | — |
| P15 | ~~Day-on-the-water recap → field-log trip~~ (shipped) | journal | M | C | #53 |
| P16 | ~~Three-day forecast at the shack~~ (shipped) | retention | S | C | #53 |
| P17 | ~~Lure classes (keeps the field-log tie-in)~~ (shipped) | content | M | D | #50 |
| P18 | ~~Five new species + the Inlet bank~~ (shipped) | content | L | D | level unlocks |
| P19 | ~~Rowboat open-water stance~~ (shipped) | content | L | D | P18, landing lift |
| P20 | ~~Fight & landing camera~~ (shipped) | camera | M | E | landing lift, P8 |
| P21 | ~~Catch photo → field log~~ (shipped) | journal/visual | M | E | P20 |
| P22 | ~~Water: caustics, sun road, rim~~ (shipped) | visual | M | E | perf memo |
| P23 | ~~Atmosphere pass (fireflies, mist, bloom)~~ (shipped) | visual | M | E | P8, #53 |
| P24 | ~~Seasons on the lake~~ (shipped) | progression/content | L | F | #53, #50 |
| P25 | ~~Species lore + silhouettes~~ (shipped) | collection | S | F | — |

---

## Wave A — Feel the bite

### ~~P1 · On-water cast band~~ (shipped: the ring reads `powerRef` each frame, rust past a backlash; the bottom-right meter stays until P8)
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

### ~~P2 · Hookset hit-stop + haptics~~ (shipped)
- **Pitch:** the strike lands with an 80 ms freeze, a white blink, and a buzz in your hand.
- **Borrowed:** Dredge (rumble on the bite); Stardew ("!" + rod jolt); fighting-game hit-stop.
- **Why fun:** today the bite is two sine blips (`fx.bite`) plus a 0.05 shake on the plunge, and the strike itself (fight entry) is `fx.splash` plus a 0.09 shake in `CameraRig`. The strike is the moment the game is about; impact should be unmistakable — the hit-stop targets fight entry, the haptic targets both beats.
- **Sketch:**
  - `fx.ts`: `fx.haptic(pattern)` → `navigator.vibrate?.(pattern)`; patterns nibble `[15]`, bite `[40]`, surge start `[30,40,30]`, snap `[80]`, land `[20,30,60]`. Call sites already exist in `useFishingGame.ts` next to `fx.nibble/bite/surge/snap/land`. Note: `vibrate` is absent on iOS Safari — Android Chrome and desktop only.
  - Hit-stop render-side only: `fightView.freezeUntil` set in `FightMotion` on `prevPhase !== "fight" && phase === "fight"`; `LineAndBobber`, `HookedFish`, `CameraRig` skip their per-frame writes while `t < freezeUntil`. Do not pause `makeFight.step` — it schedules surges from wall-clock `nowMs`.
  - Blink: `.scene-wrap[data-phase="fight"]::after` white overlay, 1 frame, under the existing `prefers-reduced-motion` block (`index.css:1310`).
- **Size:** S. **Deps:** none (#55 is merged; build on its `strikeSplash.ts` timings).
- **Test:** `fx.test.ts` (on #53) with a mocked `navigator.vibrate`; `fightMotion.test.ts` `isFrozen(t, until)`.

### ~~P3 · Drag clicker (continuous tension audio)~~ (shipped)
- **Pitch:** the reel's drag sings — a tick that rises as tension climbs, a rasp when it goes red, a hiss when line pays out. Silence means slack.
- **Borrowed:** Stardew fishing bar (the whine you learn to react to); Dredge creaking rod.
- **Why fun:** the fight is tension management and the only continuous cue is `FightBar` colour. The clean-fight 1.5× depends on staying under `RED_TENSION` 0.8; an audible pre-red warning lets you watch the fish instead of the bar.
- **Sketch:**
  - `game/dragTone.ts` (pure): `dragTone(tension, surge, reeling) → { gain, hz, rasp, hiss }` — hz 120→420 over tension, rasp true ≥ 0.72, hiss when `!reeling && surge === 2`.
  - `fx.ts`: `fx.drag.start()/set(tone)/stop()` — looping sawtooth → bandpass → gain; `gain.setTargetAtTime`, rasp via `noiseBurst` at 3 Hz.
  - Call from the rAF loop in `useFishingGame.ts` where `fx.reel()` is throttled (`lastReelFx`); `fx.drag.stop()` in `clearFight()`.
- **Size:** S. **Deps:** none.
- **Test:** `dragTone.test.ts` (monotonic gain, rasp threshold); `fx.test.ts` asserts `setTargetAtTime` calls with a mocked `AudioContext`.

### ~~P4 · First-cast walkthrough~~ (shipped)
- **Pitch:** a new angler gets five quiet chips that light up as they do the thing — aim, charge, wait for the real dip, strike, ease on the run — then they vanish forever.
- **Borrowed:** A Short Hike (diegetic prompts, no modal); Stardew (Willy's rod moment); Animal Crossing (first-day nudges).
- **Why fun:** onboarding today is the `hint` string plus the `camera-help` key list. The nibble-then-bite rule and the band are only explained after a failure.
- **Sketch:**
  - `game/walkthrough.ts` (pure): `nextStep(step, snapshot)` over `{ stance, phase, cast, nibble, surge, reeling, outcome }`; steps `aim → charge → wait → strike → ease → landed`. Spawn is already the dock (`pose.ts` `DOCK_STAND_X/Z`), so step 1 is "aim".
  - `components/Walkthrough.tsx` reads `game.phase/stance/nibble/outcome` and `surfaceRef.dataset.cast`; chips reuse `.stance-chip` styling. Skip button.
  - Show only when `me.speciesStats` total caught is 0; persist done flag at `stillwater.walkthrough.<userId>.v1`.
- **Size:** S/M. **Deps:** none.
- **Test:** `walkthrough.test.ts` step machine; `Dock.test.tsx` (on #53) renders the first chip with zero stats.

### ~~P5 · Mercy bites for the first three fish~~ (shipped)
- **Pitch:** your first three fish come fast, bite hard, and fight fair.
- **Borrowed:** Stardew (training rod, easy early fish); A Short Hike (no-fail feel).
- **Why fun:** at level 1 on the dock by day, `pickBite` can draw carp (`minStrength` 3) at `OUT_OF_REACH_BITE` 0.35 → "Line parted" on cast one; `waitMs` is 2.2–6 s. `d1700d0` already fills in landable fish for big lures — extend that for newcomers.
- **Sketch:**
  - `logic.ts`: `pickBite(..., mercy)` → when true, pool = `canLand && rarity === "common"`, skip the out-of-reach weighting; `waitMs(patience, hour, mercy)` capped at 2600 ms; `hookWindowMs` +400.
  - `useFishingGame(profile, hour, lureRef, sky, caughtTotal)`; `Dock.tsx` passes `speciesStats.reduce(caught)`; mercy while `< 3`. No server change (`validateCatch` unaffected).
- **Size:** S. **Deps:** none.
- **Test:** extend `biteMix.test.ts` — 1000 mercy draws never yield `!canLand` or non-common.

### ~~P6 · Fast recast from any result~~ (shipped: click or Space casts past a miss or landed card after 450 ms; the 6 s card collapse was left out)
- **Pitch:** a miss or a landed card never blocks the next cast — click the water or press Space and you are charging.
- **Borrowed:** Cast n Chill / Webfishing zero-friction loop.
- **Why fun:** `strikeOrCast` has no `result` case; after a miss you must click "Cast again", after a landing "Keep fishing". Every extra click is loop friction.
- **Sketch:**
  - `useFishingGame.ts` `strikeOrCast`: `case "result": dismissResult(); startCast(via)` (keeps field-log save keyed on `outcome.id`).
  - `Dock.tsx`: landed card collapses to a small stamp after 6 s unless hovered; Enter = Keep fishing.
- **Size:** S. **Deps:** none.
- **Test:** `useFishingGame.test.tsx` harness — pointerdown in `result` → phase `casting`.

## Wave B — Reach every player

### ~~P7 · Tap-to-walk + thumb controls~~ (shipped: tap-to-walk, signposts and the shop button in #63; the round thumb Strike/Reel button on touch screens after)
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

### ~~P8 · Settings & quality panel~~ (shipped: HUD Settings button; shadows and sharpness apply on the next visit; the corner cast meter stays)
- **Pitch:** a small gear in the HUD: volume, shake, particles, shadows, sharpness, reel mode — remembered next visit.
- **Borrowed:** Stardew options; Dredge accessibility toggles (motion).
- **Why fun:** `fx.enabled` and `chosenLure` are in-memory (reset on reload); `Canvas` is fixed `shadows dpr=[1,1.75]`; shake amplitude fixed in `CameraRig`; `RAIN_COUNT` 128 whenever it rains. Low-end phones need a lever and the perf memo needs a place to land.
- **Sketch:**
  - `game/settings.ts`: typed store under `stillwater.settings.v1` `{ volume, shake, particles: "full"|"lite", shadows, dpr, reelMode: "hold"|"toggle", reduceMotion, lastLure }` + `useSettings()`.
  - `components/SettingsPanel.tsx` reusing `.shop-overlay`; HUD gear next to Mute.
  - `FishingWorld` `Canvas` props from settings; `CameraRig` `shakeAmp *= settings.shake`; `LakeRain` count from `particles`; `fx` master gain = volume; `Dock.tsx` initial lure from `lastLure` if still packed.
- **Size:** S/M. **Deps:** none; P7 and P23 consume it.
- **Test:** `settings.test.ts` parse/defaults/corrupt storage; existing `Dock.test.tsx`.

### ~~P9 · Screen reader & keyboard parity~~ (shipped: the shack focuses its panel, not a buy button, so a stray Space buys nothing)
- **Pitch:** every state change is spoken; every control reachable by Tab.
- **Borrowed:** — (hygiene, no borrow; Stardew and Dredge both ship this as plain options).
- **Why fun:** `.hint` has no `aria-live`; `FightBar` writes status via `textContent` on a ref so it is never announced; the shop overlay has no dialog role or focus trap; tension bar has no `role="meter"`. (Tension ticks at 55/80 % already exist — colour is not the only cue; keep them.)
- **Sketch:** `.hint` → `aria-live="polite"`; `FightBar` `role="meter" aria-valuenow` throttled to 4 Hz plus a visually-hidden live region for surge changes; shop overlay `role="dialog" aria-modal`, focus first button on open, restore on Esc; `strike-cue` keeps `role="alert"`.
- **Size:** S. **Deps:** none.
- **Test:** `FightBar.test.tsx` aria attributes; `Dock.test.tsx` focus moves into the shop.

### ~~P10 · Live hour crossfade~~ (shipped: a 30 s clock check turns the hour at a calm moment under a short veil, with the new hour swapped in at its darkest; the per-colour look-table lerp was left out)
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

### ~~P11 · Catch conditions on the server (enabler)~~ (shipped: older rows keep an empty hour and sky; the catch log shows a Conditions column)
- **Pitch:** the lodge remembers when and under what sky each fish came in.
- **Borrowed:** Animal Crossing (every catch records time and weather for the Critterpedia).
- **Why fun:** `catch` rows hold species, weight, points, spot, clean, created_at only. "Night owl" or "rain pike" badges are impossible; deriving hour from `created_at` on the server breaks across timezones (client `lakeHour` uses local `getHours`). The field log already records weather (#53).
- **Sketch:** `types.ts` `CatchRequest` + `hour: LakeHour; sky: Sky` (optional for already-queued rows); `pendingCatches.isSubmission`; `routes/catches.ts` validate with `isLakeHour` / `SKIES`; `db.ts` migration like `clean` (`ALTER TABLE catch ADD COLUMN hour TEXT`, `sky TEXT`); `sameCatch` includes them; `toCatch` exposes; `Log.tsx` hour/sky column.
- **Size:** S. **Deps:** #53 for `Sky`. Client-asserted until anti-cheat lands (deferred).
- **Test:** `catches.test.ts` rejects a bad hour; `db.test.ts` migration adds columns on an old schema.

### ~~P12 · Lodge badges~~ (shipped: six badges on a wall in the catch log and a toast when one lands; "Lodge record" became Trophy, a trophy-weight fish, since lodge-wide records belong to P13; the board count was left out)
- **Pitch:** brass badges on the lodge wall — Four banks, Night owl, Rain pike, Clean sweep, Full book, Lodge record.
- **Borrowed:** Stardew achievements; Animal Crossing Nook Miles stamps; Webfishing journal milestones.
- **Why fun:** after 13 species the guide is done and lifetime points is the only long goal. Badges give mid-term goals that push players to night, rain, and the other banks.
- **Sketch:**
  - `shared/badges.ts`: `BADGES: { id, label, blurb, rule(facts) }[]`, `earnedBadges(facts)`; `BadgeFacts = { speciesCaught, perSpot, perHour, perSky, cleanCount, trophyCount, heaviest, total }`.
  - Facts: species counts and heaviest already come from `listSpeciesStats` (full-history `GROUP BY`); `perSpot/perHour/perSky/cleanCount` need one new `db.ts` query `listBadgeFacts(userId)` — must be SQL, since `listCatches` is `LIMIT 20` and `me.catches` is not history. `trophyCount` = rows where `isTrophyWeight(species, weight)` (`guide.ts`, from #50), computed in JS over the grouped rows.
  - `/api/me` returns `badges: string[]`; `Dock.tsx` diffs before/after a save → toast "Badge · Night owl" (reuse `.toast`); `Log.tsx` badge wall; board shows count.
- **Size:** M. **Deps:** P11.
- **Test:** `badges.test.ts` table-driven; `db.test.ts` facts query on seeded rows.

### ~~P13 · Weekly board + species record wall~~ (shipped: the week restarts Monday 00:00 UTC for the whole lodge; empty record slots stay "Unknown" so the wall spoils no species)
- **Pitch:** a fresh race every Monday, and a wall of who holds the heaviest of each species.
- **Borrowed:** Animal Crossing fishing tourney; Stardew museum donor plaques; Dredge's "the one that got away" chase.
- **Why fun:** `rankBoard` sorts lifetime points only — newcomers never catch leaders; weight is stored but nobody competes on it.
- **Sketch:**
  - `board.ts`: `BoardPeriod = "all" | "week"`; weekly stats sum points from catch rows since Monday (`listBoardStats(sinceIso)` filters the `LEFT JOIN`), `rankBoard` sorts on a `score` field; `speciesRecords()` SQL `MAX(weight) GROUP BY species_id` with holder.
  - `/api/board?period=week`, `/api/board/records`; `Board.tsx` tabs; landed card gets `lodgeStamp(records, species, weight)` beside `catchStamp` → "Lodge record · was 12.3 lb (Mara)".
- **Size:** M. **Deps:** none.
- **Test:** `board.test.ts` weekly rank from catch rows; `db.test.ts` records query.

### ~~P14 · Tracks on the shore (async presence)~~ (shipped: the latest two show as a "Lately on the lake" note above the hint instead of a tap chip on each ring; your own catches are left out)
- **Pitch:** faint rings on the water where someone landed a fish in the last hour — "Mara · pike · reeds · 12 min ago".
- **Borrowed:** Webfishing (shared-lobby warmth); Journey / Dark Souls (asynchronous traces); Dredge (other sailors' logs).
- **Why fun:** the lodge is a table on another page and the lake feels empty. Async presence gives social warmth with no netcode.
- **Sketch:** `/api/lodge/recent` → last 20 catches lodge-wide (`display_name, species_id, spot, created_at`), 60 s cache; `Dock.tsx` polls every 2 min while idle; `scene/shoreTracks.ts` (pure: per-spot anchor point + `trackOpacity(age)`), `<ShoreTracks>` instanced rings on `waterHeight`, tap/hover chip. Display names only (already public on the board).
- **Size:** S/M. **Deps:** none.
- **Test:** `shoreTracks.test.ts` opacity curve and anchors inside `inLake`; `db.test.ts` recent query.

### ~~P15 · Day-on-the-water recap → field-log trip~~ (shipped: a HUD "Pack up" button and a "Your last trip" card on the next day's visit; no 20-minute idle trigger, and the card shows fish, heaviest, new species and clean fights rather than points)
- **Pitch:** when you leave the dock, one card: fish, points, best, new entries — and "Write it in the book" files the session as a trip.
- **Borrowed:** Stardew end-of-day shipping summary; Dredge day roll-over; A Short Hike's quiet closure.
- **Why fun:** `keepLandedCatch` saves every fish with `tripId: null`, so the field log's Trips page never links game sessions; sessions end with no beat.
- **Sketch:** `game/session.ts` reducer over `game.outcome` changes (count, points, heaviest, firsts, clean), draft persisted at `stillwater.session.<userId>.v1`; recap opens from a HUD "Pack up" button or after 20 min idle (`main.tsx` uses `<BrowserRouter>` + `<Routes>`, so `useBlocker` is not available without moving to a data router); `visibilitychange`/`beforeunload` silently save the draft so the next visit can offer "Write yesterday in the book"; `logbook.ts` `keepPlayTrip(book, { date, hour, sky, catchIds }) → Trip` on `PLAY_LAKE`, sets `tripId` via `replaceCatch`; title "Dusk at the dock · overcast".
- **Size:** M. **Deps:** #53 for sky.
- **Test:** `logbook.test.ts` `keepPlayTrip` links catches and is idempotent; `session.test.ts`.

### ~~P16 · Three-day forecast at the shack~~ (shipped)
- **Pitch:** a chalk board at the shack: today fog, tomorrow rain, Thursday clear — come back for pike.
- **Borrowed:** Stardew TV forecast; Animal Crossing morning announcements.
- **Why fun:** #53 seeds sky from the date (`weatherForDay`), so a forecast is free and it turns weather into a reason to return; `SKY_BLURB` already names the favoured fish.
- **Sketch:** `weather.ts` `forecast(date, days = 3)` → `weatherForDay(date + n)`; `components/ForecastBoard.tsx` beside `UpgradePanel` in the shop overlay (same overlay the queued requests board targets).
- **Size:** S. **Deps:** #53.
- **Test:** `weather.test.ts` deterministic forecast for a fixed date.

## Wave D — A bigger lake

### ~~P17 · Lure classes (keeps the field-log tie-in)~~ (shipped: nine classes; a class leans harder on the fish it names and, on a full cast, reaches a little across the size line, e.g. live bait pulls catfish at night; field-log gear stays the lure source)
- **Pitch:** the lures you packed in the field log each have a character — a Mepps turns bass and pike at dusk, a nightcrawler under a bobber pulls perch and catfish, a popper only works dawn and dusk.
- **Borrowed:** Stardew bait and tackle (spinner, trap bobber); Animal Crossing fish bait; real tackle lore.
- **Why fun:** `favorsLargeFish` is a regex that halves the pool by weight — lure choice is a coarse size switch. Keep lures sourced from `luresPacked(readTackle())` (the distinctive field-log link, lure saved on the catch) but give them depth.
- **Sketch:** `tackle.ts` `LURE_CLASSES: { match: RegExp, size, species?: Record<id, mul>, hours?: Partial<Record<LakeHour, number>> }[]` (spinner, spoon, crank, tube/jig, popper, fly/nymph, worm/crawler, bobber) + `lureClass(label)` with today's regex as the fallback class; `logic.ts` `poolForLure` keeps the size split, `appeal` multiplies by `species`/`hours`; FieldGuide clue "Draws on: Mepps, spinnerbait" (extends #50's lure-size clue); Gear page shows the class tag per row.
- **Size:** M. **Deps:** #50.
- **Test:** `biteMix.test.ts` — popper at night adds nothing; nightcrawler at night favours catfish; unknown label falls back to the size rule.

### ~~P18 · Five new species + the Inlet bank~~ (shipped: crappie, largemouth, lake whitefish, walleye and a legendary ghost pike; the inlet opens at level 6 up the west shore, where a creek runs in and its current carries the float out from the mouth)
- **Pitch:** walleye at dusk off the point, crappie under the dock at dawn, largemouth in the lilies, whitefish deep, a ghost pike in the fog — and a fifth bank where the creek comes in, level 6.
- **Borrowed:** Stardew (location-specific fish lists); Animal Crossing (river-mouth species); Dredge (regions with their own catch).
- **Why fun:** 13 species, the point holds three. Content runs out by level 5 and the queued level 6–8 unlocks need somewhere to point.
- **Sketch:**
  - `fish.ts` +5 (walleye rare dusk/night dropoff+point; crappie common dock dawn; largemouth uncommon reeds+point; lake whitefish uncommon dropoff; ghost pike legendary inlet, fog/night); `hour.ts` `HOUR_SPECIES`; #53 `WEATHER_SPECIES`.
  - Inlet touches: `types.ts` `SpotId`, `progression.ts` `SPOT_IDS`/`SPOT_LABELS`/`canUseSpot` (`INLET_LEVEL` 6), `lake.ts` `INLET_PAD` + an inlet branch inserted *first* in `spotAt` (e.g. `x ≤ -14 && z ≤ -6 → "inlet"`) because the existing order claims every `x ≤ REEDS_MAX_X (-7)` as reeds and every `z ≤ LAKE_CENTER_Z` as drop-off; a new `WALK` box (no box covers that shore today); `STANCE_LABELS`; `bankWalk.ts` `INLET_WALK`; `LakeWorld.tsx` creek mesh + rocks; `me.ts` spots record; `useFishingGame` hint maps. `pendingCatches.isSubmission` already uses `SPOT_IDS`; `validateCatch` requires `species.spots.includes("inlet")`, so the new species rows carry it.
  - Current: `waitMotion.applyWaitShift` drifts more at the inlet.
- **Size:** L. **Deps:** level unlocks; P17 optional.
- **Test:** `rules.test.ts` spot lock; `lake.test.ts` `spotAt`/`walkableAt` for the pad; `biteMix.test.ts` per-spot pools.

### ~~P19 · Rowboat open-water stance~~ (shipped: at level 7 "Row out" at the dock rows the rowboat to an anchor over the deep hole; open water is its own bank there with perch, whitefish, walleye, salmon and sturgeon, casts fly 30% farther, and "Row back" brings you home)
- **Pitch:** at level 7 untie the canoe, row to the buoy over the deep hole, and cast anywhere in the basin while the boat rocks.
- **Borrowed:** Dredge (the boat is the game); A Short Hike (boat as a reward); Stardew (pier vs. open water).
- **Why fun:** the basin is scenery; sturgeon and salmon live at the drop-off only. A boat stance makes the middle a place, using the existing `MODELS.canoe` and `buoy.glb`.
- **Sketch:** new `SpotId "open"` on P18's pattern; `lake.ts` `OPEN_PAD` inside the basin and `spotAt` returns "open" inside `inRadius(OPEN_PAD)` checked first (`waterDepth` lives in `scene/water.ts`, not shared, so it cannot gate the rule); sturgeon/salmon/whitefish rows add `"open"` to `spots` or `validateCatch` rejects; `game/boat.ts` state machine `dock → rowing → anchored → rowingBack`; `Player.tsx` walking off while aboard; `Angler` root follows `boatPose` with the `Boat` rock math from `LakeWorld`; cast range ×1.3 from the boat; `landHoldPoint` offset to the gunwale; `canUseSpot("open", level ≥ 7)`.
- **Size:** L. **Deps:** P18, landing lift. Owner wrote "boats?" — needs a yes before D.
- **Test:** `boat.test.ts` state machine; `rules.test.ts` lock.

## Wave E — Golden hour

### ~~P20 · Fight & landing camera~~ (shipped: the camera leans in on the hook, closer on a hard pull, eases back on a run, comes in close on the fish in your hands, then gives back the distance you had; it only ever comes closer, and reduced motion keeps it still. The polar drop was left out)
- **Pitch:** the camera leans in when the hook sets, tracks the run, then drops to a low three-quarter portrait as the fish comes up into your hands.
- **Borrowed:** Animal Crossing (catch pose + push-in); Stardew (zoom on the perfect catch); Dredge (catch reveal).
- **Why fun:** `CameraRig` only blends the target toward the chest/bobber midpoint (0.35) and shakes; distance stays wherever the player left it. The queued landing lift deserves a framed beat.
- **Sketch:** `scene/cameraBeats.ts` (pure) `fightFraming(surge, tension) → { distance, polar }`, `landingFraming(age)`; `CameraRig`: lerp `orbit.minDistance/maxDistance` toward 5.5 in `fight`, dolly to `landHoldPoint` + offset on `landView.active` for `LAND_PRESENT_SEC`, then the existing `returning` path. Honour `settings.reduceMotion`.
- **Size:** M. **Deps:** landing lift (same `updateLanding`/`landView` code), P8.
- **Test:** `cameraBeats.test.ts`; manual `?hour=dusk` landing.

### ~~P21 · Catch photo → field log~~ (shipped: a 640 px JPEG snapped in the scene at `PHOTO_AGE` and pinned to the catch by the dock; a photo the player chose is never replaced)
- **Pitch:** as the fish is held up, the game snaps a photo and pins it to the field-log entry.
- **Borrowed:** Animal Crossing ("I caught a…!" pose); Webfishing screenshot culture.
- **Why fun:** the field log already stores catch photos (`photoStore.ts`, `putCatchPhoto`, 130 KB cap) for real trips; game catches arrive without one.
- **Sketch:** `Canvas gl={{ preserveDrawingBuffer: true }}` or a `useFrame` after render in `CaughtFish` when `landView.age` crosses `LAND_SWING_SEC + 0.2` → `gl.domElement.toDataURL("image/jpeg", 0.6)` downscaled to 640 px (reuse the canvas path in `photoFile.ts`); `Dock.saveFieldLog` → `putCatchPhoto` + `savePhotos`, respecting `catchPhotoWriteBlocked`.
- **Size:** M. **Deps:** P20 (portrait framing), landing lift.
- **Test:** pure `photoFrameAt(age)` in `landMotion.test.ts`; `photo.test.ts` caps already covered.

### ~~P22 · Water: caustics, sun road, rim~~ (shipped: the sun road follows the hour's disc; two drifting caustic nets on the shelf, scaled by glint; rim measured against the lake's up, not the chop normals, which washed near water out)
- **Pitch:** light dances on the sand in the shallows, the sun road follows the real sun, the far water catches the sky.
- **Borrowed:** A Short Hike (flat water with sparkle); Animal Crossing (shallow caustics); Dredge (sky on the water).
- **Why fun:** `GLITTER_DIR` is fixed to the day sun `[38,-60]` even when `discPos` moves at dawn/dusk; the lakebed is flat vertex colour; the water is `MeshToonMaterial` + CPU `displaceWater` with no shader hook.
- **Sketch:** `SunGlitter` takes `look.discPos`; `makeCausticTexture()` (cell canvas, like `makeWaterDetailTexture`) on the bed material scrolled by `delta`, masked where `waterDepth < 0.4`; rim via `onBeforeCompile` on the water material adding `pow(1 - dot(n, v), 3) * skyColor`, or a small `ShaderMaterial` consuming the existing `color` attribute. Keep CPU displacement until the perf memo decides.
- **Size:** M. **Deps:** perf memo.
- **Test:** `water.test.ts` `glitterDirection(discPos)`; visual `?hour=dawn|dusk`.

### ~~P23 · Atmosphere pass (quality-gated)~~ (shipped: fireflies over the three reed beds on dry nights, blinking; mist puffs in two sheets at dawn and in fog, none in rain; no postprocessing dep, the bloom is a wide additive halo on Full effects. The Rain setting became Effects and Lite halves fireflies and mist too)
- **Pitch:** fireflies over the reeds at night, mist lying on the water at dawn and in fog, a soft bloom on the sun.
- **Borrowed:** Sunless Sea / Dredge (atmosphere through light and sound); Stardew (night fireflies); A Short Hike (golden hour).
- **Why fun:** night is the least-dressed hour (birds off, glitter off) yet carries the best rare odds (`HOUR_RARITY.night.rare` 1.4). It should be the most beautiful.
- **Sketch:** `scene/fireflies.ts` (pure positions over the reeds region + pulse) and `<Fireflies>` instanced, night only — same split as `skyWeather.ts`/`LakeRain.tsx`; `scene/mist.ts` + two scrolling translucent planes at y 0.15 for dawn/fog; sun bloom only if `@react-three/postprocessing` is added (new dep) behind `settings.quality === "full"`, otherwise a larger additive `look.glow` disc. Loons are on #53.
- **Size:** M. **Deps:** P8, #53.
- **Test:** `fireflies.test.ts` / `mist.test.ts` — counts and bounds inside `inLake`.

## Wave F — The long year

### ~~P24 · Seasons on the lake~~ (shipped: real calendar months, with `?season=` to pin one; seasons only lean the odds inside what the angler can land, so no fish is ever locked away; fall turns the broadleaves red and orange, winter frosts the trees, snows the hills and rims the shore with ice, spring freshens the green; the HUD eyebrow names the season and the field guide says when a logged fish runs)
- **Pitch:** the lake has a year — ice at the edges in winter, cedars red in fall, salmon running in October, burbot in February.
- **Borrowed:** Animal Crossing (real-calendar availability); Stardew (seasonal fish lists).
- **Why fun:** #53's `dailyConditions` already computes `dayOfYear` and a seasonal cosine for water temp — a season layer is one step further and the genre's biggest replay driver.
- **Sketch:** `shared/season.ts` `lakeSeason(date)` by month + `?season=`; `SEASON_SPECIES` (salmon fall 2.0, burbot winter 2.0, carp summer 1.5, whitefish winter) + `SEASON_RARITY`; `logic.ts` `appeal` × season; `LakeWorld` `LAKE_SEASON_LOOK` tint on tree materials in `applyToon`, winter ice ring via `makeEdgeRingGeometry`; field guide clue adds season. Trade-off: real months lock content for weeks.
- **Size:** L. **Deps:** #53, #50.
- **Test:** `season.test.ts`; `biteMix.test.ts` season tables.

### ~~P25 · Species lore + silhouettes~~ (shipped: distinct marks for all 18 species across the guide, landed card, log and record wall; caught fish have lake lore, and empty records stay secret)
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

## Wave G — Lived-in year (added 2026-10-14, after P1-P25 shipped)

Claude picked these to build on the seasons; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| G1 | ~~Seasonal ambience~~ (shipped) | audio | S |
| G2 | ~~Season on each catch + a Four seasons badge~~ (shipped) | progression | M |
| G3 | ~~Daily requests ask for in-season fish~~ (shipped) | retention | S |
| G4 | ~~Keep the camera out of hills and trees~~ (shipped) | camera | M |
| G5 | ~~Auto quality: step down to Lite effects when frames sag~~ (shipped) | perf | S/M |

- **G1 · Seasonal ambience.** Geese pass over on fall days; winter swaps crickets and loons for a chickadee by day, quiet nights and a wind loop. `ambientProfile(hour, sky, season)` in `fx.ts`.
- **G2 · Season on each catch.** Store the season with hour and sky (P11) and add a badge for landing a fish in all four; the field log trip notes the season.
- **G3 · In-season requests.** The daily board leans its asks toward fish the season favours (`SEASON_SPECIES`), so the board and the lake tell the same story.
- **G4 · Camera clipping.** The follow and fight cameras can sink into the hill behind the Point and the trees on the west shore; pull the camera in along its ray when terrain or a trunk sits between it and the angler.
- **G5 · Auto quality.** If the frame rate stays under ~40 fps for a few seconds, switch effects to Lite once and say so in a toast; Settings can turn it back.

## Wave H — Lighter, livelier lake (added 2026-10-14, after Wave G shipped)

Claude picked these after Wave G; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| H1 | ~~Load the 3D lake on demand~~ (shipped) | perf | S/M |
| H2 | ~~A heron wades the reed shallows~~ (shipped) | wildlife | M |
| H3 | ~~Save the landed card as a picture~~ (shipped) | share | S/M |
| H4 | ~~Tension bar that reads without colour~~ (shipped) | a11y | S |
| H5 | ~~Species of the week on the weekly board~~ (shipped) | retention | M |

- **H1 · Split the bundle.** The whole game ships as one 1.6 MB script (466 kB gzipped), so the sign-in page waits for three.js. Lazy-load the play scene and the field log routes so sign-in, the board and the catch log open fast.
- **H2 · Heron.** By day a grey heron stands in the reed shallows, stalks and stabs now and then, and lifts off when the angler walks close; gone at night and in rain. Pure position functions with tests, like the fireflies.
- **H3 · Share card.** From the landed card, save a PNG with the catch photo, species, weight, bank, hour and season; no upload, the file stays on the device.
- **H4 · Tension without colour.** The fight bar marks its danger zone with a pattern and a notch, and says "too tight" / "slack" in text for screen readers, so the fight reads for colour-blind players.
- **H5 · Species of the week.** The weekly board names one species each Monday (seeded, in season) and pays a small bonus for it, so the week has a target.

## Wave I — Out on the water more often (added 2026-10-14, after Wave H shipped)

Claude picked these after Wave H; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| I1 | ~~Install the lake as an app, open offline~~ (shipped) | platform | M |
| I2 | ~~Dragonflies over the reeds on warm days~~ (shipped) | wildlife | S/M |
| I3 | ~~Ducks on the open water that scatter from a close cast~~ (shipped) | wildlife | M |
| I4 | ~~Rare golden fish~~ (shipped) | collection | M/L |
| I5 | ~~Play with a gamepad~~ (shipped) | input | S/M |

- **I1 · Installable, opens offline.** A web manifest and icons so phones and desktops can install Stillwater, and a small service worker (production builds only) that keeps the app shell, built assets and models so the field log opens without a network. The lake itself needs the API, so offline it shows a card pointing to the field log instead of bouncing to sign-in. The API is never cached.
- **I2 · Dragonflies.** The two figure-eight dragonflies by the dock become seven that hover and dart over the three reed beds, only on dry spring and summer days and evenings; pure position functions with tests, like the fireflies.
- **I3 · Ducks.** The ducks already paddle their loops by day; a cast that lands close sends them flapping off, and they drift back later. Motion in pure functions with tests, like the heron.
- **I4 · Golden fish.** About one fish in forty lands golden, rolled from a hash of the catch's request ID so the card, the server and offline retries agree. It pays double (stacking with the fish of the week), keeps a `golden` column, shows gold on the landed card, the held-up fish and the log, and earns the "Gold" badge. Older catches stay plain.
- **I5 · Gamepad.** A connected controller walks with the left stick, aims with the right stick (an on-screen ring cursor), casts, strikes and reels with A or the right trigger, opens the shop with Y and closes panels with B. It replays as the same keys and pointer moves, so no game code forks.

## Wave J — Evenings, habits and choices (added 2026-10-14, after Wave I shipped)

Claude picked these after Wave I; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| J1 | ~~Controller hints on screen~~ (shipped) | input | S |
| J2 | ~~Lanterns on the dock and the shack after dark~~ (shipped) | scene | S/M |
| J3 | ~~Catch and release~~ (shipped) | gameplay | M/L |
| J4 | ~~Days-on-the-water streak~~ (shipped) | retention | M |
| J5 | ~~Weather that turns during a session~~ (shipped) | weather | M |

- **J1 · Pad hints.** When a controller is connected, the controls strip shows its buttons (A cast, sticks walk and aim, Y shop) instead of the mouse and keyboard ones.
- **J2 · Lanterns.** At dusk (60%) and night, warm lanterns on the dock's lake-end posts and by the shack light the boards with two point lights, and small glow-only lanterns sit on each bank post, so night fishing has a place to stand in.
- **J3 · Catch and release.** The landed card offers Release next to Keep fishing. The catch is saved on landing, so releasing marks it afterwards (`POST /api/catches/:requestId/release`): the fish drops from the hand back into the water with a ring, keeps its points (taking points back after the save would race spending and the offline queue), shows "Released" in the catch log, and counts toward the "Steward" badge at ten.
- **J4 · Streak.** Each catch now carries the angler's local day. Landing a fish on consecutive local days builds a streak shown on the HUD (from two days) and the catch log, with a "Regular" badge at seven days. The current run survives until a whole day is missed; nothing is taken away. Catches saved before days were sent don't count.
- **J5 · Weather turns.** About one day in three the sky turns once, on a seeded local hour: clouds build (clear to overcast, overcast to rain) or rain eases in the afternoon, and fog burns off in the morning. The shack's chalk board shows the turn ("Turns overcast around 16:00"), and on the bank it rolls in under the same veil as the hour turnover, waiting for a calm moment. `?sky=` still pins it.

## Wave K — Weather you can feel (added 2026-10-14, after Wave J shipped)

Claude picked these after Wave J; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| K1 | ~~Snow instead of rain in winter~~ (shipped) | weather | M |
| K2 | ~~Moon phases at night~~ (shipped) | sky | M |
| K3 | ~~A loon you can see on the open water~~ (shipped) | wildlife | M |
| K4 | ~~Wind that pushes the float~~ (shipped) | weather/gameplay | M/L |
| K5 | ~~Larger text setting~~ (shipped) | accessibility | S |

- **K1 · Snow.** A rainy winter day snows instead: slow flakes drifting over the lake and shore that melt on the water, no rain hiss, and "Snow" on the HUD, the chalk board, the veil line and the catch log. Fish read it as rain, so nothing about the odds changes.
- **K2 · Moon phases.** The night moon shows the real lunar phase (a lit crescent, quarter or gibbous with a faint earthshine side), the moonlight and its glow scale with how much is lit (a new moon keeps 55% of the light so night stays playable), and the HUD eyebrow and the chalk board name a full or new moon. Near full (over 75% lit), rare and legendary fish come up to 15% more at night, reshuffled within what the angler can land. `?moon=0..1` pins the phase.
- **K3 · Loon.** The loon you hear at night gets a body: at dusk and night (not in winter) it paddles a slow loop on open water north of the dock, dives every half minute and comes up well along the loop with a ring, tips its head back when it calls, and its call is panned and softened by where it swims relative to the camera. It keeps to its loop rather than chasing the float.
- **K4 · Wind.** The day's wind (the same one the field log records) walks a sitting float downwind: 4 cm a second on a light day, 8 when breezy, 13 when strong, for up to 25 seconds, never onto the shore or the dock. A bite and the fight start where the float drifted to. The sky chip's tooltip names the wind. The chop itself does not lean with it yet.
- **K5 · Text size.** Settings offers Normal, Large (1.15x) and Larger (1.3x) text, kept per browser like the other settings. It scales the HUD, footer panels, cards, toasts, Settings, the field log and lodge pages, and the sign-in screens; the lake and its canvas keep their size.

## Wave L — Reading the lake (added 2026-10-14, after Wave K shipped)

Claude picked these after Wave K; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| L1 | ~~Ripples that run with the wind~~ (shipped) | weather/visual | S |
| L2 | ~~Stars and a rare shooting star on clear nights~~ (shipped) | sky | S/M |
| L3 | ~~Cloud shadows sliding over the water on fair days~~ (shipped) | weather/visual | S/M |
| L4 | ~~A rod bell that rings on a nibble after dark~~ (shipped) | gameplay/a11y | S/M |
| L5 | ~~Dawn chorus in spring and summer~~ (shipped) | audio | S |

- **L1 · Wind on the water.** The surface streaks and dapple scroll downwind with the day's wind (the one that walks the float since K4), faster on breezy and strong days; a calm day keeps the old slow drift.
- **L2 · Stars.** Clear nights show a field of stars that fades with the moon's light and hides under cloud, rain or fog, and the lake carries their shimmering reflection (the hills hide most of the sky from the dock, so the reflection is what you see first). About once every 40 seconds a shooting star crosses the northern sky, unless Reduce motion is on.
- **L3 · Cloud shadows.** On clear days (softer at dawn and dusk, none at night or under grey skies) soft cloud shadows slide across the water: east on a still day, downwind on a windy one. They stay on the water so they never clip into the banks.
- **L4 · Rod bell.** At night, while a line is in the water, a small brass bell hangs under the rod tip. It jumps and jingles on a nibble (the hint line, which screen readers hear, says so) and swings and rings hard on the bite.
- **L5 · Dawn chorus.** Spring and summer dawns (unless it rains) swap the daytime's occasional two-note call for a busy chorus of overlapping warbles, trills and calls at varied pitch and loudness. It gives way to the usual birds when the hour turns to day.

## Wave M — Reasons to try another bank (added 2026-10-14, after Wave L shipped)

Claude picked these after Wave L; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| M1 | ~~Hot bank of the day~~ (shipped) | gameplay/retention | S/M |
| M2 | ~~Evening rise: fish dimpling the water at dusk~~ (shipped) | gameplay/visual | M |
| M3 | ~~Frogs in the reeds at dusk~~ (shipped) | audio | S |
| M4 | ~~Early bird badge~~ (shipped) | progression | S |
| M5 | ~~Snags in the reeds~~ (shipped) | gameplay | M |

- **M1 · Hot bank.** Each local day one bank (dock, reeds, drop-off, point or inlet) runs hot: bites come a fifth sooner there. Every bank gets its day once in five, never two days running. The shack's chalk board names it for each of the three days, and the bank chip reads "biting today" while you stand on it.
- **M2 · Evening rise.** On dry dusks in spring and summer with calm or light wind, rings spread on the water in reach of your bank (a new one every couple of seconds, each fresh for six), and the bank chip says "fish rising". A cast within 1.3 m of a fresh ring says "Right on a rise." and bites in 70% of the usual wait.
- **M3 · Frogs.** Spring and summer dusks and nights get runs of spring-peeper whistles and the odd green frog's low banjo "gunk", rain or not.
- **M4 · Early bird.** A lodge badge for landing ten fish at dawn, counted from the hour already saved on each catch, so earlier dawn catches count.
- **M5 · Snags.** About three in ten casts that land in the reeds' shallow weed foul on it just after settling (never a new angler's first easy fish). No fish bites until three taps of strike work it free ("Working it free… 2 of 3"), then the wait starts over as usual. Nothing is lost; casting past the weed avoids it.

## Wave N — Fights and finishing touches (added 2026-10-14, after Wave M shipped)

Claude picked these after Wave M; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| N1 | ~~Trout, bass and salmon leap mid-fight~~ (shipped) | fight | M |
| N2 | ~~A one-line fish story on the landed card and in the log~~ (dropped) | journal | S/M |
| N3 | ~~Left-handed layout for the thumb controls~~ (shipped) | mobile/a11y | S |
| N4 | ~~High-contrast panels setting~~ (shipped) | a11y | S/M |
| N5 | ~~A windsock by the pier that shows the day's wind~~ (shipped) | scene | S |

- **N1 · Leaps.** Every second run of a brook or rainbow trout, a bass or a salmon is a leap: a longer warning ("Let go now — it's coming up!"), then the fish clears the water nose first, turns over and falls back with a splash ("BOW — it's jumping!"). Holding the line tight through a leap past a short grace loads the rod into the red and costs the clean bonus, but never the fish, so the slow-angler guarantees still hold.
- **N2 · Fish story.** Dropped by Claude: the landed card already shows the fish, weight, bank and lure, and the catch log shows bank, hour, sky and season, so the line would only repeat them.
- **N3 · Left-handed.** A Settings checkbox that moves the touch-screen Strike/Reel button and the cast meter to the left. On phones the bank signs already span the full width, so they stay put.
- **N4 · High contrast.** A Settings checkbox that makes the panels over the lake solid with 2 px bright borders and no blur, and lifts dimmed text to full strength. The current bank sign and the strike button at the bite keep their amber.
- **N5 · Windsock.** The shack has no roof to put a vane on, so a striped windsock stands on a pole at the pier's left rail, in view from the dock. It points downwind with the day's wind (the one that walks the float), hangs limp on a calm day, stands out on a strong one, and flutters more as it fills.

## Wave O — Telling players, and a few more lake moments (added 2026-10-14, after Wave N shipped)

Claude picked these after Wave N; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~O1~~ | ~~"New on the lake" card for returning anglers~~ (#132) | onboarding | S |
| ~~O2~~ | ~~Angler titles by level~~ (#133) | progression | S |
| ~~O3~~ | ~~Photo mode: hide the panels with H~~ (#134) | QoL | S |
| ~~O4~~ | ~~Thunder and lightning on stormy rain days~~ (#135) | weather | M |
| ~~O5~~ | ~~An otter along the far bank at dawn and dusk~~ (#136) | wildlife | M |

- **O1 · What's new.** An angler who has landed a fish before sees a one-time card listing the latest headline changes (leaps, hot bank, evening rise, snags, stars and the rod bell, the new settings), only while idle on the bank. "Got it" hides it until the next batch; brand-new anglers get the walkthrough instead.
- **O2 · Titles.** A title from the angler's level ("Greenhorn" up to "Lake legend") next to their name on the HUD and the lodge board.
- **O3 · Photo mode.** H (or a pad button) hides every panel for a clean screenshot; H again or Escape brings them back.
- **O4 · Storms.** On rain days with a strong wind, now and then the sky flashes and thunder rolls a few seconds later (no flash with Reduce motion).
- **O5 · Otter.** At dawn and dusk outside winter, an otter swims the far bank, porpoising and diving, and slips away from a close cast like the ducks do.

## Wave P — Seasons on the water, and finding your way (added 2026-10-14, after Wave O shipped)

Claude picked these after Wave O; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~P1~~ | ~~A keys and buttons card on "?"~~ (#137) | QoL | S |
| ~~P2~~ | ~~Autumn leaves drifting down onto the water~~ (#138) | seasons | M |
| ~~P3~~ | ~~A mayfly hatch on spring and summer evenings~~ (#139) | wildlife | M |
| ~~P4~~ | ~~Water lilies in flower through the summer~~ (#139) | seasons | S |
| ~~P5~~ | ~~Refresh the "New on the lake" card for Waves O and P~~ (#140) | onboarding | S |

- **P1 · Keys card.** "?" (and a Settings button) opens a small card listing every key and pad button: Space, the mouse, W A S D, E, H, Escape. Escape or "?" closes it.
- **P2 · Falling leaves.** In fall, now and then a leaf spins down from the shore trees and settles on the water, drifting with the day's wind before it sinks. Fewer with Effects set to Lite.
- **P3 · Mayfly hatch.** Whenever the evening rise is on (calm or light-wind dry dusks in spring and summer), small pale flies dance over the water in reach of the bank, a quick climb and a slow parachute down, among the rising fish.
- **P4 · Lilies in flower.** The lily pads by the reeds carry white and pink flowers in summer, a few buds in late spring, and none in fall or winter.
- **P5 · What's new, again.** Bump the card's batch to list titles, photo mode, storms and the otter, plus whatever Wave P lands.

## Wave Q — More life in the sky (added 2026-10-14, after Wave P shipped)

Claude picked these after Wave P; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~Q1~~ | ~~A rainbow when the sun breaks through the rain~~ (#141) | sky | S/M |
| ~~Q2~~ | ~~Bats hawking over the water on summer nights~~ (#142) | wildlife | M |
| ~~Q3~~ | ~~A kingfisher that perches on a snag and dives~~ (#143) | wildlife | M |
| ~~Q4~~ | ~~Swallows skimming the lake on warm summer days~~ (#144) | wildlife | M |
| ~~Q5~~ | ~~Refresh the "New on the lake" card for Wave Q~~ (#144) | onboarding | S |

- **Q1 · Rainbow.** On rain days at dawn and dusk, a soft rainbow arc stands in the sky across from the sun, and since the hills hide most of the sky from the dock, its fainter twin shows in the lake. Never at night, in winter, or in a thunderstorm.
- **Q2 · Bats.** From dusk into the night in summer (and on dry spring dusks), a few bats flicker in figure-of-eight loops over the water in front of the dock, jinking after moths. Lite effects keep half; Reduce motion holds them gliding.
- **Q3 · Kingfisher.** From dawn to dusk outside winter, rain and fog, a bright blue bird sits on a bare snag off the east bank, now and then drops into the water with a little splash ring and flies back up. A cast landing within 5 m sends it off downlake for about 40 seconds. Reduce motion keeps it sitting.
- **Q4 · Swallows.** On clear or partly cloudy summer days in calm or light wind, six swallows sweep long loops over the lake in front of the dock, swooping up and dipping to skim the surface, banking into their turns. Lite effects keep half; Reduce motion holds them gliding.
- **Q5 · What's new, again.** List whatever Wave Q lands on the card.

## Wave R — Your own float, and a few more neighbours (added 2026-10-14, after Wave Q shipped)

Claude picked these after Wave Q; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~R1~~ | ~~Pick your float's colour in Settings~~ (#145) | personal | S |
| ~~R2~~ | ~~A turtle sunning on a log on summer days~~ (#146) | wildlife | M |
| ~~R3~~ | ~~An owl on a bare branch that hoots after dark~~ (#147) | wildlife | M |
| ~~R4~~ | ~~Now and then a fish jumps clear out on the open water~~ (#148) | lake | S/M |
| ~~R5~~ | ~~Refresh the "New on the lake" card for Wave R~~ (#148) | onboarding | S |

- **R1 · Float colour.** Settings gains a row of float colours (blue, red, orange, yellow, green, purple), remembered in this browser. The float's body takes the colour by sliding its UVs to another swatch of the shared palette; the white cap and the night glow tip stay.
- **R2 · Turtle.** A half-sunk log lies off the west bank all year. On bright summer days a turtle basks on it, stretching its neck now and then; a cast landing within 4.5 m sends it sliding off with a splash ring, and it climbs back about 45 seconds later. Reduce motion holds its neck still.
- **R3 · Owl.** A bare dead tree stands on the far bank all year. After dark outside winter an owl sits on its branch, eyes catching the light, turning its head now and then, and gives a soft "hoo, hoo-hoo" every 16 to 32 seconds, bowing with each call (muted with the rest of the sound). Reduce motion keeps its head and body still.
- **R4 · Jumping fish.** Once in every 75 seconds by day (35 at dawn and dusk), a fish flips clear of the water somewhere out on the open lake, at least 7 m from the dock, with a ring where it leaves and one where it falls back. Not in winter, off with Reduce motion, and purely for looks: it never marks a bite.
- **R5 · What's new, again.** List whatever Wave R lands on the card.

## Wave S — Listening, and the lake after rain and moonrise (added 2026-10-14, after Wave R shipped)

Claude picked these after Wave R; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~S1~~ | ~~A separate volume for nature sounds~~ (#149) | settings | S |
| ~~S2~~ | ~~The heron sometimes catches a fish~~ (#150) | wildlife | M |
| S3 | A moon road on the water on clear nights | sky | S/M |
| S4 | Dock planks that darken and shine in the rain | weather | S |
| S5 | Refresh the "New on the lake" card for Wave S | onboarding | S |

- **S1 · Nature volume.** Settings gains a "Nature sounds" slider for the lake's own sounds (lapping water, birds, crickets, frogs, geese, loon, owl, rain, wind and thunder), apart from the game's effects (casts, reel, bites, bell). It sits under the main volume and Mute.
- **S2 · Heron's catch.** About one stab in three now comes up with a small fish held crosswise in the heron's bill; it lifts its head to work the fish down and swallows it. Every stab leaves a ring on the water.
- **S3 · Moon road.** On clear nights with a bright moon, a broken silver path of glints runs across the water toward the moon, like the sun's road by day. Fainter as the moon wanes; none under cloud.
- **S4 · Wet dock.** When it rains, the dock and pier planks turn darker and pick up a faint sheen, and dry back as the sky clears.
- **S5 · What's new, again.** List whatever Wave S lands on the card.

## Risks / open questions for the owner

1. **Boat stance (P19) and the Inlet (P18) both widen `SpotId` across shared, API (`me.ts` spots record), scene, and tests — L each.** Go, or keep the lake at four banks and spend D on P17 + species only?
2. **Lures stay bound to packed field-log gear (P17 keeps `luresPacked(readTackle())`).** Keep that link, or move to a server-side tackle inventory bought with points (needs a table + endpoint, and the field-log tie-in weakens)?
3. **`hour`/`sky`/`clean` on catches are client-asserted until the deferred anti-cheat.** P12 badges and the P13 weekly board raise the stakes of that — acceptable for now, or should C wait for the replay engine on `codex/gameplay`?

Also worth a call: seasons by real month (P24) vs a faster cadence; tap-to-walk vs a joystick for P7.
