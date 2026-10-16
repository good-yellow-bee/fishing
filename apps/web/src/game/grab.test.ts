import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../i18n";
import { GRAB_ODDS, grabberFor, grabCall, grabNote } from "./grab";

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

  it("only hits on a share of them", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, false, GRAB_ODDS - 0.01)?.id).toBe("pike");
    expect(grabberFor("golden-shiner", "reeds", strong, false, GRAB_ODDS)).toBeNull();
  });

  it("stays off other banks and other fish", () => {
    expect(grabberFor("golden-shiner", "dock", strong, false, 0)).toBeNull();
    expect(grabberFor("golden-shiner", "inlet", strong, false, 0)).toBeNull();
    expect(grabberFor("perch", "reeds", strong, false, 0)).toBeNull();
    expect(grabberFor("crappie", "dock", strong, false, 0)).toBeNull();
  });

  it("spares a new angler's first fish and one too weak for the grabber", () => {
    expect(grabberFor("golden-shiner", "reeds", strong, true, 0)).toBeNull();
    expect(grabberFor("golden-shiner", "reeds", { strength: 1, accuracy: 1 }, false, 0)).toBeNull();
    expect(grabberFor("perch", "open", { strength: 2, accuracy: 1 }, false, 0)).toBeNull();
    expect(grabberFor("bluegill", "point", { strength: 2, accuracy: 1 }, false, 0)?.id).toBe("largemouth-bass");
  });
});

describe("grab calls and notes", () => {
  it("names the fish that was taken", () => {
    expect(grabCall("perch", "Reel")).toBe("A walleye grabbed your perch! Reel. Ease off when it runs.");
    expect(grabNote("bluegill")).toBe("Took it off your bluegill");
    expect(grabNote("golden-shiner")).toBe("Took it off your shiner");
  });

  it("says it in Polish too", () => {
    setLang("pl");
    expect(grabCall("bluegill", "Zwijaj")).toBe("Bass wielkogębowy chwycił twojego bassa niebieskoskrzelego! Zwijaj. Odpuść, gdy odjeżdża.");
    expect(grabNote("perch")).toBe("Wziął twojego okonia");
  });
});
