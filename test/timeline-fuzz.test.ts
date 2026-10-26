import { describe, expect, it } from "vitest";

import { compareTimeframes } from "../src/model/timeframe";
import type { TimeframeFormat } from "../src/model/types";
import {
  makeProject,
  mermaidBlock,
  runProject,
  type SceneSpec,
} from "./helpers/project";

const FORMATS: TimeframeFormat[] = [
  "datetime",
  "epoch-datetime-dmy",
  "epoch-datetime-mdy",
  "time",
  "number",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function timeString(count: number, rnd: () => number): string {
  const parts = [pad(Math.floor(rnd() * 24))];
  if (count >= 2) {
    parts.push(pad(Math.floor(rnd() * 60)));
  }
  if (count >= 3) {
    parts.push(pad(Math.floor(rnd() * 60)));
  }
  return parts.join(":");
}

function dateString(monthFirst: boolean, rnd: () => number): string {
  const day = pad(1 + Math.floor(rnd() * 31));
  const month = pad(1 + Math.floor(rnd() * 12));
  const year = 1970 + Math.floor(rnd() * 61);
  return monthFirst ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

function validValue(format: TimeframeFormat, rnd: () => number): string | number {
  switch (format) {
    case "datetime": {
      const timeCount = Math.floor(rnd() * 4);
      const date = dateString(false, rnd);
      return timeCount === 0 ? date : `${date} ${timeString(timeCount, rnd)}`;
    }
    case "epoch-datetime-dmy": {
      const timeCount = Math.floor(rnd() * 4);
      const date = dateString(false, rnd);
      const time = timeCount === 0 ? "" : ` ${timeString(timeCount, rnd)}`;
      return `${Math.floor(rnd() * 10)} ${date}${time}`;
    }
    case "epoch-datetime-mdy": {
      const timeCount = Math.floor(rnd() * 4);
      const date = dateString(true, rnd);
      const time = timeCount === 0 ? "" : ` ${timeString(timeCount, rnd)}`;
      return `${Math.floor(rnd() * 10)} ${date}${time}`;
    }
    case "time":
      return timeString(2 + Math.floor(rnd() * 2), rnd);
    case "number":
      return Math.floor(rnd() * 10000);
  }
}

const GARBAGE = [
  "09:30",
  "04/03/2026",
  "04/13/2026 09:30",
  "garbage",
  "04/03/2026 25:00",
  "1.5",
  "-1",
  "",
  "   ",
  "04/03",
  "2026",
  "04/03/2026 09:30:15:00",
  "4/3/26 09:30",
  "04-03-2026 09:30",
];

function randomScene(index: number, format: TimeframeFormat, rnd: () => number): SceneSpec {
  const roll = rnd();
  const name = `S${index}`;
  if (roll < 0.15) {
    return { name };
  }
  if (roll < 0.35) {
    return { name, value: GARBAGE[Math.floor(rnd() * GARBAGE.length)] };
  }
  return { name, value: validValue(format, rnd) };
}

describe("timeline invariants (fuzz)", () => {
  it("never throws and keeps its structural invariants across random projects", async () => {
    const rnd = mulberry32(20261026);

    for (let run = 0; run < 120; run++) {
      const format = FORMATS[Math.floor(rnd() * FORMATS.length)];
      const count = Math.floor(rnd() * 18);
      const scenes = Array.from({ length: count }, (_, index) =>
        randomScene(index, format, rnd)
      );

      const result = await runProject({ format, scenes });
      const total =
        result.result.entries.length +
        result.result.errors.length +
        result.result.missing.length;

      expect(total, `run ${run}`).toBe(count);

      const unitCount = result.result.units.length;
      for (const entry of result.result.entries) {
        expect(Object.keys(entry.values).length, `run ${run}`).toBe(unitCount);
      }

      for (let i = 1; i < result.result.entries.length; i++) {
        expect(
          compareTimeframes(
            result.result.entries[i - 1].values,
            result.result.entries[i].values
          ),
          `run ${run} ordering`
        ).toBeLessThanOrEqual(0);
      }

      if (result.result.errors.length > 0) {
        expect(result.contents, `run ${run}`).toContain("## Problems");
        expect(result.contents, `run ${run}`).not.toContain("## Scenes");
      } else if (result.result.entries.length > 0) {
        const lines = mermaidBlock(result.contents);
        expect(lines[0], `run ${run}`).toBe("timeline");
        expect(lines[1], `run ${run}`).toMatch(/^ {4}title /);
        for (const line of lines.slice(2)) {
          if (line.trim() === "") {
            continue;
          }
          expect(line, `run ${run} mermaid line ${line}`).toMatch(
            /^ {4}section .+|^ {8}.+ : .+|^ +: .+$/
          );
        }
        expect(result.contents, `run ${run}`).toContain("## Scenes");
        expect(result.contents, `run ${run}`).toContain("## Data");
      } else {
        expect(result.output.size, `run ${run}`).toBe(0);
      }
    }
  });

  it("never writes a file when no scene has a timeframe", async () => {
    const rnd = mulberry32(7);
    for (let run = 0; run < 20; run++) {
      const scenes = Array.from({ length: Math.floor(rnd() * 10) }, (_, index) => ({
        name: `S${index}`,
      }));
      const project = makeProject({ scenes });
      const result = await runProject({ scenes });
      expect(result.output.size).toBe(0);
      expect(project.output.size).toBe(0);
    }
  });
});
