# Timeline

The Timeline is a note that lays your scenes out along a time axis, so you can
see the order of your story at a glance. Each scene is placed at the point
described by a `timeframe` value in its frontmatter.

## Output

The timeline is written beside the compiled manuscript, with `_timeline` added
before the extension. A project that compiles to `Build/The Clearing.md`
produces `Build/The Clearing_timeline.md`.

## Mermaid Diagram

The file begins with a Mermaid `timeline` diagram.

- The **primary** unit is the coarsest unit that changes between scenes. Its
  value labels each `section`.
- The **cadence** is the coarsest unit that changes on at least half of the
  steps between consecutive scenes.
- The **secondary** unit is one level coarser than the cadence. Its values
  group the events inside a section.

For example, if the year changes and the story advances hour by hour, the
primary is the year and the secondary is the day. Each section is a year, each
period is a month and day, and each event shows the time on its first line
(`09:30`, or `09:30:15` when seconds exist) and the scene file name on its
second line.

Mermaid centers event text; it does not expose per-line alignment.

Months are written by name (`Mar`, `Dec`) in the diagram. The data block always
uses numbers.

## The Timeframe Tag

The timeframe value lives in a frontmatter property that defaults to
`timeframe`:

```yaml
---
timeframe: 04/03/2026 09:30
---
```

You can rename the property per project in Project Metadata.

## Time Format

Each project picks a time format that describes how its timeframe values are
written. Choose the format whose biggest unit matches your story's span.
Smaller units may be left off (see [Partial Values](#partial-values)).

| Format | Example | Use When |
| --- | --- | --- |
| Epoch date time (dd/mm) | `2 04/03/2026 09:30:00` | The story spans ages, with a day-first date. |
| Epoch date time (mm/dd) | `2 03/04/2026 09:30:00` | The story spans ages, with a month-first date. |
| Date time | `04/03/2026 09:30:00` | The story spans years or days. |
| Time only | `09:30:00` | The story stays within a single day. |
| Chronological order | `1`, `2`, `3` | Scenes are just ordered, with no real time. |

## Partial Values

You do not have to fill in every unit. You can drop units from right to left,
from the smallest up, as long as you stay consistent.

For a `Date time` project:

- `04/03/2026 09:30` — seconds omitted.
- `04/03/2026 09` — seconds and minutes omitted.
- `04/03/2026` — the whole time omitted.

You cannot drop units from left to right, so you cannot drop the epoch or the
date and keep the time.

## Primary and Secondary Units

The timeline treats the two largest units of your chosen format as the primary
and secondary units. For a `Date time` project the primary unit is the year and
the secondary is the month. For an `Epoch date time` project the primary is the
epoch and the secondary is the year.
