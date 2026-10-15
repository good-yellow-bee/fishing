import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetKeepAsked, keepBookStorage } from "./keepStorage";

describe("keep the book's storage", () => {
  beforeEach(() => forgetKeepAsked());

  it("asks once per visit", async () => {
    const storage = { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) };
    expect(await keepBookStorage(storage)).toBe(true);
    expect(await keepBookStorage(storage)).toBe(false);
    expect(storage.persist).toHaveBeenCalledTimes(1);
  });

  it("doesn't ask again when the storage is already kept", async () => {
    const storage = { persisted: vi.fn(async () => true), persist: vi.fn(async () => true) };
    expect(await keepBookStorage(storage)).toBe(true);
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("shrugs off a browser without the API or one that refuses", async () => {
    expect(await keepBookStorage(undefined)).toBe(false);
    forgetKeepAsked();
    expect(await keepBookStorage({ persist: async () => Promise.reject(new Error("no")) })).toBe(false);
  });
});
