// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AERATOR_PRICE, BREAD_CRUMB_PRICE, WORM_BIN_PRICE, WORM_PRICE, type LakeSeason } from "@stillwater/shared";
import { BaitShop } from "./BaitShop";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

function shop(shinerOn: boolean, bucket: number, onBuyShiner = vi.fn(), onHookFromBucket = vi.fn(), season?: LakeSeason, aerator = false, onBuyAerator = vi.fn(), points = 500) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<BaitShop points={points} lifetimePoints={0} handfuls={0} shinerOn={shinerOn} bucket={bucket} busy={false} onBuy={vi.fn()} onBuyShiner={onBuyShiner} onHookFromBucket={onHookFromBucket} aerator={aerator} onBuyAerator={onBuyAerator} worms={0} onBuyWorm={vi.fn()} wormBin={false} onBuyWormBin={vi.fn()} breadCrumb={false} onBuyBreadCrumb={vi.fn()} trap="none" trapCold={false} onSetTrap={vi.fn()} onLiftTrap={vi.fn()} season={season} />));
  const button = (start: string) => [...container!.querySelectorAll("button")].find((one) => one.textContent?.startsWith(start));
  return { button, note: () => container!.querySelector("#shiner-shop-note")?.textContent };
}

describe("BaitShop's bait bucket", () => {
  it("sells a shiner into the bucket while one is on the hook, till the bucket is full", () => {
    const buy = vi.fn();
    const open = shop(true, 1, buy);
    expect(open.note()).toBe("A shiner is on your hook, so another goes in your bait bucket, which holds 1 of 3. It keeps three days there.");
    act(() => open.button("A live shiner")!.click());
    expect(buy).toHaveBeenCalledOnce();
    act(() => root!.unmount());
    container!.remove();
    const full = shop(true, 3, buy);
    expect(full.note()).toBe("Your hook and your bait bucket are full.");
    expect(full.button("A live shiner")!.getAttribute("aria-disabled")).toBe("true");
  });

  it.each([
    ["winter", "In the cold winter water it keeps five days there."],
    ["summer", "In the summer heat it keeps two days there."],
  ] as const)("says how long a spare keeps in the bucket in %s before it is stocked", (season, said) => {
    expect(shop(true, 0, vi.fn(), vi.fn(), season).note()).toBe(`A shiner is on your hook, so another goes in your bait bucket, which holds 0 of 3. ${said}`);
  });

  it("sells the aerator once, and then says the bucket keeps its spares a day longer", () => {
    const buy = vi.fn();
    const open = shop(true, 1, vi.fn(), vi.fn(), "summer", false, buy);
    act(() => open.button("A bucket aerator")!.click());
    expect(buy).toHaveBeenCalledOnce();
    expect(open.button("A bucket aerator")!.textContent).toBe(`A bucket aerator (${AERATOR_PRICE} pts)`);
    act(() => root!.unmount());
    container!.remove();
    const short = vi.fn();
    const poor = shop(true, 1, vi.fn(), vi.fn(), undefined, false, short, AERATOR_PRICE - 1);
    act(() => poor.button("A bucket aerator")!.click());
    expect(short).not.toHaveBeenCalled();
    act(() => root!.unmount());
    container!.remove();
    const again = vi.fn();
    const fitted = shop(true, 1, vi.fn(), vi.fn(), "summer", true, again);
    // It stays in place, so a keyboard user's focus isn't dropped when the purchase goes through.
    const done = fitted.button("Bucket aerator fitted")!;
    expect(done.getAttribute("aria-disabled")).toBe("true");
    act(() => done.click());
    expect(again).not.toHaveBeenCalled();
    expect(container!.querySelector("#aerator-note")!.textContent).toBe("The aerator on your bait bucket keeps each spare shiner a day longer.");
  });

  it("hooks a spare from the bucket when the hook is empty", () => {
    const hook = vi.fn();
    const open = shop(false, 2, vi.fn(), hook);
    act(() => open.button("Hook one from your bucket")!.click());
    expect(hook).toHaveBeenCalledOnce();
    expect(open.button("Hook one from your bucket")!.textContent).toBe("Hook one from your bucket (2 left)");
  });

  it("offers to bait the trap with a handful, says when it soaks, and lifts it when ready", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const render = (trap: "none" | "soaking" | "ready", handfuls: number, onSetTrap = vi.fn(), onLiftTrap = vi.fn(), trapCold = false) => {
      container?.remove();
      container = document.createElement("div");
      document.body.append(container);
      act(() => root?.unmount());
      root = createRoot(container);
      act(() => root!.render(<BaitShop points={500} lifetimePoints={0} handfuls={handfuls} shinerOn={false} bucket={0} busy={false} onBuy={vi.fn()} onBuyShiner={vi.fn()} onHookFromBucket={vi.fn()} aerator={false} onBuyAerator={vi.fn()} worms={0} onBuyWorm={vi.fn()} wormBin={false} onBuyWormBin={vi.fn()} breadCrumb={false} onBuyBreadCrumb={vi.fn()} trap={trap} trapCold={trapCold} onSetTrap={onSetTrap} onLiftTrap={onLiftTrap} season={undefined} />));
      return (start: string) => [...container!.querySelectorAll("button")].find((one) => one.textContent?.startsWith(start));
    };
    const set = vi.fn();
    const bait = render("none", 1, set)("Bait the shiner trap")!;
    act(() => bait.click());
    expect(set).toHaveBeenCalledOnce();
    expect(render("none", 0)("Bait the shiner trap")!.getAttribute("aria-disabled")).toBe("true");
    expect(render("soaking", 1)("Lift the shiner trap")).toBeUndefined();
    const lift = vi.fn();
    const lifting = render("ready", 1, vi.fn(), lift)("Lift the shiner trap")!;
    act(() => lifting.click());
    expect(lift).toHaveBeenCalledOnce();
    const note = () => container!.querySelector("#trap-note")!.textContent;
    render("none", 1, vi.fn(), vi.fn(), true);
    expect(note()).toMatch(/draws one in for your bucket, ready after twelve hours\.$/);
    render("soaking", 1, vi.fn(), vi.fn(), true);
    expect(note()).toBe("The shiner trap is soaking in cold water: lift it after twelve hours.");
    render("ready", 1, vi.fn(), vi.fn(), true);
    expect(note()).toBe("A shiner has found the trap.");
  });
});

