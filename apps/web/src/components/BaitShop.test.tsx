// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LakeSeason } from "@stillwater/shared";
import { BaitShop } from "./BaitShop";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

function shop(shinerOn: boolean, bucket: number, onBuyShiner = vi.fn(), onHookFromBucket = vi.fn(), season?: LakeSeason) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<BaitShop points={500} lifetimePoints={0} handfuls={0} shinerOn={shinerOn} bucket={bucket} busy={false} onBuy={vi.fn()} onBuyShiner={onBuyShiner} onHookFromBucket={onHookFromBucket} trap="none" trapCold={false} onSetTrap={vi.fn()} onLiftTrap={vi.fn()} season={season} />));
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
      act(() => root!.render(<BaitShop points={500} lifetimePoints={0} handfuls={handfuls} shinerOn={false} bucket={0} busy={false} onBuy={vi.fn()} onBuyShiner={vi.fn()} onHookFromBucket={vi.fn()} trap={trap} trapCold={trapCold} onSetTrap={onSetTrap} onLiftTrap={onLiftTrap} season={undefined} />));
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
