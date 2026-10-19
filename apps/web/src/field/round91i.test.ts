// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../i18n";
import { lureRecordCsv } from "./gear/lureCsv";
import type { PieceRecord } from "./gear/pieceRecord";

const records: PieceRecord[] = [
  { label: "Spoon", outings: 3, fish: 2, lure: "Spoon", lastAt: "2026-10-04T07:00:00", lastDay: "2026-10-04", since: 0 },
  { label: "Jig, chartreuse", outings: 4, fish: 0 },
];

describe("the lure record as a spreadsheet", () => {
  afterEach(() => setLang("en"));

  it("writes one row a lure, in the order given, quoting a name with the separator", () => {
    setLang("en");
    const lines = lureRecordCsv(records).replace("﻿", "").trim().split("\r\n");
    expect(lines[0]).toBe("Lure or bait,Fish,Outings,Fish an outing,Last fish,Largest");
    expect(lines[1]).toBe("Spoon,2,3,0.7,2026-10-04,");
    expect(lines[2]).toBe('"Jig, chartreuse",0,4,0,,');
  });

  it("splits on semicolons with decimal commas in Polish", () => {
    setLang("pl");
    const lines = lureRecordCsv(records).replace("﻿", "").trim().split("\r\n");
    expect(lines[0]).toBe("Przynęta;Ryby;Wyprawy;Ryb na wyprawę;Ostatnia ryba;Największa");
    expect(lines[1]).toBe("Wahadłówka;2;3;0,7;2026-10-04;");
  });
});
