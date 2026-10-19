import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../i18n";
import { FISH } from "@stillwater/shared";
import { FOLLOW_ODDS, followCall, followerFor, GRAB_ODDS, grabberFor, grabCall, grabNote } from "./grab";

const strong = { strength: 10, accuracy: 10 };

afterEach(() => setLang("en"));

describe("grabberFor", () => {
  it("lets a pike hit a golden shiner hooked at the reeds", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, false, 0)?.id).toBe("pike");
  });

  it("lets a largemouth take a bluegill off the point and a walleye a perch in open water", () => {
    expect(grabberFor("bluegill", "point", strong, false, 0)?.id).toBe("largemouth-bass");
    expect(grabberFor("perch", "open", strong, false, 0)?.id).toBe("walleye");
  });

  it("lets a smallmouth hit a crappie under the dock and a pike a perch off the drop-off", () => {
    expect(grabberFor("crappie", "dock", strong, false, 0)?.id).toBe("smallmouth-bass");
    expect(grabberFor("perch", "dropoff", strong, false, 0)?.id).toBe("pike");
    expect(followerFor("crappie", "dock", strong, false, 0)?.id).toBe("smallmouth-bass");
  });

  it("only hits on a share of them", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, false, GRAB_ODDS - 0.01)?.id).toBe("pike");
    expect(grabberFor("golden-shiner", "reeds", strong, false, GRAB_ODDS)).toBeNull();
  });

  it("stays off other banks and other fish", () => {
    expect(grabberFor("golden-shiner", "dock", strong, false, 0)).toBeNull();
    expect(grabberFor("golden-shiner", "inlet", strong, false, 0)).toBeNull();
    expect(grabberFor("perch", "reeds", strong, false, 0)).toBeNull();
    expect(grabberFor("perch", "dock", strong, false, 0)).toBeNull();
  });

  it("spares a new angler's first fish and one too weak for the grabber", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, true, 0)).toBeNull();
    expect(grabberFor("golden-shiner", "reeds", { strength: 1, accuracy: 1 }, false, 0)).toBeNull();
    expect(grabberFor("perch", "open", { strength: 2, accuracy: 1 }, false, 0)).toBeNull();
    expect(grabberFor("bluegill", "point", { strength: 2, accuracy: 1 }, false, 0)?.id).toBe("largemouth-bass");
  });
});

describe("followerFor", () => {
  it("follows a share of the small fish in, at the same banks as the grabs", () => {
    expect(followerFor("golden-shiner", "reeds", strong, false, FOLLOW_ODDS - 0.01)?.id).toBe("pike");
    expect(followerFor("perch", "open", strong, false, 0)?.id).toBe("walleye");
    expect(followerFor("golden-shiner", "reeds", strong, false, FOLLOW_ODDS)).toBeNull();
    expect(followerFor("golden-shiner", "dock", strong, false, 0)).toBeNull();
  });

  it("spares a new angler and one too weak for the hunter", () => {
    expect(followerFor("golden-shiner", "reeds", strong, true, 0)).toBeNull();
    expect(followerFor("golden-shiner", "reeds", { strength: 1, accuracy: 1 }, false, 0)).toBeNull();
  });

  it("says who followed it, in Polish too", () => {
    const fish = (id: string) => FISH.find((f) => f.id === id)!;
    expect(followCall(fish("pike"))).toBe("A pike followed it in to the bank!");
    expect(followCall(fish("walleye"))).toBe("A walleye followed it up to the boat!");
    expect(followCall(fish("smallmouth-bass"))).toBe("A smallmouth bass followed it in to the dock!");
    setLang("pl");
    expect(followCall(fish("largemouth-bass"))).toBe("Bass wielkogębowy odprowadził ją aż do brzegu!");
  });
});

describe("grab calls and notes", () => {
  it("names the fish that was taken", () => {
    expect(grabCall("perch", "walleye", "Reel")).toBe("A walleye grabbed your perch! Reel. Ease off when it runs.");
    expect(grabCall("perch", "pike", "Reel")).toBe("A pike grabbed your perch! Reel. Ease off when it runs.");
    expect(grabCall("crappie", "smallmouth-bass", "Reel")).toBe("A smallmouth bass grabbed your crappie! Reel. Ease off when it runs.");
    expect(grabNote("crappie")).toBe("Took it off your crappie");
    expect(grabNote("bluegill")).toBe("Took it off your bluegill");
    expect(grabNote("golden-shiner")).toBe("Took it off your shiner");
  });

  it("says it in Polish too", () => {
    setLang("pl");
    expect(grabCall("crappie", "smallmouth-bass", "Zwijaj")).toBe("Bass małogębowy chwycił twoją wielkooczkę! Zwijaj. Odpuść, gdy odjeżdża.");
    expect(grabCall("bluegill", "largemouth-bass", "Zwijaj")).toBe("Bass wielkogębowy chwycił twojego bassa niebieskoskrzelego! Zwijaj. Odpuść, gdy odjeżdża.");
    expect(grabNote("perch")).toBe("Wziął twojego okonia");
  });
});
