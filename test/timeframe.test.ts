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
      expect(result.parsed.units).toEqual([
        "day",
        "month",
        "year",
        "hour",
        "minute",
        "second",
      ]);
      expect(result.parsed.values).toEqual({
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
      expect(minutes.parsed.units).toEqual([
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
      expect(dateOnly.parsed.units).toEqual(["day", "month", "year"]);
    }
  });

  it("rejects a value that drops the date and keeps the time", () => {
    const result = parseTimeframe("09:30", "datetime");
    expect(result.ok).toBe(false);
  });

  it("parses a month-first date", () => {
    const result = parseTimeframe("03/04/2026", "epoch-datetime-mdy");
    expect(result.ok).toBe(false);

    const withEpoch = parseTimeframe("2 03/04/2026", "epoch-datetime-mdy");
    expect(withEpoch.ok).toBe(true);
    if (withEpoch.ok) {
      expect(withEpoch.parsed.values).toEqual({
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
      expect(result.parsed.values).toEqual({
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
      expect(full.parsed.units).toEqual(["hour", "minute", "second"]);
    }

    const minutes = parseTimeframe("09:30", "time");
    expect(minutes.ok).toBe(true);
  });

  it("parses chronological numbers, from strings and numbers", () => {
    const fromString = parseTimeframe("3", "number");
    expect(fromString.ok).toBe(true);
    if (fromString.ok) {
      expect(fromString.parsed.values).toEqual({ number: 3 });
    }

    const fromNumber = parseTimeframe(3, "number");
    expect(fromNumber.ok).toBe(true);
    if (fromNumber.ok) {
      expect(fromNumber.parsed.values).toEqual({ number: 3 });
    }
  });

  it("rejects out-of-range units", () => {
    const badMonth = parseTimeframe("04/13/2026", "datetime");
    expect(badMonth.ok).toBe(false);

    const badHour = parseTimeframe("04/03/2026 25:00", "datetime");
    expect(badHour.ok).toBe(false);
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
      expect(compareTimeframes(b.parsed, a.parsed)).toBeLessThan(0);
      expect(compareTimeframes(a.parsed, b.parsed)).toBeGreaterThan(0);
    }
  });

  it("orders chronological numbers", () => {
    const one = parseTimeframe("1", "number");
    const two = parseTimeframe("2", "number");
    if (one.ok && two.ok) {
      expect(compareTimeframes(one.parsed, two.parsed)).toBeLessThan(0);
    }
  });
});
