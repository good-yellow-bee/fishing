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
    const pike = book.catches.find((row) => row.id === bests.heaviest!.id)!;
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
