import { describe, expect, it } from "vitest";
import { spotAt } from "@stillwater/shared";
import { amongSurfaceBugs, bugLike } from "./surfaceBugs";
import { STRIDER_MAX_WIND, STRIDER_PATCH } from "./scene/striderSkate";
import { WHIRLIGIG_RAFT } from "./scene/whirligigSpin";

const calm = { x: 0, z: 0 };

describe("amongSurfaceBugs", () => {
  it("lands among the striders on calm water by daylight outside winter", () => {
    expect(amongSurfaceBugs("fall", "dawn", "clear", calm, STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe(true);
    expect(amongSurfaceBugs("fall", "day", "clear", calm, STRIDER_PATCH.x, STRIDER_PATCH.z + STRIDER_PATCH.r + 0.5)).toBe(false);
    expect(amongSurfaceBugs("fall", "night", "clear", calm, STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe(false);
    expect(amongSurfaceBugs("winter", "day", "clear", calm, STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe(false);
    expect(amongSurfaceBugs("fall", "day", "rain", calm, STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe(false);
    expect(amongSurfaceBugs("fall", "day", "clear", { x: STRIDER_MAX_WIND * 2, z: 0 }, STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe(false);
  });

  it("lands among the whirligigs on spring and summer days", () => {
    expect(amongSurfaceBugs("summer", "day", "overcast", calm, WHIRLIGIG_RAFT.x, WHIRLIGIG_RAFT.z)).toBe(true);
    expect(amongSurfaceBugs("fall", "day", "overcast", calm, WHIRLIGIG_RAFT.x, WHIRLIGIG_RAFT.z)).toBe(false);
    expect(amongSurfaceBugs("summer", "dusk", "overcast", calm, WHIRLIGIG_RAFT.x, WHIRLIGIG_RAFT.z)).toBe(false);
  });

  it("finds no bugs without a season, and both lie in the dock's water", () => {
    expect(amongSurfaceBugs(undefined, "day", "clear", calm, STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe(false);
    expect(spotAt(STRIDER_PATCH.x, STRIDER_PATCH.z)).toBe("dock");
    expect(spotAt(WHIRLIGIG_RAFT.x, WHIRLIGIG_RAFT.z)).toBe("dock");
  });
});

describe("bugLike", () => {
  it("takes a popper or a dry fly, not a sinking lure or bait", () => {
    expect(bugLike("Popper")).toBe(true);
    expect(bugLike("Elk hair caddis")).toBe(true);
    expect(bugLike("Nightcrawlers")).toBe(false);
    expect(bugLike("#5 Mepps")).toBe(false);
    expect(bugLike(undefined)).toBe(false);
  });
});
