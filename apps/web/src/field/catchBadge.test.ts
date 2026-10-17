import { describe, expect, it } from "vitest";
import { personalBests, sampleLogbook } from "@stillwater/shared";
import { bookBadges, catchBadge } from "./catchBadge";

describe("catch badges", () => {
  const book = sampleLogbook(new Date(2026, 9, 1));
  const bests = personalBests(book);

  it("marks the book's heaviest fish", () => {
    expect(catchBadge(book, bests.heaviest!)).toBe("book");
  });

  it("marks the biggest of a kind only when it beat another of its kind", () => {
    // The angler's own fish: a sample one holds no badge over them.
    const pike = { ...book.catches.find((row) => row.id === bests.heaviest!.id)!, id: "own-pike" };
    const second = { ...pike, id: "second-pike", measure: { kind: "weight" as const, pounds: 1 } };
    const twoPike = { ...book, catches: [second, pike] };
    expect(catchBadge(twoPike, pike)).toBe("book");
    const lone = { ...book, catches: [{ ...pike, species: "Lone fish" }, { ...second, measure: { kind: "weight" as const, pounds: 99 } }] };
    expect(catchBadge(lone, lone.catches[0]!)).toBeNull();
    const pair = { ...book, catches: [{ ...second, id: "other", measure: { kind: "weight" as const, pounds: 99 }, species: "Other" }, pike, second] };
    expect(catchBadge(pair, pike)).toBe("species");
    expect(catchBadge(pair, second)).toBeNull();
  });

  it("leaves a smaller fish unmarked", () => {
    const small = book.catches.find((entry) => catchBadge(book, entry) === null);
    expect(small).toBeDefined();
  });
});

describe("book badges", () => {
  it("works the badges out once per book", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    expect(bookBadges(book)).toBe(bookBadges(book));
    expect([...bookBadges(book).values()].filter((badge) => badge === "book")).toHaveLength(2);
  });
});

describe("sample fish and badges", () => {
  it("lets the sample week's fish hold no badge once the angler has a fish of their own", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    const own = { ...book.catches[0]!, id: "own-small", measure: { kind: "length" as const, inches: 3 } };
    const mixed = { ...book, catches: [...book.catches, own] };
    expect([...bookBadges(mixed).keys()]).toEqual(["own-small"]);
  });
});

describe("game fish and badges", () => {
  it("gives a game fish no badge and lets it take none", () => {
    const book = sampleLogbook(new Date(2026, 9, 1));
    const bests = personalBests(book);
    const huge = { ...bests.heaviest!, id: "game-giant", spotId: "spot-stillwater", measure: { kind: "weight" as const, pounds: 999 } };
    const played = { ...book, catches: [huge, ...book.catches] };
    expect(catchBadge(played, huge)).toBeNull();
    expect(catchBadge(played, bests.heaviest!)).toBe("book");
  });
});
