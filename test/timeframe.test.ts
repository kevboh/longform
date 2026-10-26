import { describe, expect, it } from "vitest";

import {
  compareTimeframes,
  parseTimeframe,
  primaryAndSecondaryUnits,
} from "src/model/timeframe";

describe("parseTimeframe", () => {
  it("parses a full day-first date and time", () => {
    const result = parseTimeframe("04/03/2026 09:30:15", "datetime");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.values)).toEqual([
        "day",
        "month",
        "year",
        "hour",
        "minute",
        "second",
      ]);
      expect(result.values).toEqual({
        day: 4,
        month: 3,
        year: 2026,
        hour: 9,
        minute: 30,
        second: 15,
      });
    }
  });

  it("accepts partial values, dropping units from the right", () => {
    const minutes = parseTimeframe("04/03/2026 09:30", "datetime");
    expect(minutes.ok).toBe(true);
    if (minutes.ok) {
      expect(Object.keys(minutes.values)).toEqual([
        "day",
        "month",
        "year",
        "hour",
        "minute",
      ]);
    }

    const dateOnly = parseTimeframe("04/03/2026", "datetime");
    expect(dateOnly.ok).toBe(true);
    if (dateOnly.ok) {
      expect(Object.keys(dateOnly.values)).toEqual(["day", "month", "year"]);
    }
  });

  it("rejects a value that drops the date and keeps the time", () => {
    expect(parseTimeframe("09:30", "datetime").ok).toBe(false);
  });

  it("parses a month-first date", () => {
    expect(parseTimeframe("03/04/2026", "epoch-datetime-mdy").ok).toBe(false);

    const withEpoch = parseTimeframe("2 03/04/2026", "epoch-datetime-mdy");
    expect(withEpoch.ok).toBe(true);
    if (withEpoch.ok) {
      expect(withEpoch.values).toEqual({
        epoch: 2,
        month: 3,
        day: 4,
        year: 2026,
      });
    }
  });

  it("parses an epoch-prefixed date", () => {
    const result = parseTimeframe("2 04/03/2026", "epoch-datetime-dmy");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values).toEqual({
        epoch: 2,
        day: 4,
        month: 3,
        year: 2026,
      });
    }
  });

  it("parses a time-only value", () => {
    const full = parseTimeframe("09:30:15", "time");
    expect(full.ok).toBe(true);
    if (full.ok) {
      expect(Object.keys(full.values)).toEqual(["hour", "minute", "second"]);
    }

    expect(parseTimeframe("09:30", "time").ok).toBe(true);
  });

  it("parses chronological numbers, from strings and numbers", () => {
    const fromString = parseTimeframe("3", "number");
    expect(fromString.ok).toBe(true);
    if (fromString.ok) {
      expect(fromString.values).toEqual({ number: 3 });
    }

    const fromNumber = parseTimeframe(3, "number");
    expect(fromNumber.ok).toBe(true);
    if (fromNumber.ok) {
      expect(fromNumber.values).toEqual({ number: 3 });
    }
  });

  it("rejects out-of-range units", () => {
    expect(parseTimeframe("04/13/2026", "datetime").ok).toBe(false);
    expect(parseTimeframe("04/03/2026 25:00", "datetime").ok).toBe(false);
  });

  it("rejects empty values", () => {
    expect(parseTimeframe("", "datetime").ok).toBe(false);
    expect(parseTimeframe(undefined, "datetime").ok).toBe(false);
  });
});

describe("primaryAndSecondaryUnits", () => {
  it("picks the two largest units of a format", () => {
    expect(primaryAndSecondaryUnits("epoch-datetime-dmy")).toEqual([
      "epoch",
      "year",
    ]);
    expect(primaryAndSecondaryUnits("datetime")).toEqual(["year", "month"]);
    expect(primaryAndSecondaryUnits("time")).toEqual(["hour", "minute"]);
    expect(primaryAndSecondaryUnits("number")).toEqual(["number", "number"]);
  });
});

describe("compareTimeframes", () => {
  it("orders by largest unit first", () => {
    const a = parseTimeframe("04/03/2026 09:30", "datetime");
    const b = parseTimeframe("20/12/2023 16:00", "datetime");
    if (a.ok && b.ok) {
      expect(compareTimeframes(b.values, a.values)).toBeLessThan(0);
      expect(compareTimeframes(a.values, b.values)).toBeGreaterThan(0);
    }
  });

  it("orders chronological numbers", () => {
    const one = parseTimeframe("1", "number");
    const two = parseTimeframe("2", "number");
    if (one.ok && two.ok) {
      expect(compareTimeframes(one.values, two.values)).toBeLessThan(0);
    }
  });
});