describe("BaitShop's worms", () => {
  it("sells a worm into the tin, till the tin is full", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const render = (worms: number, onBuyWorm = vi.fn(), season?: LakeSeason) => {
      container?.remove();
      container = document.createElement("div");
      document.body.append(container);
      act(() => root?.unmount());
      root = createRoot(container);
      act(() => root!.render(<BaitShop points={500} lifetimePoints={0} handfuls={0} shinerOn={false} bucket={0} busy={false} onBuy={vi.fn()} onBuyShiner={vi.fn()} onHookFromBucket={vi.fn()} aerator={false} onBuyAerator={vi.fn()} worms={worms} onBuyWorm={onBuyWorm} wormBin={false} onBuyWormBin={vi.fn()} breadCrumb={false} onBuyBreadCrumb={vi.fn()} trap="none" trapCold={false} onSetTrap={vi.fn()} onLiftTrap={vi.fn()} season={season} />));
      return [...container!.querySelectorAll("button")].find((one) => one.textContent?.startsWith("A worm"))!;
    };
    const note = () => container!.querySelector("#worm-shop-note")!.textContent;
    const buy = vi.fn();
    const button = render(2, buy);
    expect(button.textContent).toBe(`A worm (${WORM_PRICE} pts)`);
    expect(note()).toBe("A fresh worm for a washed-out hook or a night line. In your tin: 2 of 5. 2 chopped into a handful of groundbait bring the perch in with the feeders.");
    act(() => button.click());
    expect(buy).toHaveBeenCalledOnce();
    const full = vi.fn();
    const tinFull = render(5, full);
    expect(tinFull.getAttribute("aria-disabled")).toBe("true");
    act(() => tinFull.click());
    expect(full).not.toHaveBeenCalled();
    expect(note()).toBe("Your worm tin is full: 5 worms. 2 chopped into a handful of groundbait bring the perch in with the feeders.");
    render(2, vi.fn(), "summer");
    expect(note()).toBe("A fresh worm for a washed-out hook or a night line. In your tin: 2 of 5. In the summer heat it keeps only today. 2 chopped into a handful of groundbait bring the perch in with the feeders.");
  });

  it("sells the tin's place in the worm bin once, and then the summer note says a worm keeps to tomorrow", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const render = (wormBin: boolean, onBuyWormBin = vi.fn(), points = 500) => {
      container?.remove();
      container = document.createElement("div");
      document.body.append(container);
      act(() => root?.unmount());
      root = createRoot(container);
      act(() => root!.render(<BaitShop points={points} lifetimePoints={0} handfuls={0} shinerOn={false} bucket={0} busy={false} onBuy={vi.fn()} onBuyShiner={vi.fn()} onHookFromBucket={vi.fn()} aerator={false} onBuyAerator={vi.fn()} worms={2} onBuyWorm={vi.fn()} wormBin={wormBin} onBuyWormBin={onBuyWormBin} breadCrumb={false} onBuyBreadCrumb={vi.fn()} trap="none" trapCold={false} onSetTrap={vi.fn()} onLiftTrap={vi.fn()} season="summer" />));
      return container!.querySelector<HTMLButtonElement>("[aria-describedby=worm-bin-note]")!;
    };
    const note = (id: string) => container!.querySelector(`#${id}`)!.textContent;
    const buy = vi.fn();
    const button = render(false, buy);
    expect(button.textContent).toBe(`A place in the worm bin (${WORM_BIN_PRICE} pts)`);
    act(() => button.click());
    expect(buy).toHaveBeenCalledOnce();
    const short = vi.fn();
    const poor = render(false, short, WORM_BIN_PRICE - 1);
    act(() => poor.click());
    expect(short).not.toHaveBeenCalled();
    const again = vi.fn();
    // It stays in place, so a keyboard user's focus isn't dropped when the purchase goes through.
    const owned = render(true, again);
    expect(owned.textContent).toBe("Your place in the worm bin");
    expect(owned.getAttribute("aria-disabled")).toBe("true");
    act(() => owned.click());
    expect(again).not.toHaveBeenCalled();
    expect(note("worm-bin-note")).toBe("Your worm tin keeps in the cool worm bin, so in summer its worms last to the next day.");
    expect(note("worm-shop-note")).toBe("A fresh worm for a washed-out hook or a night line. In your tin: 2 of 5. In the summer heat your place in the worm bin keeps it to tomorrow. 2 chopped into a handful of groundbait bring the perch in with the feeders.");
  });

  it("sells a sack of bread crumb once, and says how long a swim left baited holds the feeders", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const render = (breadCrumb: boolean, onBuyBreadCrumb = vi.fn(), points = 500) => {
      container?.remove();
      container = document.createElement("div");
      document.body.append(container);
      act(() => root?.unmount());
      root = createRoot(container);
      act(() => root!.render(<BaitShop points={points} lifetimePoints={0} handfuls={0} shinerOn={false} bucket={0} busy={false} onBuy={vi.fn()} onBuyShiner={vi.fn()} onHookFromBucket={vi.fn()} aerator={false} onBuyAerator={vi.fn()} worms={0} onBuyWorm={vi.fn()} wormBin={false} onBuyWormBin={vi.fn()} breadCrumb={breadCrumb} onBuyBreadCrumb={onBuyBreadCrumb} trap="none" trapCold={false} onSetTrap={vi.fn()} onLiftTrap={vi.fn()} season={undefined} />));
      return container!.querySelector<HTMLButtonElement>("[aria-describedby=bread-crumb-note]")!;
    };
    const note = () => container!.querySelector("#bread-crumb-note")!.textContent;
    const buy = vi.fn();
    const button = render(false, buy);
    expect(button.textContent).toBe(`A sack of bread crumb (${BREAD_CRUMB_PRICE} pts)`);
    expect(note()).toBe("Mix bread crumb into your groundbait, so a swim you leave baited holds the feeders gathered there for 8 casts when you come back, not 5. Bought once.");
    act(() => button.click());
    expect(buy).toHaveBeenCalledOnce();
    const short = vi.fn();
    const poor = render(false, short, BREAD_CRUMB_PRICE - 1);
    act(() => poor.click());
    expect(short).not.toHaveBeenCalled();
    const again = vi.fn();
    const owned = render(true, again);
    expect(owned.textContent).toBe("Your sack of bread crumb");
    expect(owned.getAttribute("aria-disabled")).toBe("true");
    act(() => owned.click());
    expect(again).not.toHaveBeenCalled();
    expect(note()).toBe("Bread crumb goes in your groundbait, so a swim you leave baited holds the feeders gathered there for 8 casts when you come back.");
  });
});
