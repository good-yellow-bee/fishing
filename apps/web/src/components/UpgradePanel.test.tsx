// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { skillUnlock, type Profile } from "@stillwater/shared";
import { UpgradePanel } from "./UpgradePanel";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
});

const profile: Profile = { userId: "u1", displayName: "Ash", points: 40, lifetimePoints: 40, strength: 1, accuracy: 1, patience: 1 };

function described(button: HTMLButtonElement) {
  return (button.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent);
}

describe("UpgradePanel", () => {
  it("ties each skill's note and unlock to its buy button for screen readers", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<UpgradePanel profile={profile} busy={false} onBuy={() => undefined} />));
    const [strength, accuracy, patience] = [...container.querySelectorAll("button")];
    const unlock = skillUnlock(profile, "strength");
    expect(unlock).toMatch(/^Strength 2: /);
    expect(described(strength!)).toEqual(["Land heavier species.", unlock]);
    // Accuracy opens nothing on its own at Strength 1, so it has no unlock line to point at.
    expect(described(accuracy!)).toEqual(["Wider cast band and longer strike window."]);
    expect(described(patience!)).toEqual(["Shorter waits, heavier fish."]);
  });

  it("keeps a button in reach while a purchase runs or points run short, and says the new rank", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const bought: string[] = [];
    const rich = { ...profile, points: 1000 };
    act(() => root!.render(<UpgradePanel profile={rich} busy={false} onBuy={(skill) => bought.push(skill)} />));
    const strength = container.querySelector("button")!;
    strength.focus();
    act(() => strength.click());
    expect(bought).toEqual(["strength"]);
    // While the purchase runs the button stays focusable and in place, only marked unavailable.
    act(() => root!.render(<UpgradePanel profile={rich} busy onBuy={(skill) => bought.push(skill)} />));
    expect(strength.disabled).toBe(false);
    expect(strength.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(strength);
    act(() => strength.click());
    expect(bought).toEqual(["strength"]);
    const status = container.querySelector("[role=status]")!;
    expect(status.textContent).toBe("");
    act(() => root!.render(<UpgradePanel profile={{ ...rich, strength: rich.strength + 1, points: 0 }} busy={false} onBuy={(skill) => bought.push(skill)} />));
    expect(status.textContent).toBe(`Strength is now ${rich.strength + 1}.`);
    expect(strength.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(strength);
  });
});
