import { describe, expect, it } from "vitest";
import { HOOK_NOTE_MAX_MS, HOOK_NOTE_MIN_MS, hookNoteMs } from "./hookNote";

describe("hookNoteMs", () => {
  it("gives a short message the minimum time", () => {
    expect(hookNoteMs("Hooked in 0.6 s.")).toBe(HOOK_NOTE_MIN_MS);
  });

  it("grows with the message's length", () => {
    expect(hookNoteMs("x".repeat(150))).toBe(6000);
  });

  it("caps a long message", () => {
    expect(hookNoteMs("x".repeat(400))).toBe(HOOK_NOTE_MAX_MS);
  });
});
