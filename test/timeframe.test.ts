import { describe, expect, it } from "vitest";

import {
  compareTimeframes,
  deriveUnits,
  isTimeframeParseError,
  parseTimeframe,
} from "../src/model/timeframe";
import type { TimeframeFormat } from "../src/model/types";

function values(input: unknown, format: TimeframeFormat) {
  const result = parseTimeframe(input, format);
  if (isTimeframeParseError(result)) {
    throw new Error(
      `expected ${JSON.stringify(input)} to parse as ${format}, got ${result.error.kind}`
    );
  }
  return result.values;
}

function fails(input: unknown, format: TimeframeFormat) {
  return parseTimeframe(input, format).ok === false;
}

describe("datetime", () => {
  it("parses every accepted prefix", () => {
    expect(Object.keys(values("04/03/2026 09:30:15", "datetime"))).toEqual([
      "day",
      "month",
      "year",
      "hour",
      "minute",
      "second",
    ]);
    expect(Object.keys(values("04/03/2026 09:30", "datetime"))).toEqual([
      "day",
      "month",
      "year",
      "hour",
      "minute",
    ]);
    expect(Object.keys(values("04/03/2026 09", "datetime"))).toEqual([
      "day",
      "month",
      "year",
      "hour",
    ]);
    expect(Object.keys(values("04/03/2026", "datetime"))).toEqual([
      "day",
      "month",
      "year",
    ]);
  });

  it("rejects every truncated or malformed shape", () => {
    for (const bad of [
      "09:30",
      "09",
      "04/03",
      "2026",
      "4/3/26 09:30",
      "04/03/20226 09:30",
      "04/03/2026 09:30:15:00",
      "04/03/2026T09:30",
      "04-03-2026 09:30",
      "prefix 04/03/2026",
      "04/03/2026 suffix",
    ]) {
      expect(fails(bad, "datetime"), bad).toBe(true);
    }
  });

  it("accepts whitespace separators and trims ends", () => {
    expect(values(" 04/03/2026 09:30 ", "datetime").day).toBe(4);
    expect(values("04/03/2026   09:30", "datetime").hour).toBe(9);
    expect(values("04/03/2026\t09:30", "datetime").minute).toBe(30);
  });

  it("accepts one or two digit units and rejects three", () => {
    expect(values("4/3/2026 9:3", "datetime").month).toBe(3);
    expect(fails("004/03/2026", "datetime")).toBe(true);
    expect(fails("04/003/2026", "datetime")).toBe(true);
  });

  it("range-checks each unit at its boundaries", () => {
    expect(fails("00/03/2026", "datetime")).toBe(true);
    expect(fails("32/03/2026", "datetime")).toBe(true);
    expect(fails("04/00/2026", "datetime")).toBe(true);
    expect(fails("04/13/2026", "datetime")).toBe(true);
    expect(fails("04/03/2026 24:00", "datetime")).toBe(true);
    expect(fails("04/03/2026 09:60", "datetime")).toBe(true);
    expect(fails("04/03/2026 09:30:60", "datetime")).toBe(true);

    expect(values("01/01/2026 00:00:00", "datetime")).toBeTruthy();
    expect(values("31/12/2026 23:59:59", "datetime")).toBeTruthy();
  });

  it("does not validate calendar dates", () => {
    expect(values("31/02/2026", "datetime").day).toBe(31);
    expect(values("30/02/2026", "datetime").day).toBe(30);
  });
});

describe("epoch dates", () => {
  it("parses day-first prefixes", () => {
    expect(
      Object.keys(values("1 04/03/2026 09:30:15", "epoch-datetime-dmy"))
    ).toEqual(["epoch", "day", "month", "year", "hour", "minute", "second"]);
    expect(Object.keys(values("1 04/03/2026", "epoch-datetime-dmy"))).toEqual([
      "epoch",
      "day",
      "month",
      "year",
    ]);
  });

  it("parses month-first prefixes", () => {
    const parsed = values("2 03/04/2026 09:30", "epoch-datetime-mdy");
    expect(parsed).toEqual({
      epoch: 2,
      month: 3,
      day: 4,
      year: 2026,
      hour: 9,
      minute: 30,
    });
  });

  it("rejects a missing epoch, a missing date, and a bad epoch", () => {
    expect(fails("04/03/2026 09:30", "epoch-datetime-dmy")).toBe(true);
    expect(fails("2 09:30", "epoch-datetime-dmy")).toBe(true);
    expect(fails("2 04/03/2026 09:30", "datetime")).toBe(true);
    expect(fails("-1 04/03/2026", "epoch-datetime-dmy")).toBe(true);
    expect(fails("1.5 04/03/2026", "epoch-datetime-dmy")).toBe(true);
  });

  it("does not range-check the epoch or year", () => {
    expect(values("0 01/01/2000 00:00:00", "epoch-datetime-dmy").epoch).toBe(0);
    expect(values("999999 31/12/9999", "epoch-datetime-dmy").year).toBe(9999);
  });
});

