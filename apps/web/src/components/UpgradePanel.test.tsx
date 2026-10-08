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
});
