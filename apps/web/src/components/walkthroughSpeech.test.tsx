// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { fightInput } from "../game/scene/fightMotion";
import { Walkthrough } from "./Walkthrough";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  fightInput.reeling = false;
  document.body.innerHTML = "";
});

describe("the first-cast coach on a screen reader", () => {
  it("says the fight's first line once while its words follow every run", async () => {
    const surface = createRef<HTMLDivElement>();
    const box = document.createElement("div");
    document.body.append(box);
    const root = createRoot(box);
    const render = (phase: "idle" | "fight") =>
      act(async () => {
        root.render(
          <>
            <div ref={surface} data-surge="2" />
            <Walkthrough userId="u-speech" caughtTotal={0} fishing phase={phase} nibble={false} outcome={null} surfaceRef={surface} />
          </>,
        );
      });
    await render("idle");
    const shown = () => box.querySelector(".walkthrough p")!;
    const said = () => box.querySelector(".walkthrough [role=status]")!;
    expect(shown().getAttribute("aria-hidden")).toBe("true");
    expect(said().textContent).toBe(shown().textContent);

    fightInput.reeling = true;
    await render("fight");
    expect(shown().textContent).toBe("It's running. Let go!");
    expect(said().textContent).toBe("Hold to reel it in. Ease off when the line runs hot.");
    await act(async () => root.unmount());
  });
});
