import { describe, expect, it } from "vitest";
import { fromBookAmount, fromBookTemp, toBookAmount, toBookTemp, unitsMessage } from "./unitsInput";

describe("metric entry in the field log", () => {
  it("leaves imperial entry as typed", () => {
    expect(toBookAmount("28", "length", "imperial")).toBe("28");
    expect(toBookTemp("61", "imperial")).toBe("61");
  });

  it("turns centimetres, kilograms and °C into the book's units", () => {
    expect(toBookAmount("71,12", "length", "metric")).toBe("28");
    expect(toBookAmount("1", "weight", "metric")).toBe("2.205");
    expect(toBookTemp("16", "metric")).toBe("60.8");
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
    expect(unitsMessage("Length should sit between 1 and 120 inches.", "metric")).toBe("Length should sit between 2.5 and 305 centimetres.");
    expect(unitsMessage("Length should sit between 1 and 120 inches.", "imperial")).toBe("Length should sit between 1 and 120 inches.");
    expect(unitsMessage("Note the sky.", "metric")).toBe("Note the sky.");
  });
});
