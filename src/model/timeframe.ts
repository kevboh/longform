import type { TimeframeFormat } from "./types";

export type TimeframeUnit =
  | "epoch"
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "number";

/**
 * Units ordered from largest to smallest. Used to compare two timeframes and
 * to derive a format's primary and secondary units.
 */
const MAGNITUDE_ORDER: TimeframeUnit[] = [
  "epoch",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
];

/**
 * The units each format uses, in the order they appear in a value.
 */
const FORMAT_UNITS: Record<TimeframeFormat, TimeframeUnit[]> = {
  "epoch-datetime-dmy": [
    "epoch",
    "day",
    "month",
    "year",
    "hour",
    "minute",
    "second",
  ],
  "epoch-datetime-mdy": [
    "epoch",
    "month",
    "day",
    "year",
    "hour",
    "minute",
    "second",
  ],
  datetime: ["day", "month", "year", "hour", "minute", "second"],
  time: ["hour", "minute", "second"],
  number: ["number"],
};

/**
 * The fewest units a partial value may keep. A date format still needs a full
 * date, and a time format still needs hours and minutes.
 */
const MIN_UNITS: Record<TimeframeFormat, number> = {
  "epoch-datetime-dmy": 4,
  "epoch-datetime-mdy": 4,
  datetime: 3,
  time: 2,
  number: 1,
};

const UNIT_RANGES: Partial<Record<TimeframeUnit, [number, number]>> = {
  month: [1, 12],
  day: [1, 31],
  hour: [0, 23],
  minute: [0, 59],
  second: [0, 59],
};

export type ParsedTimeframe = {
  format: TimeframeFormat;
  units: TimeframeUnit[];
  values: Partial<Record<TimeframeUnit, number>>;
};

export type TimeframeParseError =
  | { kind: "empty" }
  | { kind: "format" }
  | { kind: "range"; unit: TimeframeUnit; value: number };

export type TimeframeParseResult =
  | { ok: true; parsed: ParsedTimeframe }
  | { ok: false; error: TimeframeParseError };

export function isTimeframeParseError(
  result: TimeframeParseResult
): result is { ok: false; error: TimeframeParseError } {
  return result.ok === false;
}

function patternFor(format: TimeframeFormat, count: number): RegExp {
  const units = FORMAT_UNITS[format].slice(0, count);
  const parts: string[] = [];
  let index = 0;

  if (units[index] === "epoch") {
    parts.push("(?<epoch>\\d+)");
    index++;
  }

  if (units[index] === "day" || units[index] === "month") {
    if (format === "epoch-datetime-mdy") {
      parts.push(
        "(?<month>\\d{1,2})/(?<day>\\d{1,2})/(?<year>\\d{4})"
      );
    } else {
      parts.push(
        "(?<day>\\d{1,2})/(?<month>\\d{1,2})/(?<year>\\d{4})"
      );
    }
    index += 3;
  }

  if (units[index] === "hour") {
    let time = "(?<hour>\\d{1,2})";
    if (units[index + 1] === "minute") {
      time += ":(?<minute>\\d{1,2})";
      if (units[index + 2] === "second") {
        time += ":(?<second>\\d{1,2})";
      }
    }
    parts.push(time);
  }

  if (units[index] === "number") {
    parts.push("(?<number>\\d+)");
  }

  return new RegExp(`^${parts.join("\\s+")}$`);
}

/**
 * Parses a timeframe value against a format.
 *
 * A value may leave off units from the right (the smallest units first), so
 * long as it keeps the format's minimum. For example, a `datetime` value may
 * be `04/03/2026 09:30:00`, `04/03/2026 09:30`, or `04/03/2026`. It may not
 * skip the date or start from the time.
 */
export function parseTimeframe(
  raw: unknown,
  format: TimeframeFormat
): TimeframeParseResult {
  const text =
    typeof raw === "number"
      ? String(raw)
      : typeof raw === "string"
      ? raw.trim()
      : "";

  if (text.length === 0) {
    return { ok: false, error: { kind: "empty" } };
  }

  const allUnits = FORMAT_UNITS[format];

  for (let count = allUnits.length; count >= MIN_UNITS[format]; count--) {
    const match = patternFor(format, count).exec(text);
    if (!match) {
      continue;
    }

    const units = allUnits.slice(0, count);
    const values: Partial<Record<TimeframeUnit, number>> = {};

    for (const unit of units) {
      const digits = match.groups?.[unit];
      if (digits === undefined) {
        continue;
      }
      const value = parseInt(digits, 10);
      const range = UNIT_RANGES[unit];
      if (range && (value < range[0] || value > range[1])) {
        return { ok: false, error: { kind: "range", unit, value } };
      }
      values[unit] = value;
    }

    return { ok: true, parsed: { format, units, values } };
  }

  return { ok: false, error: { kind: "format" } };
}

/**
 * The two largest units of a format, used as its primary and secondary units.
 * For a chronological-order format both are `number`.
 */
export function primaryAndSecondaryUnits(
  format: TimeframeFormat
): [TimeframeUnit, TimeframeUnit] {
  const present = new Set(FORMAT_UNITS[format]);
  const ordered = MAGNITUDE_ORDER.filter((unit) => present.has(unit));

  if (ordered.length === 0) {
    return ["number", "number"];
  }
  if (ordered.length === 1) {
    return [ordered[0], ordered[0]];
  }
  return [ordered[0], ordered[1]];
}

/**
 * Orders two parsed timeframes chronologically, largest unit first.
 */
export function compareTimeframes(
  a: ParsedTimeframe,
  b: ParsedTimeframe
): number {
  if (a.format === "number" || b.format === "number") {
    return (a.values.number ?? 0) - (b.values.number ?? 0);
  }

  for (const unit of MAGNITUDE_ORDER) {
    const av = a.values[unit];
    const bv = b.values[unit];
    if (av === undefined && bv === undefined) {
      continue;
    }
    if (av === undefined) {
      return -1;
    }
    if (bv === undefined) {
      return 1;
    }
    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
}