describe("time only", () => {
  it("parses full and minute prefixes", () => {
    expect(Object.keys(values("09:30:15", "time"))).toEqual([
      "hour",
      "minute",
      "second",
    ]);
    expect(Object.keys(values("09:30", "time"))).toEqual(["hour", "minute"]);
  });

  it("rejects an hour alone, a fourth part, and a date", () => {
    expect(fails("09", "time")).toBe(true);
    expect(fails("09:30:15:00", "time")).toBe(true);
    expect(fails("04/03/2026 09:30", "time")).toBe(true);
  });

  it("range-checks time units", () => {
    expect(fails("24:00", "time")).toBe(true);
    expect(fails("09:60", "time")).toBe(true);
    expect(fails("09:30:60", "time")).toBe(true);
    expect(values("00:00:00", "time")).toEqual({
      hour: 0,
      minute: 0,
      second: 0,
    });
  });
});

describe("chronological number", () => {
  it("accepts integers from strings and numbers", () => {
    expect(values(0, "number")).toEqual({ number: 0 });
    expect(values(7, "number")).toEqual({ number: 7 });
    expect(values("007", "number")).toEqual({ number: 7 });
    expect(values("1000000", "number")).toEqual({ number: 1000000 });
    expect(values("  7  ", "number")).toEqual({ number: 7 });
  });

  it("rejects decimals, negatives, words, and mixed text", () => {
    expect(fails("1.5", "number")).toBe(true);
    expect(fails(-1, "number")).toBe(true);
    expect(fails("abc", "number")).toBe(true);
    expect(fails("1 2", "number")).toBe(true);
    expect(fails(true, "number")).toBe(true);
  });
});

describe("empty and non-string values", () => {
  it("reports empty for blank and unsupported types", () => {
    for (const empty of ["", "   ", undefined, null, false, {}, []]) {
      const result = parseTimeframe(empty, "datetime");
      expect(result.ok).toBe(false);
      if (isTimeframeParseError(result)) {
        expect(result.error.kind).toBe("empty");
      }
    }
  });

  it("treats numeric zero as a value, not as missing", () => {
    const result = parseTimeframe(0, "datetime");
    expect(result.ok).toBe(false);
    if (isTimeframeParseError(result)) {
      expect(result.error.kind).toBe("format");
    }
  });
});

describe("deriveUnits", () => {
  it("uses the coarsest changing unit as primary and one level above the cadence as secondary", () => {
    // Year changes; the story advances hour by hour.
    const hourly = [
      values("04/03/2026 09:30:00", "datetime"),
      values("04/03/2026 10:30:00", "datetime"),
      values("04/03/2026 11:30:00", "datetime"),
      values("04/03/2025 09:30:00", "datetime"),
    ];
    expect(deriveUnits(hourly, "datetime")).toEqual(["year", "day"]);
  });

  it("uses the month when the story advances day by day", () => {
    const daily = [
      values("31/12/2025 09:30", "datetime"),
      values("01/01/2026 09:30", "datetime"),
      values("02/01/2026 09:30", "datetime"),
      values("03/01/2026 09:30", "datetime"),
      values("04/01/2026 09:30", "datetime"),
    ];
    expect(deriveUnits(daily, "datetime")).toEqual(["year", "month"]);
  });

  it("uses the hour when the story advances minute by minute", () => {
    const minutely = [
      values("31/12/2025 09:30", "datetime"),
      values("01/01/2026 09:31", "datetime"),
      values("01/01/2026 09:32", "datetime"),
      values("01/01/2026 09:33", "datetime"),
      values("01/01/2026 09:34", "datetime"),
    ];
    expect(deriveUnits(minutely, "datetime")).toEqual(["year", "hour"]);
  });

  it("falls back to the primary when there is nothing finer to group", () => {
    const hourlyOnly = [
      values("04/03/2026 09:30", "datetime"),
      values("04/03/2026 10:30", "datetime"),
    ];
    expect(deriveUnits(hourlyOnly, "datetime")).toEqual(["hour", "hour"]);
  });

  it("uses the epoch as primary when it changes", () => {
    const epochs = [
      values("1 04/03/2026 09:30", "epoch-datetime-dmy"),
      values("2 04/03/2026 10:30", "epoch-datetime-dmy"),
    ];
    expect(deriveUnits(epochs, "epoch-datetime-dmy")).toEqual([
      "epoch",
      "epoch",
    ]);
  });

  it("always uses number for chronological order", () => {
    expect(deriveUnits([values(1, "number"), values(2, "number")], "number")).toEqual([
      "number",
      "number",
    ]);
  });
});

describe("compareTimeframes", () => {
  it("orders by magnitude, largest first", () => {
    const early = values("20/12/2023 16:00", "datetime");
    const late = values("04/03/2026 09:30", "datetime");
    expect(compareTimeframes(early, late)).toBeLessThan(0);
    expect(compareTimeframes(late, early)).toBeGreaterThan(0);
    expect(compareTimeframes(early, early)).toBe(0);
  });

  it("orders time-only and numbers", () => {
    expect(
      compareTimeframes(values("09:30", "time"), values("16:00", "time"))
    ).toBeLessThan(0);
    expect(
      compareTimeframes(values(2, "number"), values(10, "number"))
    ).toBeLessThan(0);
  });

  it("orders epoch before calendar date", () => {
    const epochTwo = values("2 01/01/2000", "epoch-datetime-dmy");
    const epochOne = values("1 31/12/2026", "epoch-datetime-dmy");
    expect(compareTimeframes(epochOne, epochTwo)).toBeLessThan(0);
  });

  it("places partial values before fuller values of the same prefix", () => {
    const dateOnly = values("04/03/2026", "datetime");
    const withTime = values("04/03/2026 09:30", "datetime");
    expect(compareTimeframes(dateOnly, withTime)).toBeLessThan(0);
  });
});
