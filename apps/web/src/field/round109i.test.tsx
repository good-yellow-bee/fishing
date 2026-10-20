// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TackleList, tipProps } from "./gear/TackleList";
import { TackleProvider } from "./gear/TackleState";

describe("round 109 ideas: a water's tips", () => {
  it("say how many fish each lure took there", () => {
    const html = renderToStaticMarkup(
      <TackleProvider>
        <TackleList tripId="t" {...tipProps([{ lure: "Jig", count: 4 }, { lure: "Spinner", count: 2 }])} />
      </TackleProvider>,
    );
    expect(html).toContain("+ Jig (4 fish)");
    expect(html).toContain("+ Spinner (2 fish)");
  });
});
