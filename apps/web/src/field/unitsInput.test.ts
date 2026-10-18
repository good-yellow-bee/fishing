import { describe, expect, it } from "vitest";
import { fromBookAmount, fromBookTemp, gramsAsKilos, toBookAmount, toBookTemp, unitsMessage } from "./unitsInput";

describe("metric entry in the field log", () => {
  it("leaves imperial entry as typed", () => {
    expect(toBookAmount("28", "length", "imperial")).toBe("28");
    expect(toBookTemp("61", "imperial")).toBe("61");
  });

  it("reads a decimal comma or a leading point in imperial too", () => {
    expect(toBookAmount("2,5", "weight", "imperial")).toBe("2.5");
    expect(toBookAmount(".75", "weight", "imperial")).toBe("0.75");
    expect(toBookTemp(" 58,5 ", "imperial")).toBe("58.5");
  });

  it("turns centimetres, kilograms and °C into the book's units", () => {
    expect(toBookAmount("71,12", "length", "metric")).toBe("28");
    expect(toBookAmount("1", "weight", "metric")).toBe("2.205");
    expect(toBookTemp("16", "metric")).toBe("60.8");
  });

  it("reads pounds and ounces, fractions of an inch, and a unit written after the number", () => {
    expect(toBookAmount("3 lb 4 oz", "weight", "imperial")).toBe("3.25");
    expect(toBookAmount("3lb 4", "weight", "imperial")).toBe("3.25");
    expect(toBookAmount("12 oz", "weight", "imperial")).toBe("0.75");
    expect(toBookAmount("2 lbs", "weight", "imperial")).toBe("2");
    expect(toBookAmount("18 1/4", "length", "imperial")).toBe("18.25");
    expect(toBookAmount("3/4 in", "length", "imperial")).toBe("0.75");
    expect(toBookAmount("28 in", "length", "imperial")).toBe("28");
    expect(toBookAmount("71 cm", "length", "metric")).toBe("27.953");
    expect(toBookAmount("1,4 kg", "weight", "metric")).toBe("3.086");
    expect(toBookAmount("71 cm", "length", "imperial")).toBe("27.953");
    expect(toBookAmount("1.4 kg", "weight", "imperial")).toBe("3.086");
    // Grams and decagrams as a kitchen or a Polish scale reads them, millimetres as a ruler.
    expect(toBookAmount("1400 g", "weight", "metric")).toBe("3.086");
    expect(toBookAmount("140 dag", "weight", "metric")).toBe("3.086");
    expect(toBookAmount("850g", "weight", "imperial")).toBe("1.874");
    expect(toBookAmount("710 mm", "length", "metric")).toBe("27.953");
    expect(toBookAmount("850 g", "length", "metric")).toBe("850 g");
    expect(toBookAmount("3 lb", "weight", "metric")).toBe("3");
    expect(toBookAmount("28 in", "length", "metric")).toBe("28");
    expect(toBookAmount("2 lb 8 oz", "weight", "metric")).toBe("2.5");
    expect(toBookAmount("18 1/4 in", "length", "metric")).toBe("18.25");
    // A weight's unit on a length, ounces past a pound, or ounces after part of a pound are refused.
    expect(toBookAmount("3 lb", "length", "imperial")).toBe("3 lb");
    expect(toBookAmount("71 cm", "weight", "metric")).toBe("71 cm");
    expect(toBookAmount("3 lb 20 oz", "weight", "imperial")).toBe("3 lb 20 oz");
    expect(toBookAmount("3.5 lb 2", "weight", "imperial")).toBe("3.5 lb 2");
    // A fraction with nothing under it, or words, is still refused by the form.
    expect(toBookAmount("18 1/0", "length", "imperial")).toBe("18 1/0");
    expect(toBookAmount("4 oz 3 lb", "weight", "imperial")).toBe("4 oz 3 lb");
  });

  it("passes text that isn't a number through for the form to refuse", () => {
    expect(toBookAmount("big", "length", "metric")).toBe("big");
    expect(toBookTemp("", "metric")).toBe("");
  });

  it("shows stored numbers in metric for editing", () => {
    expect(fromBookAmount(28, "length", "metric")).toBe("71.1");
    expect(fromBookAmount(2.4, "weight", "metric")).toBe("1.09");
    expect(fromBookTemp(61, "metric")).toBe("16.1");
    expect(fromBookAmount(2.4, "weight", "imperial")).toBe("2.4");
  });
});

describe("range messages in metric", () => {
  it("names metric bounds for a metric reader and leaves other messages alone", () => {
    expect(unitsMessage("Length should sit between 1 and 120 inches.", "metric")).toBe("Length should sit between 3 and 304 centimetres.");
    expect(unitsMessage("Length should sit between 1 and 120 inches.", "imperial")).toBe("Length should sit between 1 and 120 inches.");
    expect(unitsMessage("Note the sky.", "metric")).toBe("Note the sky.");
  });
});

describe("gramsAsKilos", () => {
  it("offers kilograms for a number only grams can be", () => {
    expect(gramsAsKilos("850")).toBe("0.85");
    expect(gramsAsKilos("1250,5")).toBe("1.251");
    expect(gramsAsKilos("12,5")).toBeNull();
    expect(gramsAsKilos("36")).toBeNull();
    expect(gramsAsKilos("52")).toBeNull();
    expect(gramsAsKilos("200000")).toBeNull();
    expect(gramsAsKilos("850 g")).toBeNull();
  });
});
