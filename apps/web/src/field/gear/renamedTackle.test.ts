import { describe, expect, it } from "vitest";
import { renamedTackle } from "./renamedTackle";

const item = (id: string, tripId: string, label: string) => ({ id, tripId, label, packed: false });

describe("renamedTackle", () => {
  it("renames the piece on every list, dropping it where the new name is already packed", () => {
    const items = [item("a", "t1", "Spinerbait"), item("b", "t2", "Spinerbaits"), item("c", "t2", "Spinnerbait"), item("d", "t1", "Jig")];
    expect(renamedTackle(items, "Spinerbait", "Spinnerbait")).toEqual([item("a", "t1", "Spinnerbait"), item("c", "t2", "Spinnerbait"), item("d", "t1", "Jig")]);
  });

  it("leaves lists without the piece alone", () => {
    expect(renamedTackle([item("a", "t1", "Jig")], "Spinerbait", "Spinnerbait")).toBeNull();
  });
});
