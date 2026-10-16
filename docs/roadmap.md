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
| ~~S3~~ | ~~A moon road on the water on clear nights~~ (#151) | sky | S/M |
| ~~S4~~ | ~~Dock planks that darken and shine in the rain~~ (#152) | weather | S |
| ~~S5~~ | ~~Refresh the "New on the lake" card for Wave S~~ (#152) | onboarding | S |

- **S1 · Nature volume.** Settings gains a "Nature sounds" slider for the lake's own sounds (lapping water, birds, crickets, frogs, geese, loon, owl, rain, wind and thunder), apart from the game's effects (casts, reel, bites, bell). It sits under the main volume and Mute.
- **S2 · Heron's catch.** About one stab in three now comes up with a small fish held crosswise in the heron's bill; it lifts its head to work the fish down and swallows it. Every stab leaves a ring on the water.
- **S3 · Moon road.** On clear nights with a bright moon, a broken silver path of glints runs across the water toward the moon, like the sun's road by day. Fainter as the moon wanes; none under cloud.
- **S4 · Wet dock.** When it rains, the dock and pier planks turn darker, a faint strip of glare runs down the boards, and drops splash on them in small rings. Dry again when the rain stops; snow leaves them dry.
- **S5 · What's new, again.** List whatever Wave S lands on the card.

## Wave T — Cold mornings and small wonders (added 2026-10-14, after Wave S shipped)

Claude picked these after Wave S; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~T1~~ | ~~The angler's breath shows on cold mornings~~ (#153) | weather | S |
| ~~T2~~ | ~~Shooting stars mirrored in the lake on clear nights~~ (#154) | sky | S |
| ~~T3~~ | ~~Snow settles on the dock in winter~~ (#155) | weather | S |
| ~~T4~~ | ~~A dewy spider web on the dock rail at dawn~~ (#156) | wildlife | S |
| ~~T5~~ | ~~Refresh the "New on the lake" card for Wave T~~ (#156) | onboarding | S |

- **T1 · Breath.** At dawn, and any time in winter, small pale puffs drift from the angler's face every few seconds and fade. Off with Reduce motion; Lite effects keep every other puff.
- **T2 · Shooting stars.** The shooting stars that already crossed the sky now fly low over the far shore, and each one shows as a bright streak crossing the lake's mirror in front of the dock, since the dock camera sees little sky. Still one per 40 seconds at most, off with Reduce motion.
- **T3 · Snowy dock.** In winter a thin layer of snow covers the dock planks, with a few trodden footprints where the angler stands, and each bridge post wears a cap of snow.
- **T4 · Spider web.** At dawn outside winter a small orb web hangs in the dock's front-right corner by the post, its threads beaded with dew that glints bead by bead (held steady under Reduce motion). Gone by full day.
- **T5 · What's new, again.** List whatever Wave T lands on the card.

## Wave U — Life around the lake (added 2026-10-14, after Wave T shipped)

Claude picked these after Wave T; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~U1~~ | ~~A deer comes down to drink on the far bank at dawn and dusk~~ (#157) | wildlife | M |
| ~~U2~~ | ~~Water striders skating in the calm shallows by the dock~~ (#158) | wildlife | S |
| ~~U3~~ | ~~Ducklings trailing a duck in spring~~ (#159) | wildlife | S |
| ~~U4~~ | ~~Cattail fluff drifting on the breeze in late summer~~ (#160) | weather | S |
| ~~U5~~ | ~~Refresh the "New on the lake" card for Wave U~~ (#160) | onboarding | S |

- **U1 · Deer.** Once every 75 seconds at dawn and dusk (not in rain) a deer walks out of the far treeline to the water's edge, turns side-on and drinks, looking up now and then, with small rings at its muzzle, then walks back. A cast landing within 7 m sends it bounding off until its next visit. Reduce motion keeps it standing with its head up.
- **U2 · Water striders.** On calm, dry days outside winter (dawn to dusk, wind at most a light breeze) six striders rest and dart in quick short dashes on the water just off the dock's left side, each long leg dimpling the surface. Lite effects keep three; Reduce motion holds them still.
- **U3 · Ducklings.** Swapped in for the planned autumn mist, which the lake already has at dawn. In spring the duck in the east shallows leads four ducklings in a weaving line behind her; when a cast flushes her they hide in the reeds and paddle out again once she is back.
- **U4 · Cattail fluff.** In summer and fall (not in rain), soft white tufts lift from the three reed beds and float low over the water, downwind with the day's wind or out over the lake in still air, faster as the wind rises. Lite effects keep half; Reduce motion holds them in the air.
- **U5 · What's new, again.** List whatever Wave U lands on the card.

## Wave V — Sounds and gusts (added 2026-10-14, after Wave U shipped)

Claude picked these after Wave U; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~V1~~ | ~~Ducklings peep and a spooked deer snorts~~ (#161) | sound | S |
| ~~V2~~ | ~~Cat's-paw gusts sweeping patches of water on breezy days~~ (#162) | weather | S/M |
| ~~V3~~ | ~~Snow gathers on the angler's cap in winter snowfall~~ (#163) | weather | S |
| ~~V4~~ | ~~Frogs on lily pads plop in when a cast lands close~~ (#164) | wildlife | S/M |
| ~~V5~~ | ~~Refresh the "New on the lake" card for Wave V~~ (#164) | onboarding | S |

- **V1 · Peeps and snorts.** Soft high peeps now and then while the ducklings are out, and a sharp snort when a cast sends the deer off, both under the Nature sounds slider.
- **V2 · Gusts.** On breezy and strong-wind days, rippled patches that catch the sky sweep across the water downwind every few seconds, faster in a strong wind, the way a gust roughens the surface. (Darker patches were tried first and vanished against the teal water.) Off with Reduce motion; Lite effects keep half.
- **V3 · Snowy cap.** While snow falls, snow builds up on the angler's cap and shoulders over about 45 seconds, and melts away within about 12 once it stops.
- **V4 · Frogs on pads.** In spring and summer, by day and at dusk, a frog sits on each of two lily pads (one by the west reeds, one in the east shallows), puffing its throat now and then. A cast landing within 4 m sends it leaping in with a plop and a ring; it hops back up about 30 seconds later. Reduce motion keeps its throat still.
- **V5 · What's new, again.** List whatever Wave V lands on the card.

## Wave W — Fishing feel (added 2026-10-14, after Wave V shipped)

Claude picked these after Wave V, turning from scenery back to the fishing itself; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~W1~~ | ~~The rod bows toward the fish under tension~~ (#167) | fight | S/M |
| ~~W2~~ | ~~The float bobs and dips in a pattern by fish size before the bite~~ (#166) | bite | S/M |
| ~~W3~~ | ~~A thrashing fish at the net sends up splashes and spray~~ (dropped: already there) | landing | S |
| ~~W4~~ | ~~Rod tip shivers on a nibble even when the float is out of view~~ (#165) | bite | S |
| ~~W5~~ | ~~Refresh the "New on the lake" card for Wave W~~ (#167) | onboarding | S |

- **W1 · Rod bow.** Swapped in for line spray, which the fight already has (SurgeSpray). Under a fish the rod now bows from the hand to the tip toward the line, deeper with tension and again in a surge, and straightens when the fight ends; the line stays fixed to the bowed tip.
- **W2 · Nibbles by size.** Before the bite, small fish (half a pound and under) give the float quick, shallow taps, while big ones (up to 16 lb and over) pull it down in a slower, deeper dip, so a watchful angler can guess what's coming. Keyed to the rolled fish's weight rather than its species, since weight is what a float feels. No change to bite timing or the catch odds.
- **W3 · Splashy landing.** Dropped: the landing already thrashes in the air, leaves an exit ring and drips water (landMotion.ts).
- **W4 · Rod tip shiver.** Each nibble also gives the rod tip a small, quick shiver, readable when the float is far away or hard to see.
- **W5 · What's new, again.** List whatever Wave W lands on the card.

## Wave X — Seasons on the dock and storms in the mirror (added 2026-10-14, after Wave W shipped)

Claude picked these after Wave W; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~X1~~ | ~~Fallen leaves gather on the dock in fall~~ (#168) | weather | S |
| ~~X2~~ | ~~Lightning flashes mirrored in the lake during storms~~ (#169) | sky | S |
| ~~X3~~ | ~~Dew glints on the shore grass at dawn~~ (#170) | weather | S |
| ~~X4~~ | ~~A beaver swims past at dusk with a branch, and slaps its tail at a close cast~~ (#171) | wildlife | M |
| ~~X5~~ | ~~Refresh the "New on the lake" card for Wave X~~ (#171) | onboarding | S |

- **X1 · Leaves on the dock.** In fall a scatter of orange and red leaves lies on the dock planks, a few more as the visit goes on, and a gust now and then skitters one across the boards.
- **X2 · Lightning in the lake.** Each lightning flash also shows as a bright jagged streak in the lake's mirror, since the dock camera sees little sky.
- **X3 · Dew.** At dawn, outside winter, tiny glints sparkle in the grass along the near bank and fade as the morning goes.
- **X4 · Beaver.** At dusk outside winter a beaver now and then swims across the far water towing a leafy branch, leaving a V-shaped wake. A cast landing close makes it slap its tail with a loud splash and dive.
- **X5 · What's new, again.** List whatever Wave X lands on the card.

## Wave Y — Winter details and summer wings (added 2026-10-14, after Wave X shipped)

Claude picked these after Wave X; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~Y1~~ | ~~Icicles hang from the dock rails in winter~~ (#172) | weather | S |
| ~~Y2~~ | ~~Butterflies flit along the shore on sunny summer days~~ (#173) | wildlife | S |
| ~~Y3~~ | ~~An osprey circles high and now and then plunges for a fish~~ (#174) | wildlife | M |
| ~~Y4~~ | ~~A thermos on the dock steams on cold mornings~~ (#175) | props | S |
| ~~Y5~~ | ~~Refresh the "New on the lake" card for Wave Y~~ (#175) | onboarding | S |

- **Y1 · Icicles.** In winter a row of short icicles hangs under the dock's edge and rails, catching the light.
- **Y2 · Butterflies.** On clear summer days a few butterflies flutter low along the near banks and over the lily pads.
- **Y3 · Osprey.** On clear days an osprey circles high over the lake; every few minutes it folds, plunges with a splash, and climbs away, sometimes with a fish.
- **Y4 · Thermos.** A thermos stands on the dock beside the angler; on cold dawns and in winter a wisp of steam curls from its cup.
- **Y5 · What's new, again.** List whatever Wave Y lands on the card.

## Wave Z — Small comforts and night life (added 2026-10-14, after Wave Y shipped)

Claude picked these after Wave Y; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~Z1~~ | ~~Moths flutter round the dock lanterns after dark~~ (#176) | wildlife | S |
| ~~Z2~~ | ~~Rain drips off the angler's cap brim~~ (#177) | weather | S |
| ~~Z3~~ | ~~The angler sips from the thermos cup now and then while waiting~~ (#178) | angler | S/M |
| ~~Z4~~ | ~~A fox trots along the far bank at dusk and night~~ (#179) | wildlife | M |
| ~~Z5~~ | ~~Refresh the "New on the lake" card for Wave Z~~ (#179) | onboarding | S |

- **Z1 · Moths.** After dark, when the dock lanterns are lit, a few pale moths circle each lantern in jittery loops.
- **Z2 · Drips.** In the rain, drops gather round the angler's cap brim and fall one after another. (Swapped in for path puddles: the shore path sits behind the dock camera, out of view.)
- **Z3 · A sip.** While the float sits and nothing is biting, the angler sometimes lifts the thermos cup for a sip and sets it back down.
- **Z4 · Fox.** At dusk and at night a red fox now and then trots along the far bank, stops to look across the water, and slips away into the trees.
- **Z5 · What's new, again.** List whatever Wave Z lands on the card.

## Wave AA — Feel of the catch (added 2026-10-14, after Wave Z shipped)

Claude picked these after Wave Z, turning back from scenery to the fishing itself; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AA1~~ | ~~A held fish flaps in the angler's hands on the catch card pose~~ (dropped: already there) | landing | S/M |
| ~~AA2~~ | ~~Line hum: the reel's drag pitch rises with tension in a fight~~ (dropped: already there) | sound | S |
| ~~AA3~~ | ~~Water drips from the line and lure as you reel in a miss~~ (#180) | reel | S |
| ~~AA4~~ | ~~A ring of ripples where the float sits pulses on each nibble~~ (#180) | bite | S |
| ~~AA5~~ | ~~Refresh the "New on the lake" card for Wave AA~~ (#180) | onboarding | S |

- **AA1 · A lively catch.** When a fish is landed and held up, it flaps its tail a few times before going still.
- **AA2 · Line hum.** During a fight, a faint tone under the drag rises in pitch as the line tightens, so you can hear when it is near breaking.
- **AA3 · Drips on the retrieve.** After a miss or release, as the lure comes up out of the water, a few drops fall from it.
- **AA4 · Nibble rings.** Each nibble tap sends a small ring out from the float, so a nibble shows even when the float's bob is hard to see.
- **AA5 · What's new, again.** List whatever Wave AA lands on the card.

Claude checks each against what already exists before building and swaps any that are already there.

## Wave AB — Fair bites and sound you can read (added 2026-10-14, after Wave AA shipped)

Claude picked these after Wave AA from the review's open "smaller fixes" and an accessibility gap; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AB1~~ | ~~Nibbles come at varied times before the bite~~ (#181) | bite | S/M |
| ~~AB2~~ | ~~Optional captions for lake sounds (thunder, loon, owl, splashes)~~ (#182) | accessibility | M |
| ~~AB3~~ | ~~Refresh the "New on the lake" card for Wave AB~~ (#182) | onboarding | S |

- **AB1 · Unpredictable nibbles.** Today a single 280 ms nibble always lands at half the wait, so the bite's timing can be learned. Instead, one to three nibbles land at seeded, varied times before the bite, each a little different in length. (The "fish loses interest" part was dropped so catch rates stay the same.)
- **AB2 · Sound captions.** A Settings toggle shows short captions at the screen's edge for the lake's sounds ("Thunder rolls", "A loon calls", "An owl hoots", "A beaver slaps its tail"), so players who can't hear them still know what is around. Off by default.
- **AB3 · What's new, again.** List whatever Wave AB lands on the card.

## Wave AC — Northern sky and quick wings (added 2026-10-14, after Wave AB shipped)

Claude picked these after Wave AB; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AC1~~ | ~~Northern lights on some clear winter and fall nights, low over the far shore and mirrored in the water~~ (#183) | scene | M |
| ~~AC2~~ | ~~A skein of geese crosses high over the far shore in fall, mirrored in the lake~~ (#184) | scene | S/M |
| ~~AC3~~ | ~~A woodpecker drums in the woods on mornings, with a caption~~ (#185) | sound | S |
| ~~AC4~~ | ~~Refresh the "New on the lake" card for Wave AC~~ (#185) | onboarding | S |

- **AC1 · Northern lights.** On a few seeded clear nights in fall and winter, green curtains shimmer low over the far treeline. The dock camera sees little sky, so the lake's mirror carries most of it.
- **AC2 · Geese skein.** Swallows already fly on summer days (Swallows.tsx), so this slot went to fall geese instead. A V of geese crosses high over the far shore soon after you arrive, then again when the geese honk. The dock sees little sky, so their mirror image crossing the lake carries it.
- **AC3 · Woodpecker.** A short drum roll comes from the woods now and then on mornings outside winter. The sound captions name it.
- **AC4 · What's new, again.** List whatever Wave AC lands on the card.

Claude checks each against what already exists before building and swaps any that are already there.

## Wave AD — Leftover fixes from the review (added 2026-10-14, after Wave AC shipped)

Claude picked these after Wave AC from the review's "smaller fixes" list. Some may already be fixed, so each is checked first and dropped if so.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AD1~~ | ~~The lake hour moves on while you play instead of freezing at page load~~ (already fixed: Dock watches the clock) | fix | S |
| ~~AD2~~ | ~~Charging a cast stops re-rendering the whole page every frame~~ (#186) | performance | S/M |
| ~~AD3~~ | ~~The lure picker gives Space back to casting after you choose~~ (already fixed in LureChoice) | fix | S |
| ~~AD4~~ | ~~The first game save no longer seeds the sample logbook~~ (#186) | fix | S |

## Wave AE — Lighter frames (added 2026-10-14, after Wave AD shipped)

Claude picked the review's remaining performance items. Each is checked first, and nothing should change on screen.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AE1~~ | ~~Scenery copies share their toon materials instead of each building its own~~ (#187) | performance | M |
| ~~AE2~~ | ~~The aim raycasts run only when the pointer or the camera has moved~~ (#188) | performance | S |
| ~~AE3~~ | ~~The water stops recomputing its normals every frame where a cheaper path exists~~ (#188: same normals, about 2x faster loop) | performance | S/M |

## Wave AF — Fish that look like their species (added 2026-10-14, after Wave AE shipped)

Claude picked these from the review's "one fish mesh for all species" note; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AF1~~ | ~~Each species gets its own build: long pike, deep panfish, whiskered catfish and sturgeon~~ (#189) | fish | M |
| ~~AF2~~ | ~~Species markings: perch bars, trout spots, a pike's pale flecks~~ (#189) | fish | M |
| ~~AF3~~ | ~~Refresh the "New on the lake" card for Wave AF~~ (#189) | onboarding | S |

## Wave AG — Shapes everywhere (added 2026-10-14, after Wave AF shipped)

Claude picked these to carry Wave AF's species shapes to every fish on the lake; the owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AG1~~ | ~~The fish swimming around the lake wear their species' build and markings~~ (#190) | fish | S/M |
| ~~AG2~~ | ~~The shadow under the float runs long for pike and short for panfish~~ (#190) | fish | S |
| ~~AG3~~ | ~~Refresh the "New on the lake" card for Wave AG~~ (#190) | onboarding | S |

## Wave AH — Birds on the open water (added 2026-10-14, after Wave AG shipped)

Claude picked these; swans weren't on the lake yet. The owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AH1~~ | ~~A pair of swans glides the far water by day in spring and summer, tipping under to feed~~ (#191) | ambient life | M |
| ~~AH2~~ | ~~A cast landing near the swans makes the nearer one raise its wings and hiss~~ (#192; swapped in for gulls snatching fish, since the osprey already plunges for fish) | ambient life | S |
| ~~AH3~~ | ~~Refresh the "New on the lake" card for Wave AH~~ (#192) | onboarding | S |

## Wave AI — Fewer draw calls (added 2026-10-14, after Wave AH shipped)

Claude measured about 627 draw calls a frame on a summer day (Full effects) and picked the biggest easy cuts. Nothing should change on screen.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AI1~~ | ~~The trees, bushes and grass scattered around the lake draw as instanced meshes, one draw per model part~~ (#193) | performance | M |
| ~~AI2~~ | ~~The pier's approach boards draw in two instanced batches instead of one mesh and material each~~ (#193: 627 to 531 draws a frame) | performance | S |
| ~~AI3~~ | ~~The approach walkway stops dipping under the swell when the waves run high~~ (#194: the chop calms in the pier's lee) | fix | S |

## Wave AJ — More water birds (added 2026-10-14, after Wave AI shipped)

Claude picked these; neither bird was on the lake yet. The owner can reorder or drop any.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AJ1~~ | ~~A cormorant dries its wings on a rock in the far water and slips in to fish around it~~ (#195) | ambient life | M |
| ~~AJ2~~ | ~~In spring, a pair of grebes does its courtship rush across the water, side by side~~ (#196) | ambient life | M |
| ~~AJ3~~ | ~~Refresh the "New on the lake" card for Wave AJ~~ (#196) | onboarding | S |

## Wave AK — Divers that notice you (added 2026-10-14, after Wave AJ shipped)

Claude picked these to give Wave AJ's birds the same reactions the ducks, beaver and swans have, and fixed a pitch sign found on the way.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AK1~~ | ~~A cast landing near the cormorant's rock sends it straight into the water~~ (#197) | ambient life | S |
| ~~AK2~~ | ~~A cast landing near the grebes sends both under for a few seconds~~ (#197) | ambient life | S |
| ~~AK3~~ | ~~The loon, otter, kingfisher and beaver tip nose first when they dive, not tail first~~ (#197: bodyPitch.ts) | fix | S |
| ~~AK4~~ | ~~Refresh the "New on the lake" card for Wave AK~~ (#197) | onboarding | S |

## Wave AL — Birds over the fish (added 2026-10-14, after Wave AK shipped)

Claude picked this to tie the new bird life to fishing: feeding birds give away where the fish are.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AL1~~ | ~~Terns circle and plunge over the day's bubbling fish patch in spring and summer, and fly over when it moves~~ (#198) | ambient life / hint | M |
| ~~AL2~~ | ~~Refresh the "New on the lake" card for Wave AL~~ (#198) | onboarding | S |

## Wave AM — Sounds for the new birds (added 2026-10-14, after Wave AL shipped)

Claude picked these so the birds from Waves AH to AL are heard as well as seen.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AM1~~ | ~~Terns call over the water on spring and summer days, with a sound caption~~ (#199) | audio | S |
| ~~AM2~~ | ~~The grebes' rush is heard: feet pattering and a few rattling calls, with a caption~~ (#200) | audio | S |

## Wave AN — A thumb stick for walking (added 2026-10-14, after Wave AM shipped)

The owner's open "tap-to-walk vs joystick" question: Claude keeps tap-to-walk and adds the stick beside it, on by default for touch screens and off in Settings.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AN1~~ | ~~On touch screens a thumb stick walks the angler, analog like a gamepad stick, on the left (right when left-handed)~~ (#201) | controls | M |
| ~~AN2~~ | ~~A Settings switch for it, and the news card mentions it~~ (#201) | settings | S |

## Wave AO — Keep a picture from photo mode (added 2026-10-14, after Wave AN shipped)

Claude picked this: photo mode (H) already hides the panels, but saving the view meant a system screenshot, which is awkward on a phone.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AO1~~ | ~~In photo mode, P, Space, the pad's A or a Save this view button saves the lake at full size as a PNG, without the panels~~ (#202) | photo mode | S |
| ~~AO2~~ | ~~The keys card lists it, and the news card mentions it~~ (#202) | onboarding | S |

## Wave AP — Pictures land in the phone's photos (added 2026-10-14, after Wave AO shipped)

Claude picked this: on a phone a downloaded PNG lands in Files (or Downloads), where few players look for it.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AP1~~ | ~~On a touch screen that can share files, the lake picture and the catch card open the share sheet (Save Image puts them in the photos); a refused sheet falls back to the download~~ (#203) | photo mode | S |

## Wave AQ — Frame the shot in photo mode (added 2026-10-14, after Wave AP shipped)

Claude picked this: photo mode's overlay covered the canvas, so the view could not be turned once the panels were hidden.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AQ1~~ | ~~In photo mode, drag to turn the view, pinch or scroll to zoom, arrows and + − on a keyboard; only a still tap brings the panels back~~ (#204) | photo mode | S |
| ~~AQ2~~ | ~~The keys card and the news card mention it~~ (#204) | onboarding | S |

## Wave AR — Photo mode on a controller (added 2026-10-14, after Wave AQ shipped)

Claude picked this so a controller player can frame a shot too: the pad's A already saves, but its sticks did nothing in photo mode.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AR1~~ | ~~In photo mode the right stick turns the view and the left stick's up and down zoom; the keys card says so~~ (#205) | photo mode / controls | S |

## Wave AS — A lighter lake for phones (added 2026-10-14, after Wave AR shipped)

Claude picked this from a draw-call probe: a summer day drew 556 calls a frame, many of them tiny parts drawn one by one.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AS1~~ | ~~Water striders draw as two instanced meshes instead of nine meshes each; a fish's spots, bars or stripe as one; a lily's petals as one shared shape (556 to 445 calls a frame, summer day)~~ (#206) | performance | S |

## Wave AT — Fewer draws per fish (added 2026-10-14, after Wave AS shipped)

Claude picked this as the next probe target: every fish (cruising, shadow, hooked, held up) drew 11 to 15 meshes, doubled while hooked.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AT1~~ | ~~A fish bakes its rigid same-colour parts (body and head, eyes, back fins, side fins, tail fins, whiskers) into one shape each: 11 meshes to 7 on a plain fish, 445 to 412 calls a frame on a summer day~~ (#207) | performance | S |

## Wave AU — Butterflies in two draws (added 2026-10-14, after Wave AT shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~AU1~~ | ~~All butterfly wings draw as one instanced mesh coloured per instance and all bodies as another, 15 draws to 2 on a sunny summer day~~ (#208) | performance | S |

## Wave AV — Change the lure without the menu (added 2026-10-14, after Wave AU shipped)

Claude picked this: keyboard and controller players had to reach for the lure menu with the mouse, or could not reach it at all on a pad.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AV1~~ | ~~Q and R step through the packed lures while the lure can change; a controller's bumpers do the same; the keys card and news card say so~~ (#209) | controls | S |

## Wave AW — Battery saver (added 2026-10-14, after Wave AV shipped)

Claude picked this for phones: the lake drew every screen refresh (60 or 120 a second) even when nothing needs that.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AW1~~ | ~~A Frame rate setting: Smooth, or Battery saver at 30 frames a second (the canvas draws on demand, asked 30 times a second); the auto step-down to Lite ignores the saver's own 30~~ (#210) | settings / performance | S |

## Wave AX — Quiet in the background (added 2026-10-14, after Wave AW shipped)

Claude picked this: the lake's loops and calls kept playing after the player switched to another tab or app.

| # | Title | Area | Size |
|---|---|---|---|
| ~~AX1~~ | ~~The lake goes quiet while the game is in another tab or app (master gain to zero, sounds keep running so nothing bursts on return); a Settings switch keeps it playing for anyone who likes the ambience~~ (#211) | audio / settings | S |

## Wave AY — No fish lost while away (added 2026-10-14, after Wave AX shipped)

Claude picked this: a bite that came while the game sat in another tab ran out its strike window unseen, so the player came back to "Too slow".

| # | Title | Area | Size |
|---|---|---|---|
| ~~AY1~~ | ~~A bite due while the page is hidden waits until the player is back, then takes the float a beat and a half later (whenShown.ts)~~ (#212) | gameplay fix | S |

## Wave AZ — The strike window waits too (added 2026-10-14, after Wave AY shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~AZ1~~ | ~~Leaving the tab while the float is under no longer loses the fish: the strike window reopens in full on the way back~~ (#213) | gameplay fix | S |

## Wave BA — Hints that fit the hand (added 2026-10-14, after Wave AZ shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BA1~~ | ~~The idle hint says "touch" and "lift" on phones and names the moss band everywhere (it said "click" and "pale band"); the shop hint drops the E key on touch screens~~ (#214) | phone UX | S |

## Wave BB — Fewer draws for the swallows (added 2026-10-14, after Wave BA shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BB1~~ | ~~Swallows drawn as two instanced meshes (body, belly and tail baked with vertex colours; wings mirrored per instance): 30 draws to 2, 381 to 353 on a summer day~~ (#215) | performance | S |

## Wave BC — Fewer draws for the swans (added 2026-10-14, after Wave BB shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BC1~~ | ~~Each swan's body and tail baked into one shape, and its neck, head, beak and knob into one vertex-coloured shape (`mergePainted`, now shared with the swallows): 9 draws a swan to 4, 353 to 343 on a summer day~~ (#216) | performance | S |

## Wave BD — Fewer draws for the cormorant (added 2026-10-14, after Wave BC shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BD1~~ | ~~Cormorant baked into a body and two hinged wings with `mergePainted` (one vertex-coloured toon material): 10 draws to 3~~ (#217) | performance | S |

## Wave BE — Fewer draws for the kingfisher and turtle (added 2026-10-14, after Wave BD shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BE1~~ | ~~Kingfisher's snag and body each baked into one shape (9 draws to 4); turtle's shell, rim and feet baked into one (7 to 2); summer day 343 to 327 with BD~~ (#218) | performance | S |

## Wave BF — Fewer draws for the heron, loon and owl (added 2026-10-14, after Wave BE shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BF1~~ | ~~Heron baked into body, neck, fish, legs and two wings (13 draws to 7); loon into body and neck (8 to 2); owl into body, head and glowing eyes (8 to 3) and its tree into one shape (3 to 1)~~ (#219) | performance | S |

## Wave BG — Fewer draws for the terns and grebes (added 2026-10-14, after Wave BF shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BG1~~ | ~~Each tern baked into a body and two wings (7 draws to 3, three birds); each grebe's neck, head, ruff, crest and bill into one shape (7 to 2, plus the four spray drops, which hop apart so stay separate)~~ (#220) | performance | S |

## Wave BH — Fewer draws for the osprey, beaver and otter (added 2026-10-14, after Wave BG shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BH1~~ | ~~Osprey baked into a body and two wings (11 draws to 4 with the held fish); beaver's back, head and branch into one shape (14 to 2); otter into one shape (10 to 1); splash drops share one geometry and material~~ (#221) | performance | S |

## Wave BI — Fewer draws for the ducks and pad frogs (added 2026-10-14, after Wave BH shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BI1~~ | ~~Each duck's body, head and bill baked into one shape (duckShapes.ts), each spring duckling likewise (3 draws to 1), wings share one box and material; each pad frog's body, eyes and legs baked into one shape beside its puffing throat (8 draws to 2); summer day 327 to 318~~ (#222) | performance | S |

## Wave BJ — Landmarks for screen readers (added 2026-10-14, after Wave BI shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BJ1~~ | ~~axe scan of every page: the dock, catch log and lodge board now sit in a `main` landmark, and each trip's tackle list on the gear page has its own name ("Tackle for {trip}"); all twelve pages scan clean~~ (#223) | accessibility | S |

## Wave BK — Rocks in one draw per cluster (added 2026-10-14, after Wave BJ shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BK1~~ | ~~The lake's grey rocks (drop-off pair, creek rocks, shallows and the cormorant's rock) drawn as three instanced clusters instead of one mesh each, saving a draw and a shadow draw per rock~~ (#224) | performance | S |

## Wave BL — A phone held sideways (added 2026-10-14, after Wave BK shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BL1~~ | ~~Short landscape touch screens get a one-row header and panels tucked into the corners, so the lure panel no longer covers the walking stick; the shore help on touch screens names the stick, tapping the shore, touching the water and two-finger looking instead of WASD, clicks and right-drag~~ (#225) | phone UX | S |

## Wave BM — Fewer draws at the angler's feet (added 2026-10-14, after Wave BL shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BM1~~ | ~~The thermos and its cup bake into one painted shape each, and the reel's spool and crank bake into one each, so they cost 5 draws instead of 12~~ (#226) | perf | S |
| ~~BM2~~ | ~~Winter dock footprints and post snow caps bake into one shape each, and the three bank-stand posts into one shadow caster (16 draws down to 3)~~ (#227) | perf | S |
| ~~BM3~~ | ~~The windsock's three stripes bake into one painted shape and the basking log into one with its branch (3 casters down to 1, 3 draws down to 2 by the log)~~ (#228) | perf | S |

## Wave BN — The catch card on a tall phone (added 2026-10-14, after Wave BM shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BN1~~ | ~~On narrow phones the catch card spans the width and stops under the header (scrolling if a stack of stamps runs long) instead of sliding behind it, with a smaller fish, a tighter banner and its buttons two to a row; the landed, cancelled, overpowered and ring hints say touch and lift on touch screens instead of click, Space and release~~ (#229) | phone UX | S |
| ~~BN2~~ | ~~The field log's seven bottom tabs fit a 360 px phone in Polish (REKORDY was pushed off screen and unreachable)~~ (#230) | phone UX | S |
| ~~BN3~~ | ~~On narrow phones the first-cast coach's Skip link sits under its line instead of on the last step chip (ODPUŚĆ in Polish), the chips may wrap, and the hint below leaves room for a two-line coach line~~ (#231) | phone UX | S |
| ~~BN4~~ | ~~Escape closes the settings panel even from its sliders and checkboxes (it only worked when focus was elsewhere); settings checkboxes keep their size beside two-line labels and the sliders line up; at 360 px in Polish the shop's long request names wrap instead of running under the count, and the forecast's sky fits its card~~ (#232) | phone UX, access | S |

## Wave BO — The largest text on a phone (added 2026-10-15, after Wave BN shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BO1~~ | ~~With larger text on a 360 px phone in Polish: the settings panel no longer runs past the screen edge (a slider's default width held its column open) and each slider gets its own line; the shop's requests take their own line above the count, reward and Claim; the hint gives way to the first-cast coach so they do not overlap; and the lake's news gives way to the walking stick on touch phones~~ (#233) | access, phone UX | S |
| ~~BO2~~ | ~~With larger text the field log pages no longer run wider than a 360 px phone: the header's Log a catch button may drop under the brand, catch and trip cards and the entry form shrink to fit, gear tags wrap inside their pill, and the bottom tabs scroll sideways if they must~~ (#234) | access, phone UX | S |
| ~~BO3~~ | ~~With larger text on a phone the catch card stops under the (taller) header, keeps Release, Keep fishing, Field log and Save picture pinned at its foot while the rest scrolls, and the fight card hangs from the header instead of sliding under it~~ (#235) | access, phone UX | S |
| ~~BO4~~ | ~~On a phone held sideways (with any text size) the first-cast coach sits between the lure panel and the shore signs, its chips wrap and Skip has its own row, the hint stops short of the power meter, and the lake's news leaves the walking stick's corner~~ (#236) | access, phone UX | S |

## Wave BP — Battery on an idle lake (added 2026-10-15, after Wave BO shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BP1~~ | ~~After 90 seconds with no touch, click, key or pad press (and nothing held), the lake draws at the battery saver's 30 frames a second until the next input; the frame watch ignores the drop so it never steps effects down for it~~ (#237) | perf, battery | S |
| ~~BP2~~ | ~~Drop two files nothing loads: a 1.1 MB dawn.hdr sky map and a stray textures/colormap.png (the models use models/Textures/colormap.png)~~ (#238) | cleanup | S |

## Wave BQ — A long catch log (added 2026-10-15, after Wave BP shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BQ1~~ | ~~The catch log, a spot's page and a trip's page draw their catches 50 at a time with a "Show 50 more" button and an "N of M fish" count, instead of every card at once (a 2,000-catch log drew 30,000 elements and took 1.6 s to open; now about 800 and 0.7 s)~~ (#239) | perf | S |
| ~~BQ2~~ | ~~Find a catch keeps up with typing in a long log (2.6 s to type a word over 2,000 catches, now under 0.1 s): results follow the keys a beat behind, show 50 at a time, and only a "Matches: N" line is read out instead of every card~~ (#240) | perf, access | S |

## Gameplay track (added 2026-10-15; its own thread works casting, fights, fish, levels and the lake, while the field log keeps the BR rows)

| # | Title | Area | Size |
|---|---|---|---|
| ~~GT1~~ | ~~Fish tire as the fight goes on: runs pull softer, calm spells last longer and line comes in faster; the fight card says Fish fresh, tiring or played out~~ (#357) | fight | S |
| ~~GT2~~ | ~~A tiring fish comes up toward the surface and its runs go shorter and less wide, so the scene shows what the fight card says~~ (#359) | fight | S |
| ~~GT3~~ | ~~Turn a run: each run heads left or right, and holding ← A or → D (a pad's stick, or a side button on touch) the other way cuts it short and tires the fish; the fight card says which way to pull~~ (#362) | fight | M |
| ~~GT4~~ | ~~News card (2026-10-15u) tells players fish tire and runs can be turned~~ (#364) | game | S |
| ~~GT5~~ | ~~The level chip fills toward the next level and says how many points are left and what it opens~~ (#365) | progression | S |
| ~~GT6~~ | ~~Levels 9 (5000 points, Keeper of the lake: hooked fish tire 20% faster) and 10 (8000, Stillwater sage: rare and legendary fish bite more often, within what the angler can land)~~ (#367) | progression | S |
| ~~GT7~~ | ~~A quick strike (in the first 40% of the bite window) sets the hook solid: the fish starts the fight a little tired and the hint says Hooked solid. News card (2026-10-15w) tells of it and of levels 9 and 10~~ (#370) | fight | S |
| ~~GT8~~ | ~~A connected controller rumbles on nibbles, bites, the strike, runs, a snap and the catch, and Settings has a Vibration switch for phone and controller (the phone buzz had no switch)~~ (#372) | game feel | S |
| ~~GT9~~ | ~~A fish reeled close (last 15% of line) with fight still in it sees the net and makes one last run, warned on the fight card; a played-out fish comes in quietly, so tiring it first pays~~ (#374) | fight | S |
| ~~GT10~~ | ~~Perfect cast: a gold mark in the middle of the cast meter's sweet band (±0.035 power); stopping on it says Perfect cast and the bite comes 20% sooner. News card (2026-10-15y) covers GT8 to GT10~~ (#377) | casting | S |
| ~~GT11~~ | ~~The landed card notes how the fish was played: Perfect cast · Hooked solid · Turned N runs~~ (#380) | fight | S |
| ~~GT12~~ | ~~A starter fish's head shake (shiner, bluegill, perch, crappie) can't be turned, so their fight card and touch screen drop the steering; a played shiner no longer says Turned 21 runs~~ (#381) | fight | S |
| ~~GT13~~ | ~~With a controller connected, the fight card names its buttons and stick (HOLD A or RT to reel, push the left stick the other way) instead of keys or the screen~~ (#384) | game feel | S |
| ~~GT14~~ | ~~Reeling with the tension in the tight (amber) zone brings line in 25% faster, so holding the reel into the amber pays and the red still punishes. News card (2026-10-15z) covers it, the landed-card notes and the pad words~~ (#385) | fight | S |
| ~~GT15~~ | ~~The strike says how quick it was: Hooked solid in 0.31 s!, or Hooked in 0.62 s (solid under 0.44 s), so the solid-hook mark is learnable~~ (#387) | fight | S |
| ~~GT16~~ | ~~Bite styles: pike, muskies and largemouth bass ambush with no nibble; carp, catfish, burbot and sturgeon mouth the bait two to four times; the wait hint no longer promises a nibble. News card (2026-10-15zb)~~ (#389) | fish | S |
| ~~GT17~~ | ~~Line running out: line a fish takes back past the hookset stripes the line bar red from the right, and a third of the way to escape the card says Running out of line! (also in the line meter for screen readers)~~ (#391) | fight | S |
| ~~GT18~~ | ~~Clean fights in a row: from the second clean fight landed in a row this session, the landed card notes 3 clean fights in a row; a dirty landing, a snapped line or an escape starts it again~~ (#394) | fight | S |
| ~~GT19~~ | ~~A snapped line says how close the fish came: It was 85% of the way in (from 10% in), so a break near the net reads as nearly there~~ (#397) | fight | S |
| ~~GT20~~ | ~~News card (2026-10-15zc) covers GT17 to GT19: the line running out, clean fights in a row, and how close a snapped fish came~~ (#399) | news | S |
| ~~GT21~~ | ~~Second take: a bottom feeder (carp, catfish, burbot, sturgeon) that drops the bait on a missed strike comes back once 1.8 s later, with a hint to watch for it; other fish leave as before~~ (#401) | fish | S |
| ~~GT22~~ | ~~The bite call fits the fish: WHAM — it hit! Strike! for an ambush predator, It's taking it — strike! for a bottom feeder, NOW — strike! for the rest~~ (#403) | fish | S |
| ~~GT23~~ | ~~Close call: a fish landed after the tension touched 0.95 or the line reached the run-out mark leads its landed-card notes with Close call~~ (#405) | fight | S |
| ~~GT24~~ | ~~News card (2026-10-15ze) covers GT21 to GT23: the second take, the bite calls, and the close call~~ (#407) | news | S |
| ~~GT25~~ | ~~The float twitches once halfway through a second-take wait, so the eye knows the fish is still there~~ (#409) | fish | S |
| ~~GT26~~ | ~~A played-out fish between runs gets its own call on the fight card: It's played out — reel it in!~~ (#411) | fight | S |
| ~~GT27~~ | ~~Bottom feeders sulk: after every second run a carp, catfish, burbot or sturgeon with fight left digs in for up to 2.2 s; reeling moves it at a fifth of the rate and no line goes out, and easing off for 0.4 s then reeling pumps it up. The fight card says It's sulking on the bottom — ease off, then pump!~~ (#413) | fight | M |
| ~~GT28~~ | ~~News card (2026-10-15zf) covers GT25 to GT27: the sulk, the played-out call, and the second-take twitch~~ (#415) | news | S |
| ~~GT29~~ | ~~The landed card says how long the fight took: Landed in 24 s, or Landed in 1 min 5 s, counted in game time~~ (#418) | fight | S |
| ~~GT30~~ | ~~A missed bite says how long the fish held the bait: Too slow. The fish dropped the bait after 0.92 s, so the bite window is learnable like the strike time~~ (#420) | fish | S |
| ~~GT31~~ | ~~Striking while the float nibbles says That was only a nibble, instead of the plain Too early, so the angler learns which dip was the fake~~ (#422) | fish | S |
| ~~GT32~~ | ~~News card (2026-10-15zg) covers GT29 to GT31: the fight time, how long a missed fish held the bait, and the nibble strike~~ (#425) | news | S |
| ~~GT33~~ | ~~The landed card counts the leaps the angler bowed to (let go before the line loaded the rod): Bowed to 2 leaps~~ (#428) | fight | S |
| ~~GT34~~ | ~~The tension bar keeps a notch at the fight's highest tension, turning red once it reached the red, so the angler sees how near the edge they came~~ (#430) | fight | S |
| ~~GT35~~ | ~~A bottom feeder hooked on its second take is noted on the landed card: On the second take~~ (#432) | fish | S |
| ~~GT36~~ | ~~News card (2026-10-15zh) covers GT33 to GT35: bowed leaps, the peak-tension notch, and the second-take note~~ (#434) | news | S |
| ~~GT37~~ | ~~A sulking bottom feeder sinks deep on the lake (0.68 m, under its 0.42 m calm depth) and comes back up once pumped, so the scene shows the sulk the fight card calls~~ (#436) | fish | S |
| ~~GT38~~ | ~~An ambush predator's bite starts at the yank: the float goes straight under with no opening tap or slack pause, matching the WHAM call~~ (#438) | fish | S |
| ~~GT39~~ | ~~News card (2026-10-15zj) covers GT37 and GT38: the deep sulk and the ambush bite on the lake~~ (#440) | news | S |
| ~~GT40~~ | ~~The cast meter keeps a faint mark where the last cast stopped, so the next cast can be aimed at the gold perfect mark by correcting from it~~ (#446) | casting | S |
| ~~GT41~~ | ~~The fight card says Heavier than your best (1.1 lb) when the fish on the line outweighs the field log's heaviest of its species, so a big one feels like one before it is landed~~ (#448) | fight | S |
| ~~GT42~~ | ~~News card (2026-10-15zl) covers GT40 and GT41: the last-cast mark and the heavier-than-your-best line~~ (#451) | news | S |
| ~~GT43~~ | ~~Levels 11 (12000 points, Lake elder: fish hold the bait 20% longer) and 12 (17000, Spirit of the lake: the gold perfect-cast mark is ±0.05 instead of ±0.035)~~ (#454) | progression | S |
| ~~GT44~~ | ~~News card (2026-10-15zm) covers GT43: levels 11 and 12~~ (#456) | news | S |
| ~~GT45~~ | ~~Weeds at the reeds: fished from the reeds, a run the angler doesn't turn ends with the fish in the weeds for 1.6 s, where reeling wins back 30% of the usual line, no line goes out and the fish rests; the fight card says so~~ (#459) | fight | S |
| ~~GT46~~ | ~~News card (2026-10-15zn) covers GT45: weeds at the reeds~~ (#460) | news | S |
| ~~GT47~~ | ~~On the lake, a fish in the weeds holds out wide where its run ended instead of swinging back in, so the scene shows what the fight card says~~ (#462) | fight | S |
| ~~GT48~~ | ~~The inlet's current takes slack line out 1.6× faster, and the fight card names what the water does at the reeds and the inlet~~ (#465) | fight | S |
| ~~GT49~~ | ~~News card (2026-10-15zo) covers GT47 and GT48: the inlet's current and the water line on the fight card~~ (#467) | news | S |
| ~~GT50~~ | ~~Drop-off runs dive: they pull 25% harder against a reeling line and tire the fish 30% faster, so letting them go pays most there; the fight card says so~~ (#470) | fight | S |
| ~~GT51~~ | ~~News card (2026-10-15zp) covers GT50: drop-off dives~~ (#472) | news | S |
| ~~GT52~~ | ~~Rocks off the point: reeling against a run the angler doesn't turn loads the line 20% harder; the fight card says so, and the news card (2026-10-15zr) covers it~~ (#475) | fight | S |
| ~~GT53~~ | ~~Off the point, the fight card calls an unturned run: It's dragging the line over the rocks — turn it! The call goes back to the usual run call once the angler turns it~~ (#477) | fight | S |
| ~~GT54~~ | ~~The landed card notes Kept it out of the weeds (reeds) or Kept it off the rocks (point) when no run went in or was reeled against unturned~~ (#486) | fight | S |
| ~~GT55~~ | ~~News card (2026-10-15zs) covers GT53 and GT54: the rocky run call and the kept-clear note~~ (#487) | news | S |
| ~~GT56~~ | ~~Reeling against an unturned run off the point grates: a low rasp every 220 ms and a light buzz or controller rumble, so the rocks are felt as well as read~~ (#490) | feel | S |
| ~~GT57~~ | ~~A fish going into the weeds at the reeds swishes once, with a soft buzz or controller thump~~ (#492) | feel | S |
| ~~GT58~~ | ~~News card (2026-10-15zt) covers GT56 and GT57: the rock scrape and the weeds swish~~ (#494) | news | S |
| ~~GT59~~ | ~~On the lake, a run at the drop-off dives to 0.6 m (below a calm fish, above a sulk) instead of thrashing at the surface, so the scene shows the dive the fight card names~~ (#496) | fish | S |
| ~~GT60~~ | ~~On the lake, the inlet's current carries a resting fish 0.5 m off to the side while the angler isn't reeling, and it swings back in once reeled, so the scene shows the current the fight card names~~ (#499) | fish | S |
| ~~GT61~~ | ~~News card (2026-10-16a) covers GT59 and GT60: the drop-off dive and the inlet drift on the lake~~ (#502) | news | S |
| ~~GT62~~ | ~~Out on the boat it swings to follow a run, so a run takes out 35% less line than from the bank; the fight card says so~~ (#504) | fight | S |
| ~~GT63~~ | ~~At anchor the rowboat swings round about 13° toward a run and settles back square between runs, so the scene shows the boat following the fish~~ (#506) | fish | S |
| ~~GT64~~ | ~~News card (2026-10-16b) covers GT62 and GT63: the boat follows a run and takes less line~~ (#508) | news | S |
| ~~GT65~~ | ~~On a breezy day the wind bellies a slack line, so between runs it drifts out 25% faster (50% on a strong day); runs pull as before, and the fight card says so~~ (#511) | fight | S |
| ~~GT66~~ | ~~News card (2026-10-16d) covers GT65: the wind on a slack line~~ (#515) | news | S |
| ~~GT67~~ | ~~In a fight the wind bows a slack line downwind (about 0.2 m on a light day, 0.4 m breezy, 0.65 m strong at mid-span), and it pulls straight once reeled or run on, so the scene shows the wind the fight card names~~ (#517) | feel | S |
| ~~GT68~~ | ~~On a breezy day a solid hook needs a strike 15% quicker (30% on a strong day), since the wind's bow in the line soaks up the strike; the strike hint says "solid under N s in this wind"~~ (#519) | strike | S |
| ~~GT69~~ | ~~News card (2026-10-16e) covers GT67 and GT68: the wind's bow on a slack fight line and the quicker solid strike it asks for~~ (#522) | news | S |
| ~~GT70~~ | ~~A pike, tiger muskie or ghost pike rolls on the line at the net instead of making a last run: a short roll that can't be turned, and a line held tight through it loads into the red like a leap; the fight card calls it~~ (#524) | fish | S |
| ~~GT71~~ | ~~News card (2026-10-16f) covers GT70: a pike rolls on the line at the net~~ (#527) | news | S |
| ~~GT72~~ | ~~On the lake a rolling pike turns over twice about its own length at the surface, and the boat doesn't swing for a roll, so the scene shows the roll the fight card calls~~ (#530) | feel | S |
| ~~GT73~~ | ~~On a leap or a roll the fight card's steering line says it can't be turned and to let go, instead of showing the turn-a-run hint~~ (#531) | fight | S |
| ~~GT74~~ | ~~News card (2026-10-16h) covers GT72 and GT73: the pike turning over in the scene, and the fight card saying a leap or a roll can't be turned~~ (#534) | news | S |
| ~~GT75~~ | ~~A carp's first run after the hook lasts 1.6× as long as its other runs, and the fight card calls it ("a carp's first run is the long one")~~ (#536) | fish | S |
| ~~GT76~~ | ~~News card (2026-10-16i) covers GT75: a carp's long first run~~ (#538) | news | S |
| ~~GT77~~ | ~~A lake whitefish has a soft mouth: reeled in the red for 0.8 s the hook tears out and it gets away; the fight card says so, warns while it tears, and the result names the torn hook~~ (#541) | fish | S |
| ~~GT78~~ | ~~News card (2026-10-16j) covers GT77: a whitefish's soft mouth~~ (#543) | news | S |
| ~~GT79~~ | ~~Perch, bluegill and crappie school: after landing one, the next two casts at that bank bite 30% sooner and half the bites are the same kind; the hint says so~~ (#544) | fish | S |
| ~~GT80~~ | ~~News card (2026-10-16k) covers GT79: panfish schools~~ (#545) | news | S |
| ~~GT81~~ | ~~School shadows: small fish shadows mill round the float on a schooled cast~~ (#548) | scene | S |
| ~~GT82~~ | ~~News card (2026-10-16l) covers GT81: school shadows~~ (#551) | news | S |
| ~~GT83~~ | ~~Walleye bite light: the float only slides under, the strike call says so, and it holds the bait 1.3x longer~~ (#555) | bite | S |
| ~~GT84~~ | ~~News card (2026-10-16n) covers GT83: walleye light bite~~ (#556) | news | S |
| ~~GT85~~ | ~~Bait thieves: a golden shiner sometimes nibbles the bait off the hook instead of biting~~ (#558) | bite | S |
| ~~GT86~~ | ~~News card (2026-10-16o) covers GT85: bait thieves~~ (#559) | news | S |
| ~~GT87~~ | ~~Spooked water: a fish lost in a fight scatters the school and slows the next bite at that bank (1.4x, not for a beginner on their first catches)~~ (#560) | bite | S |
| ~~GT88~~ | ~~News card (2026-10-16p) covers GT87: spooked water~~ (#561) | news | S |
| ~~GT89~~ | ~~Sturgeon breach: a sturgeon's first run after the hook is a leap clear of the water~~ (#562) | fight | S |
| ~~GT90~~ | ~~News card (2026-10-16q) covers GT89: sturgeon breach~~ (#563) | news | S |
| ~~GT91~~ | ~~Habit lines on the fight card: jumper, breacher, roller, long runner~~ (#567) | ui | S |
| ~~GT92~~ | ~~Burbot coil: a burbot coils on the line at the net, like a pike's roll~~ (#570) | fight | S |
| ~~GT93~~ | ~~News card (2026-10-16s) covers GT91 and GT92: habit lines, burbot coil~~ (#582) | news | S |
| ~~GT94~~ | ~~Crappie paper mouth: a crappie's hook tears out when reeled in the red, like a whitefish's~~ (#585) | fight | S |
| ~~GT95~~ | ~~News card (2026-10-16u) covers GT94: crappie paper mouth~~ (#587) | news | S |
| ~~GT96~~ | ~~Salmon long run: a salmon's first run after the hook is the long one, like a carp's~~ (#590) | fight | S |
| ~~GT97~~ | ~~News card (2026-10-16v) covers GT96: salmon long run~~ (#592) | news | S |
| ~~GT98~~ | ~~Smallmouth scrapper: a smallmouth bass tires 20% slower than its size says~~ (#595) | fight | S |
| ~~GT99~~ | ~~News card (2026-10-16w) covers GT98: smallmouth scrapper~~ (#596) | news | S |
| ~~GT100~~ | ~~Point rocks snag: a cast into the point's rocky shallows can snag, like the reeds' weed~~ (#599) | cast | S |
| ~~GT101~~ | ~~News card (2026-10-16z) covers GT100: point rocks snag~~ (#620) | news | S |
| ~~GT102~~ | ~~Dock pilings: a run left unturned at the dock wraps the line round a piling; ease off till it swings free~~ (#623) | fight | S |
| ~~GT103~~ | ~~News card (2026-10-16zb) covers GT102: dock pilings~~ (#626) | news | S |
| ~~GT104~~ | ~~Inlet downstream runs: a run heading with the current, left unturned, takes 30% more line~~ (#628) | fight | S |
| ~~GT105~~ | ~~News card (2026-10-16zc) covers GT104: inlet downstream runs~~ (#631) | news | S |
| ~~GT106~~ | ~~Muskie follow: a tiger muskie that misses the strike follows the bait and hits once more, with no nibble~~ (#633) | bite | S |
| ~~GT107~~ | ~~News card (2026-10-16zd) covers GT106: muskie follow~~ (#636) | news | S |
| ~~GT108~~ | ~~The landed card notes Turned it upstream every time when every run downstream at the inlet was turned~~ (#638) | fight | S |
| ~~GT109~~ | ~~Rainbow tail-walk: a rainbow trout's first leap is a long tail-walk across the top (1.8x a usual leap), with its own call and habit line~~ (#640) | fight | S |
| ~~GT110~~ | ~~News card for the tail-walk and the inlet landed note~~ (#642) | ui | S |
| ~~GT111~~ | ~~Largemouth cover-diver: in the weeds or round a piling a largemouth bass stays buried 1.6x longer and doesn't run again till it comes out, with a habit line~~ (#643) | fight | S |
| ~~GT112~~ | ~~Brook trout darter: halfway through each run a brook trout cuts back the other way, so a turn has to switch sides; its own call and habit line~~ (#646) | fight | S |
| ~~GT113~~ | ~~News card for the largemouth cover-diver and the brook trout dart~~ (#648) | ui | S |
| ~~GT114~~ | ~~Walleye head-shaker: once in the calm after each run a walleye shakes its head; reel through it and the line goes into the red (clean bonus lost, never the fish); call and habit line~~ (#651) | fight | S |
| ~~GT115~~ | ~~Catfish bottom-sticker: a sulking catfish takes two pumps to lift, with a call after the first and a habit line~~ (#655) | fight | S |
| ~~GT116~~ | ~~News card for the walleye head shake and the catfish bottom-sticker~~ (#666) | ui | S |
| ~~GT117~~ | ~~Head-shake feel: the hooked walleye wags its head on the lake, the rod knocks three times and the pad or phone buzzes~~ (#669) | fight | S |
| ~~GT118~~ | ~~Catfish lift feel: after the first pump a stuck catfish comes partway up on the lake, with one deep thud and a buzz~~ (#671) | fight | S |
| ~~GT119~~ | ~~News card for the head-shake and catfish lift feel~~ (#673) | ui | S |
| ~~GT120~~ | ~~The landed card counts darts followed (brook trout) and head shakes eased off (walleye)~~ (#675) | fight | S |
| ~~GT121~~ | ~~Pike grab: a pike at the reeds can hit a golden shiner on the way in, and the fight starts again with the pike; news card for it and the landed-card counts~~ (#679) | fight | S |
| ~~GT122~~ | ~~Grab feel: the pike starts where the shiner was, not back at the end of the line, and spray bursts at the fish when it hits~~ (#683) | fight | S |
| ~~GT123~~ | ~~More grabs: a largemouth takes a bluegill off the point and a walleye a perch from the boat, each with its own call and landed note; news card~~ (#685) | fight | S |
| GT124 | The one that got away: a bigger fish that breaks off can bite again at its bank, same weight, within the next five casts; a call and a landed note | fight | S |

## Risks / open questions for the owner

1. **Boat stance (P19) and the Inlet (P18) both widen `SpotId` across shared, API (`me.ts` spots record), scene, and tests — L each.** Go, or keep the lake at four banks and spend D on P17 + species only?
2. **Lures stay bound to packed field-log gear (P17 keeps `luresPacked(readTackle())`).** Keep that link, or move to a server-side tackle inventory bought with points (needs a table + endpoint, and the field-log tie-in weakens)?
3. **`hour`/`sky`/`clean` on catches are client-asserted until the deferred anti-cheat.** P12 badges and the P13 weekly board raise the stakes of that — acceptable for now, or should C wait for the replay engine on `codex/gameplay`?

Also worth a call: seasons by real month (P24) vs a faster cadence; tap-to-walk vs a joystick for P7 (Claude built both in #201: the stick sits beside tap-to-walk on touch screens).

## Wave BR — Room for photos (added 2026-10-15, after Wave BQ shipped)

| # | Title | Area | Size |
|---|---|---|---|
| ~~BR1~~ | ~~The game's catch snapshots stop going missing after about 60 landings: when the browser's photo room is full, the game's oldest snapshots make way for the new one, never a species' heaviest fish or a photo the player chose~~ (#241) | field log | S |
| ~~BR2~~ | ~~The first catch the player keeps in a visit (landed in the game or written in the field log) asks the browser to keep this site's storage, so a clean-up of quiet sites or a full disk doesn't wipe the book; the sample book never asks~~ (#242) | field log | S |
| ~~BR3~~ | ~~The field log's footer reminds the player to download a copy once the book holds 10 of their own catches and none was ever downloaded, and again after every 25 new catches since the last download (the sample week's fish don't count)~~ (#243) | field log | S |
| ~~BR4~~ | ~~"Install the app" in the field log's footer when the browser offers it (Chrome, Edge, Android): an installed app keeps its storage better than a tab~~ (#244) | field log | S |
| ~~BR5~~ | ~~On an iPhone or iPad in Safari (no install offer there), the field log's footer tells a player with their own catches to tap Share, then Add to Home Screen; it hides once the app is on the home screen~~ (#245) | field log | S |
| ~~BR6~~ | ~~The lake asks three for PCF shadows by name instead of the deprecated soft default it already fell back to: same picture, and the console no longer repeats a deprecation warning dozens of times a session~~ (#246) | polish | S |
| ~~BR7~~ | ~~The field log fetches the lake's code once the browser is idle, so "Go fishing" opens without waiting for the 3D bundle (skipped with data saver on or on a 2G link)~~ (#247) | perf | S |
| ~~BR8~~ | ~~The Bests page shows when the fish bite (dawn to night, from each catch's clock time) and the five lures that took the most fish, as labelled bars with the count in words~~ (#248) | field log | S |
| ~~BR9~~ | ~~The Bests page also counts fish by season (spring to winter, by the month each was caught)~~ (#249) | field log | S |
| ~~BR10~~ | ~~The Bests page's top row adds the best day: the most fish landed on one local day, with its date~~ (#250) | field log | S |
| ~~BR11~~ | ~~Logging a catch suggests the player's own lures first (most fish on top) and their own species alongside the stock list, and a new catch on a trip starts with the lure of that trip's last fish~~ (#251) | field log | S |
| ~~BR12~~ | ~~Weather on a catch is optional: sky, wind and water temperature can all be left blank (no weather is kept), and once one is noted the other two are asked for as before~~ (#252) | field log | S |
| ~~BR13~~ | ~~Metric units: weights, lengths and water temperature show in kg, cm and °C across the catch card, field log, board, field guide and fight bar, and the catch form takes metric numbers; Settings has a Units choice, which follows the language until picked (Polish starts on metric); the book still stores pounds, inches and °F + news~~ (#253) | access, field log | M |
| ~~BR14~~ | ~~With metric units on, the catch form's out-of-range messages name centimetres, kilograms and °C bounds instead of inches, pounds and °F~~ (#254) | field log | S |
| ~~BR15~~ | ~~"Download catches as a spreadsheet" in the field log's footer: a CSV of every catch, newest first, in the reader's language and units (semicolons and decimal commas for Polish spreadsheets, UTF-8 with a byte-order mark)~~ (#255) | field log | S |
| ~~BR16~~ | ~~A trip's page sums up its fish above the cards: how many, how many species, and the largest (by weight, else length)~~ (#256) | field log | S |
| ~~BR17~~ | ~~A water's page gets the same fish summary as a trip (count, species, largest), from one shared FishSum~~ (#257) | field log | S |
| ~~BR18~~ | ~~The sample week's invented waters, trips and notes show in the reader's language (their Polish lines existed but were never used); the stored book keeps the English lines, and the player's own words are never translated~~ (#258) | field log, i18n | S |
| ~~BR19~~ | ~~A photo wall at /photos: every catch with a picture (the game's snapshots and the player's own), newest first, 50 at a time, each opening its catch; linked as "Photos (N)" from the catch log~~ (#259) | field log | S |
| ~~BR20~~ | ~~The field log's home links the photo wall beside All catches, and the news card tells players about the photo wall, the spreadsheet download and the trip and water summaries~~ (#260) | field log | S |
| ~~BR21~~ | ~~Newer and older catch links at the foot of each catch page~~ (#261) | field log | S |
| ~~BR22~~ | ~~Later and earlier outing links at the foot of each trip page, sharing the catch page's neighbour helper~~ (#262) | field log | S |
| ~~BR23~~ | ~~A catch page marks the book's heaviest or longest fish, or the biggest of its kind when it beat another fish of that kind on the same measure~~ (#263) | field log | S |
| ~~BR24~~ | ~~Catch cards in every list carry a small "Book record" or "Best of its kind" tag, worked out once per book~~ (#264) | field log | S |
| ~~BR25~~ | ~~News card (2026-10-15c) tells players about record tags and the newer and older links~~ (#265) | field log | S |
| ~~BR26~~ | ~~The home catch search keeps its words in the address (?find=), so Back from a catch returns to the same matches; each species on the Bests page links to its matches~~ (#266) | field log | S |
| ~~BR27~~ | ~~A water with three or more fish shows "What works here": its top three lures with counts and the time of day that gave the most fish~~ (#267) | field log | S |
| ~~BR28~~ | ~~The catch form offers the chosen water's top lures as one-tap buttons under the lure field (from three fish on that water)~~ (#268) | field log | S |
| ~~BR29~~ | ~~The water page's Best conditions and What works here boxes are labelled, so each aside landmark is unique (axe landmark-unique)~~ (#269) | field log, a11y | S |
| ~~BR30~~ | ~~An outing today or ahead shows its water's What works here box (WaterTipsBox shared with the water page), and the home page's Next stat links to that outing~~ (#270) | field log | S |
| ~~BR31~~ | ~~"Log another like this" on each catch page opens the catch form with the same water, outing, species, lure and measure, timed now~~ (#271) | field log | S |
| ~~BR32~~ | ~~News card (2026-10-15d) tells players about What works here, the one-tap lure picks and Log another like this~~ (#272) | field log | S |
| ~~BR33~~ | ~~The landed-fish card's Field log button opens that fish's own page in the book once it is saved (else the catch log)~~ (#273) | game, field log | S |
| ~~BR34~~ | ~~Fish and day trips from the game go to the game's own Stillwater lake (added once), never to the first real lake in the player's book, so What works here and records for real waters stay real; earlier game fish stay where they are~~ (#274) | game, field log | S |
| ~~BR35~~ | ~~An upcoming trip's tackle list offers the water's best lures that are not on it yet as one-tap "+ lure" buttons~~ (#275) | field log, gear | S |
| ~~BR36~~ | ~~Each catch page can save the game's picture card (photo, species, size, water, weather, date) for any fish in the book, shared on phones or downloaded~~ (#276) | field log | S |
| ~~BR37~~ | ~~A new catch form starts on length or weight as the player measured their newest fish by hand (sample and game fish do not count); length until then~~ (#277) | field log | S |
| ~~BR38~~ | ~~News card (2026-10-15e) tells players about picture cards from catch pages and the game's fish filed under Stillwater~~ (#278) | field log | S |
| ~~BR39~~ | ~~The Spots list shows each water's last fish date and puts the most recently fished waters first; waters with no fish keep book order after them~~ (#279) | field log | S |
| ~~BR40~~ | ~~The Tackle page's upcoming outings offer the same one-tap "+ lure" picks as the trip page (packingTips in field/waterTips.ts)~~ (#280) | field log, gear | S |
| ~~BR41~~ | ~~Upcoming trips have "Add to calendar": an all-day .ics event with the outing's title, water and note, made on the device (field/tripIcs.ts; downloadFile moved to field/download.ts)~~ (#281) | field log | S |
| ~~BR42~~ | ~~A catch added from an earlier outing starts on that outing's day (at the current clock time) instead of today~~ (#282) | field log | S |
| ~~BR43~~ | ~~Picking an earlier outing in the catch form moves the catch to that day, until the player sets the time themselves~~ (#283) | field log | S |
| ~~BR44~~ | ~~A trip still ahead hides "Add a catch" (a catch cannot be dated in the future, so it would land on today under a future outing)~~ (#284) | field log | S |
| ~~BR45~~ | ~~The catch form notes when the fish is dated a different day from its outing (a gentle line, not a block)~~ (#285) | field log | S |
| ~~BR46~~ | ~~News card (2026-10-15f) tells players about Add to calendar and the Spots order~~ (#286) | field log | S |
| ~~BR47~~ | ~~Undo after deleting a fish, outing or water in the field log~~ (#287) | field | S |
| ~~BR48~~ | ~~Go again: plan a new outing from a past one, with its water, title and tackle list~~ (#288) | field | S |
| ~~BR49~~ | ~~Take a piece off a tackle list~~ (#289) | gear | S |
| ~~BR50~~ | ~~News card (2026-10-15g) tells players about Undo, Go again and taking tackle off a list~~ (#290) | field log | S |
| ~~BR51~~ | ~~An unsaved new catch is kept for a day and offered back on the catch form~~ (#291) | field | S |
| ~~BR52~~ | ~~Home page points to an unsaved catch waiting on the form~~ (#292) | field | S |
| ~~BR53~~ | ~~Catch form offers the weather from the last fish on the same outing~~ (#293) | field | S |
| ~~BR54~~ | ~~Mark a catch as released; shown on the catch page and card, kept in the book file and the spreadsheet~~ (#294) | field | S |
| ~~BR55~~ | ~~Trip and water sums count the released fish~~ (#295) | field | S |
| ~~BR56~~ | ~~News card (2026-10-15h) tells players about Released, kept drafts and same weather~~ (#296) | field log | S |
| ~~BR57~~ | ~~A fish released from the game catch card is marked released in the field log~~ (#297) | field log | S |
| ~~BR58~~ | ~~Bests page says how many fish in the book were released~~ (#298) | field | S |
| ~~BR59~~ | ~~Undo returns to the restored entry's page; Escape closes the Undo bar~~ (#299) | field | S |
| ~~BR60~~ | ~~Moon phase on catch and trip pages~~ (#300) | field | S |
| ~~BR61~~ | ~~Bests counts fish by the week of the moon~~ (#301) | field | S |
| ~~BR62~~ | ~~News card (2026-10-15i) tells players about the moon in the field log and released lake fish~~ (#302) | field log | S |
| ~~BR63~~ | ~~A page per species: count, size, best lures and time, waters, every fish~~ (#303) | field | S |
| ~~BR64~~ | ~~Field log pages open at the top after a link; Back keeps the place~~ (#304) | field | S |
| ~~BR65~~ | ~~News card (2026-10-15j) tells players about species pages~~ (#305) | field log | S |
| ~~BR66~~ | ~~A new catch starts ticked as released when the last own fish went back~~ (#306) | field | S |
| ~~BR67~~ | ~~Water and trip pages list their species, each linking to its page~~ (#307) | field | S |
| ~~BR68~~ | ~~Species page has a Log another button that starts a catch of that kind~~ (#308) | field | S |
| ~~BR69~~ | ~~Species page shows when that fish bites, by part of the day~~ (#309) | field | S |
| ~~BR70~~ | ~~News card (2026-10-15k) tells players about species chips, bite times and Log another~~ (#310) | field log | S |
| ~~BR71~~ | ~~Species page shows the first and newest fish of the kind, each a link~~ (#311) | field | S |
| ~~BR72~~ | ~~The Fish page lists every species in the book, each linking to its page~~ (#312) | field | S |
| ~~BR73~~ | ~~A catch page says which of its kind it is, like Brook trout: 2 of 3~~ (#313) | field | S |
| ~~BR74~~ | ~~Home tiles link to the catch log and waters and count species and outings~~ (#314) | field | S |
| ~~BR75~~ | ~~A packed tackle list says All packed and can be unpacked in one tap~~ (#315) | field | S |
| ~~BR76~~ | ~~Upcoming trip cards show how the bag is packed instead of Nothing logged~~ (#316) | field | S |
| ~~BR77~~ | ~~News card (2026-10-15l) tells players about packing, kind numbers and the species list~~ (#317) | field log | S |
| ~~BR78~~ | ~~Bests tiles link to the record fish, the waters and the best day's outing~~ (#318) | field | S |
| ~~BR79~~ | ~~A trip page puts its fish above the tackle once the outing is past or has fish~~ (#319) | field | S |
| ~~BR80~~ | ~~A catch page links its lure to every fish on that lure and labels its outing~~ (#320) | field | S |
| ~~BR81~~ | ~~Bests lures link to every fish taken on them~~ (#321) | field | S |
| ~~BR82~~ | ~~What works here lures link to every fish taken on them~~ (#322) | field | S |
| ~~BR83~~ | ~~News card (2026-10-15m) tells players about lure links, Bests tile links and trip page order~~ (#323) | field log | S |
| ~~BR84~~ | ~~The catch form shows the biggest fish of the kind being typed~~ (#324) | field | S |
| ~~BR85~~ | ~~A water page stops repeating its own name on its trip and catch cards~~ (#325) | field | S |
| ~~BR86~~ | ~~A trip page names a water on its catch cards only when the fish came from another one~~ (#326) | field | S |
| ~~BR87~~ | ~~The map list counts the fish from each water~~ (#327) | field | S |
| ~~BR88~~ | ~~The trip form says how the last outing on the chosen water went~~ (#328) | field | S |
| ~~BR89~~ | ~~News card (2026-10-15n) tells players about biggest so far, last outing hints and map counts~~ (#329) | field log | S |
| ~~BR90~~ | ~~Spot cards name the next planned outing on that water~~ (#330) | field | S |
| ~~BR91~~ | ~~Past trips are grouped under month headings~~ (#331) | field | S |
| ~~BR92~~ | ~~A trip page says between which times its fish came~~ (#332) | field | S |
| ~~BR93~~ | ~~Past trips on the Gear page fold their tackle lists away~~ (#333) | field | S |
| ~~BR94~~ | ~~News card (2026-10-15o) tells players about spot card outings, month headings, trip times and folded gear~~ (#334) | field log | S |
| ~~BR95~~ | ~~Spot page outings grouped under month headings like the Trips page~~ (#335) | field | S |
| ~~BR96~~ | ~~Gear page past trips grouped under month headings~~ (#336) | field | S |
| ~~BR97~~ | ~~Fish page catch log split under month headings~~ (#337) | field | S |
| ~~BR98~~ | ~~Species and spot fish lists split under month headings~~ (#338) | field | S |
| ~~BR99~~ | ~~Catch search results split under month headings~~ (#339) | field | S |
| ~~BR100~~ | ~~Home Next tile says when the next outing is, before its water~~ (#340) | field | S |
| ~~BR101~~ | ~~News card (2026-10-15p) tells players about month headings on fish lists and search, and the Next tile day~~ (#341) | field log | S |
| ~~BR102~~ | ~~Photos wall split under month headings~~ (#342) | field | S |
| ~~BR103~~ | ~~Bests water cards say which kind a water gives most~~ (#343) | field | S |
| ~~BR104~~ | ~~A new catch on a water with an outing that day files under that outing~~ (#344) | field | S |
| ~~BR105~~ | ~~The outing on a new catch follows its day until the player picks one~~ (#345) | field | S |
| ~~BR106~~ | ~~Trip form points out an outing already on that water that day~~ (#346) | field | S |
| ~~BR107~~ | ~~News card (2026-10-15q) tells players about same-day outing filing, the trip heads-up, photo months and Bests water lines~~ (#347) | field log | S |
| ~~BR108~~ | ~~Game field guide cards link to the kind's field log page when the book holds some~~ (#348) | game | S |
| ~~BR109~~ | ~~Species pages for lake kinds link to the game field guide~~ (#349) | field | S |
| ~~BR110~~ | ~~News card (2026-10-15r) tells players the game field guide and species pages link to each other~~ (#350) | game | S |
| ~~BR111~~ | ~~"/" jumps to the catch search on the field log home~~ (#351) | field | S |
| ~~BR112~~ | ~~Month headings on the Fish page and in search are h2, so no heading level is skipped~~ (#352) | field | S |
| ~~BR113~~ | ~~An upcoming trip says its fish will show up once logged on the day~~ (#353) | field | S |
| ~~BR114~~ | ~~Spot form points out a water already in the book by the same name~~ (#354) | field | S |
| ~~BR115~~ | ~~The Largest in a fish summary links to that catch~~ (#355) | field | S |
| ~~BR116~~ | ~~News card (2026-10-15s) tells players about the / search key, Largest links and the same-name water heads-up~~ (#356) | field log | S |
| ~~BR117~~ | ~~A fish logged without its outing offers to join the outing on its water that day~~ (#358) | field | S |
| ~~BR118~~ | ~~An outing page offers to add its water's loose fish from that day~~ (#360) | field | S |
| ~~BR119~~ | ~~News card (2026-10-15t) tells players about adding loose fish to their outing~~ (#361) | field log | S |
| ~~BR120~~ | ~~What works here names the weather most fish came in~~ (#363) | field | S |
| ~~BR121~~ | ~~Bests counts fish by the weather~~ (#366) | field | S |
| ~~BR122~~ | ~~News card (2026-10-15v) tells players about the weather lines in What works here and Bests~~ (#368) | field log | S |
| ~~BR123~~ | ~~Trips page month headings count the month's outings and fish~~ (#369) | field | S |
| ~~BR124~~ | ~~Water page month headings count the month's outings and fish~~ (#371) | field | S |
| ~~BR125~~ | ~~Photos page month headings count the month's photos~~ (#373) | field | S |
| ~~BR126~~ | ~~Catch list month headings count the month's fish~~ (#375) | field | S |
| ~~BR127~~ | ~~News card line for the month totals~~ (#376) | field | S |
| ~~BR128~~ | ~~Species pages show fish by the weather~~ (#378) | field | S |
| ~~BR129~~ | ~~Species pages show fish by season when they span more than one~~ (#379) | field | S |
| ~~BR130~~ | ~~Catch search finds fish by month~~ (#382) | field | S |
| ~~BR131~~ | ~~Bests counts fish by month, linking to the month search~~ (#383) | field | S |
| ~~BR132~~ | ~~Home Fish tile shows this month, search links work from home~~ (#386) | field | S |
| ~~BR133~~ | ~~News card line for searching by month~~ (#388) | field | S |
| ~~BR134~~ | ~~Catch search finds released fish, linked from Bests~~ (#390) | field | S |
| ~~BR135~~ | ~~What works here names the best season~~ (#392) | field | S |
| ~~BR136~~ | ~~Tackle page past outings count their fish~~ (#393) | field | S |
| ~~BR137~~ | ~~Past tackle lists say how many fish each piece took~~ (#395) | field | S |
| ~~BR138~~ | ~~Search sums up its matches~~ (#396) | field | S |
| ~~BR139~~ | ~~Catch search finds fish by kind of water~~ (#398) | field | S |
| ~~BR140~~ | ~~Month names cached so big-book searches stay quick~~ (#400) | field | S |
| ~~BR141~~ | ~~Search saves its matches as a spreadsheet~~ (#402) | field | S |
| ~~BR142~~ | ~~News card line for the newer search features~~ (#404) | field | S |
| ~~BR143~~ | ~~Past outings paged, fish counted in one pass (Trips 26 s to 0.4 s on 4,200 outings)~~ (#406) | field | S |
| ~~BR144~~ | ~~Map labels no longer overlap on phones~~ (#408) | field | S |
| ~~BR145~~ | ~~Search suggests what to try when nothing matches~~ (#410) | field | S |
| ~~BR146~~ | ~~Catch form stays quick to type in on a long book~~ (#412) | field | S |
| ~~BR147~~ | ~~Home shows this week in years past~~ (#414) | field | S |
| ~~BR148~~ | ~~Trip form notes this week in earlier years on the water~~ (#416) | field | S |
| ~~BR149~~ | ~~Same week in earlier years on a planned outing page~~ (#417) | field | S |
| ~~BR150~~ | ~~Same week in earlier years on a water page~~ (#419) | field | S |
| ~~BR151~~ | ~~Outing fish count beside the outing link on a catch page~~ (#421) | field | S |
| ~~BR152~~ | ~~Released mark on a catch page links to the released-fish search~~ (#423) | field | S |
| ~~BR153~~ | ~~Catch search by sky; Bests weather bars link to it~~ (#424) | field | S |
| ~~BR154~~ | ~~Catch search by season; Bests season bars link to it~~ (#426) | field | S |
| ~~BR155~~ | ~~Catch search by time of day; Bests bite-time bars link to it~~ (#427) | field | S |
| ~~BR156~~ | ~~Catch search by moon week; Bests moon bars link to it~~ (#429) | field | S |
| ~~BR157~~ | ~~Search no-match tip names seasons, times of day and skies~~ (#431) | field | S |
| ~~BR158~~ | ~~Catch page sky and moon link to their searches~~ (#433) | field | S |
| ~~BR159~~ | ~~News line for the new searches and same-week notes~~ (#435) | field | S |
| ~~BR160~~ | ~~What works here time, weather and season link to searches~~ (#437) | field | S |
| ~~BR161~~ | ~~Catch search joins terms with +; species page bars link to it~~ (#439) | field | S |
| ~~BR162~~ | ~~What works here links narrow to the water or species~~ (#441) | field | S |
| ~~BR163~~ | ~~Spot form kind-of-water buttons translated~~ (#442) | field | S |
| ~~BR164~~ | ~~Year on field log dates outside the current year~~ (#443) | field | S |
| ~~BR165~~ | ~~Plan one link on empty upcoming lists~~ (#444) | field | S |
| ~~BR166~~ | ~~Species page water counts link; By the moon bars~~ (#445) | field | S |
| ~~BR167~~ | ~~Lure link on catch cards; home species and outing counts link~~ (#447) | field | S |
| ~~BR168~~ | ~~Catch search by size bound (>2 lb, <30 cm)~~ (#449) | field | S |
| ~~BR169~~ | ~~News line for size and joined searches~~ (#450) | field | S |
| ~~BR170~~ | ~~Spot page species chips open that water's fish of the kind~~ (#452) | field | S |
| ~~BR171~~ | ~~Catch search by outing title~~ (#453) | field | S |
| ~~BR172~~ | ~~Catch time max now; trip and spot field length caps~~ (#455) | field | S |
| ~~BR173~~ | ~~Refused save focuses and marks the field; message clears on change~~ (#457) | field | S |
| ~~BR174~~ | ~~Arrow keys in the measure and water-type radio rows~~ (#458) | field | S |
| ~~BR175~~ | ~~Focus the heading (or search) after in-app navigation~~ (#461) | field | S |
| ~~BR176~~ | ~~Delete question as an alert dialog, focus on Keep, Escape closes~~ (#463) | field | S |
| ~~BR177~~ | ~~This week in years past reaches across New Year and counts years from the nearer date~~ (#464) | field | S |
| ~~BR178~~ | ~~Download reminder counts from a loaded book and restarts after restoring the sample~~ (#466) | field | S |
| ~~BR179~~ | ~~Restoring the sample book can be undone from the undo bar~~ (#468) | field | S |
| ~~BR180~~ | ~~Downloads say they happened; the file link is released later~~ (#469) | field | S |
| ~~BR181~~ | ~~Saving a catch says Fish saved or Changes saved~~ (#471) | field | S |
| ~~BR182~~ | ~~Undo bar buttons get 44px tap targets~~ (#473) | field | S |
| ~~BR183~~ | ~~News line for the saved-catch note, download notices and sample undo~~ (#474) | field | S |
| ~~BR184~~ | ~~An unreadable stored book is set aside and offered for download instead of overwritten~~ (#476) | field | S |
| ~~BR185~~ | ~~Field-log tabs pick up the book when another tab changes it~~ (#478) | field | S |
| ~~BR186~~ | ~~Book files with bad catch times or outing days are turned away~~ (#479) | field | S |
| ~~BR187~~ | ~~One species however its name is capitalised (form, Bests, counts)~~ (#480) | field | S |
| ~~BR188~~ | ~~Calendar files escape semicolons and fold long lines~~ (#481) | field | S |
| ~~BR189~~ | ~~Long links and words wrap on phone-width pages~~ (#482) | field | S |
| ~~BR190~~ | ~~The load-a-book question is announced and starts on Keep~~ (#483) | field | S |
| ~~BR191~~ | ~~Card headings nest one level below their section~~ (#484) | field | S |
| ~~BR192~~ | ~~Stale water link in the catch form, metric length bounds, metric map scale~~ (#485) | field | S |
| ~~BR193~~ | ~~Loaded catch times are stored in the book's own form~~ (#488) | field | S |
| ~~BR194~~ | ~~Tackle lists sync across tabs; blocked storage no longer blanks the field log~~ (#489) | field | S |
| ~~BR195~~ | ~~Trip and water forms say when a save fails~~ (#491) | field | S |
| ~~BR196~~ | ~~Outing time span shows days, badge ignores case, card headings, empty map link~~ (#493) | field | S |
| ~~BR197~~ | ~~Search keeps names with their own plus sign whole~~ (#495) | field | S |
| ~~BR198~~ | ~~Desktop side menu stays in view on long pages~~ (#497) | field | S |
| ~~BR199~~ | ~~Catch form offers the water's fish as picks and narrows lure picks to the kind~~ (#498) | field | S |
| ~~BR200~~ | ~~Catch form offers the same day's weather for a fish with no outing weather~~ (#500) | field | S |
| ~~BR201~~ | ~~Species pages show how the best of the kind grew~~ (#501) | field | S |
| ~~BR202~~ | ~~Outing pages lead with their fish from the outing's own day on~~ (#503) | field | S |
| ~~BR203~~ | ~~Bests and species pages count fish by wind and water temperature; search finds a wind~~ (#505) | field | S |
| ~~BR204~~ | ~~Notes keep line breaks; imperial reads a decimal comma; CSV formula guard; localised map coordinates~~ (#507) | field | S |
| ~~BR205~~ | ~~Search finds words from notes; count links use exact name terms so results match counts~~ (#509) | field | S |
| ~~BR206~~ | ~~Search takes a water temperature; temperature bars link to their fish~~ (#510) | field | S |
| ~~BR207~~ | ~~Each field-log page names its browser tab after its heading~~ (#512) | field | S |
| ~~BR208~~ | ~~Search finds a day; the Best day tile always links~~ (#513) | field | S |
| ~~BR209~~ | ~~News card 2026-10-16c for the field log's new counts and searches~~ (#514) | field | S |
| ~~BR210~~ | ~~Search bounds keep fish on the edge; trailing plus; best gains to a decimal; photo alt text~~ (#516) | field | S |
| ~~BR211~~ | ~~Bar and condition links search sky, wind, time, season and moon exactly~~ (#518) | field | S |
| ~~BR212~~ | ~~Search links on home move focus; Home clears the search; undo bar ignores Escape in fields and prompts~~ (#520) | field | S |
| ~~BR213~~ | ~~Search finds kept fish and water notes; "released" finds just released fish~~ (#521) | field | S |
| ~~BR214~~ | ~~Edit pages and single catches get their own tab titles~~ (#523) | field | S |
| ~~BR215~~ | ~~A fish can carry both a length and a weight~~ (#525) | field | S |
| ~~BR216~~ | ~~Download the stored book; load-a-book counts and newest dates~~ (#526) | field | S |
| ~~BR217~~ | ~~Keep unreadable tackle lists; refuse duplicate pieces and ids~~ (#528) | field | S |
| ~~BR218~~ | ~~Refuse impossible sizes in a book file; map spots read once~~ (#529) | field | S |
| ~~BR219~~ | ~~Copy the last outing's bag; undo loading a book file~~ (#532) | field | S |
| ~~BR220~~ | ~~News card: both measures, copying a bag, undoing a load~~ (#533) | field | S |
| ~~BR221~~ | ~~Note where a water is (typed or device location)~~ (#535) | field | S |
| ~~BR222~~ | ~~Audit 9 fixes: map pins, load warning and undo, tackle focus~~ (#537) | field | S |
| ~~BR223~~ | ~~Heaviest and longest in summaries; exact month links; steady search count~~ (#539) | field | S |
| ~~BR224~~ | ~~Add just a file's new fish; GEO in calendar files~~ (#540) | field | S |
| ~~BR225~~ | ~~Length and weight on species pages; suggested other measure~~ (#542) | field | S |
| ~~BR226~~ | ~~Audit 10 fixes: snapshot room, fresh pages, real dates~~ (#546) | field | S |
| ~~BR227~~ | ~~Failed saves say so; focus after Show more and filing~~ (#547) | field | S |
| ~~BR228~~ | ~~One-pass counts on big books; spreadsheet per outing, water, kind~~ (#549) | field | S |
| ~~BR229~~ | ~~Photo room meter and Make room~~ (#550) | field | S |
| ~~BR230~~ | ~~That-day link on last year's fish~~ (#552) | field | S |
| ~~BR231~~ | ~~Audit 11: merge photo room, unneeded waters, make-room focus, small weights~~ (#553) | field | S |
| ~~BR233~~ | ~~Deleted fish stay out of merges~~ (#557) | field | S |
| ~~BR234~~ | ~~Copy an outing as a text summary~~ (#564) | field | S |
| ~~BR235~~ | ~~Copy a catch as a text summary~~ (#565) | field | S |
| ~~BR236~~ | ~~By year bars and year search~~ (#566) | field | S |
| ~~BR237~~ | ~~Main landmark on auth screens~~ (#568) | field | S |
| ~~BR238~~ | ~~This year on the home fish tile~~ (#569) | field | S |
| ~~BR239~~ | ~~Lures that took it on species pages~~ (#571) | field | S |
| ~~BR240~~ | ~~Audit 12 fixes~~ (#572) | field | S |
| ~~BR241~~ | ~~Year goal on Bests~~ (#573) | field | S |
| ~~BR242~~ | ~~Year goal on the home tile~~ (#574) | field | S |
| ~~BR243~~ | ~~News 2026-10-16r for field-log features~~ (#575) | field | S |
| ~~BR244~~ | ~~Year goals in the book file~~ (#576) | field | S |
| ~~BR245~~ | ~~Bite pace on outings~~ (#577) | field | S |
| ~~BR246~~ | ~~Days on the water this year~~ (#578) | field | S |
| ~~BR247~~ | ~~Fish per outing on each water~~ (#579) | field | S |
| ~~BR248~~ | ~~Size rank among its kind~~ (#580) | field | S |
| ~~BR249~~ | ~~Audit 13 fixes~~ (#581) | field | S |
| ~~BR250~~ | ~~Dark theme for the field log~~ (#583) | field | S |
| ~~BR251~~ | ~~News line for recent field-log features~~ (#584) | field | S |
| ~~BR252~~ | ~~Best outing on a water, on the trip page~~ (#586) | field | S |
| ~~BR253~~ | ~~Outings in a row with a fish, on Bests~~ (#588) | field | S |
| ~~BR254~~ | ~~Best outing on a spot page~~ (#589) | field | S |
| ~~BR255~~ | ~~Catch time opens that day's fish~~ (#591) | field | S |
| ~~BR256~~ | ~~Audit 14 fixes~~ (#593) | field | S |
| ~~BR257~~ | ~~Average fish per outing on the trips page~~ (#594) | field | S |
| ~~BR258~~ | ~~Print layout for the field log~~ (#597) | field | S |
| ~~BR259~~ | ~~Print the packing list button~~ (#598) | field | S |
| ~~BR260~~ | ~~Light / dark / device choice for the field log~~ (#600) | field | S |
| ~~BR261~~ | ~~Copy a summary of a water~~ (#601) | field | S |
| ~~BR262~~ | ~~Audit 15 fixes~~ (#602) | field | S |
| ~~BR263~~ | ~~Copy a summary of a species~~ (#603) | field | S |
| ~~BR264~~ | ~~Polish May dates in the genitive~~ (#604) | field | S |
| ~~BR265~~ | ~~News line for colours, printing, summaries~~ (#605) | field | S |
| ~~BR266~~ | ~~Copy a summary of the year~~ (#606) | field | S |
| ~~BR267~~ | ~~Narrow phone fixes with larger text~~ (#607) | field | S |
| ~~BR268~~ | ~~Whole-book sum on the catch log~~ (#608) | field | S |
| ~~BR269~~ | ~~Copy a summary of search results~~ (#609) | field | S |
| ~~BR270~~ | ~~Audit 16 fixes~~ (#610) | field | S |
| ~~BR271~~ | ~~News line for year/search summaries and book total~~ (#611) | field | S |
| ~~BR272~~ | ~~Rename tripSummary.ts to summaries.ts~~ (#612) | field | S |
| ~~BR273~~ | ~~Log a catch opens on today's water~~ (#613) | field | S |
| ~~BR274~~ | ~~Pounds and ounces and inch fractions in the size fields~~ (#614) | field | S |
| ~~BR275~~ | ~~Save and log another, sticky save bar on the catch form~~ (#615) | field | S |
| ~~BR276~~ | ~~Water temperature optional in a fish's weather~~ (#616) | field | S |
| ~~BR277~~ | ~~Catch time from the photo's EXIF~~ (#617) | field | S |
| ~~BR278~~ | ~~Rename or merge a species across the book~~ (#618) | field | S |
| ~~BR279~~ | ~~Rename or merge a lure from its catch search~~ (#619) | field | S |
| ~~BR280~~ | ~~Audit 17 fixes: written units, repeat save-and-another, Polish rename~~ (#621) | field | S |
| ~~BR281~~ | ~~Nearest water from the phone's location on the catch form~~ (#622) | field | S |
| ~~BR282~~ | ~~News card for the catch form changes~~ (#624) | field | S |
| ~~BR283~~ | ~~Lost fish and missed strikes on an outing~~ (#625) | field | S |
| ~~BR284~~ | ~~Sample lines saved unchanged from a Polish form stay English~~ (#627) | field | S |
| ~~BR285~~ | ~~One-row phone save bar and same-minute fish span~~ (#629) | field | S |
| ~~BR286~~ | ~~Search words without a plus~~ (#630) | field | S |
| ~~BR287~~ | ~~Catch search on the Catches page~~ (#632) | field | S |
| ~~BR288~~ | ~~Map link on outings and Home's next outing~~ (#634) | field | S |
| ~~BR289~~ | ~~Note when a new water drops the fish's outing~~ (#635) | field | S |
| ~~BR290~~ | ~~Fold empty tally rows~~ (#637) | field | S |
| ~~BR291~~ | ~~Own pinned waters on a fitted map sheet~~ (#639) | field | S |
| ~~BR292~~ | ~~Review 18 fixes: sample names, count buttons, merged counts~~ (#641) | field | S |
| ~~BR293~~ | ~~Review 19 fixes: outing kept on water change-back, own-waters map labels~~ (#644) | field | S |
| ~~BR294~~ | ~~Nearest water to me on the outing form~~ (#645) | field | S |
| ~~BR295~~ | ~~Landed of hooked over counted outings on Bests and waters~~ (#647) | field | S |
| ~~BR296~~ | ~~Search results largest first~~ (#649) | field | S |
| ~~BR297~~ | ~~Share button beside Copy a summary~~ (#650) | field | S |
| ~~BR298~~ | ~~Outings spreadsheet with lost and missed~~ (#652) | field | S |
| ~~BR299~~ | ~~Note where it is: place links from map and water page~~ (#653) | field | S |
| ~~BR300~~ | ~~Review 20 fixes: outing restore only after a water change, no place link on sample waters~~ (#654) | field | S |
| ~~BR301~~ | ~~News 2026-10-16zg for field log round 3~~ (#656) | field | S |
| ~~BR302~~ | ~~Search: moon words, dusk/sunrise, lb-oz sizes~~ (#657) | field | S |
| ~~BR303~~ | ~~Dated backup and spreadsheet names~~ (#658) | field | S |
| ~~BR304~~ | ~~Sunrise and sunset on outings~~ (#659) | field | S |
| ~~BR305~~ | ~~Season picker on Bests~~ (#660) | field | S |
| ~~BR306~~ | ~~Make an outing of a loose fish's day~~ (#661) | field | S |
| ~~BR307~~ | ~~Review 21 fixes: whole-book goal, season card links, moon filler~~ (#662) | field | S |
| ~~BR308~~ | ~~News 2026-10-16zh for field log round 4~~ (#663) | field | S |
| ~~BR309~~ | ~~Tackle: several at once, today's fish on gear, plural duplicates~~ (#664) | field | S |
| ~~BR310~~ | ~~Photo as a search word~~ (#665) | field | S |
| ~~BR311~~ | ~~Species page photos~~ (#667) | field | S |
| ~~BR312~~ | ~~Lure record on the gear page~~ (#668) | field | S |
| ~~BR313~~ | ~~Packing list copy and Home Next sun/packing line~~ (#670) | field | S |
| ~~BR314~~ | ~~Review round 22 fixes~~ (#672) | field | S |
| ~~BR315~~ | ~~News 2026-10-16zk~~ (#674) | field | S |
| ~~BR316~~ | ~~Search size beside words, 320px tab bar, fish sum dots~~ (#676) | field | S |
| ~~BR317~~ | ~~Keep unsaved fish edits; month-old backup reminder~~ (#677) | field | S |
| ~~BR318~~ | ~~Save note for first/new best; date words in search~~ (#678) | field | S |
| ~~BR319~~ | ~~Last year by this date on the Home fish tile~~ (#680) | field | S |
| ~~BR320~~ | ~~Day calendar on Bests~~ (#681) | field | S |
| ~~BR321~~ | ~~Review round 23 fixes and same-fish-twice note~~ (#682) | field | S |
| ~~BR322~~ | ~~News 2026-10-16zm~~ (#684) | field | S |
| ~~BR323~~ | ~~Kept outing/water edits; same-water temp; time-of-day tie~~ (#686) | field | S |
| ~~BR324~~ | ~~Send a copy through the share sheet~~ (#687) | field | S |
