# Timeline End-to-End Test Plan

## Purpose

Manual end-to-end tests for the Timeline feature in Longform Extended. Each row is one test with a concrete project state and a concrete expected result. The oracle is the generated timeline markdown file.

The plan was verified against:

- `/home/werner/repos/longformExtended/src/model/timeframe.ts`
- `/home/werner/repos/longformExtended/src/model/timeline.ts`
- `/home/werner/repos/longformExtended/src/model/timeframe-observer.ts`
- `/home/werner/repos/longformExtended/src/commands/timeline.ts`
- `/home/werner/repos/longformExtended/src/model/scene-navigation.ts`
- `/home/werner/repos/longformExtended/src/model/store-vault-sync.ts`
- `/home/werner/repos/longformExtended/src/compile/steps/write-to-note.ts`
- `/home/werner/repos/longformExtended/src/compile/index.ts`
- `/home/werner/repos/longformExtended/docs/TIMELINE.md`
- `/home/werner/repos/longformExtended/README.md`
- `/home/werner/repos/longformExtended/test/timeframe.test.ts`

## Baseline Project P

Use a disposable Obsidian vault. Unless a test says otherwise, the project is:

- Project folder: `Novels/My Book/`
- Index note: `Novels/My Book/My Book.md`
- Index `longform` block: `format: scenes`, `sceneFolder: Scenes`, `timeframeTagName: timeframe`, `timeFormat: datetime`, `workflow: standard`, and scenes in the listed order.
- Scene files: `Novels/My Book/Scenes/Scene A.md`, `Scene B.md`, and so on.
- Workflow `standard` has a Save as Note step with target `manuscript.md`.
- Default compiled path: `Novels/My Book/manuscript.md`
- Default timeline path: `Novels/My Book/manuscript_timeline.md`
- All date and time frontmatter values are quoted in YAML except in tests that explicitly exercise unquoted YAML numbers.
- Frontmatter defaults: missing `timeframeTagName` means `timeframe`, missing or invalid `timeFormat` means `datetime`.

## Common Expected Shapes

**Success shape.** The file begins with a fenced `mermaid` block containing a `flowchart TD` grouped by primary and secondary units, then contains, in order:

1. `# Timeline: My Book`
2. A blank line.
3. `- **Time format:** <label>`, then `- **Timeframe tag:**` followed by the tag in backticks, then `- **Primary unit:** <unit>` and `- **Secondary unit:** <unit>`.
4. A blank line.
5. `## Scenes`, a blank line, then `| Scene | Timeframe |`, `| --- | --- |`, and one data row per included scene in chronological order.
6. A blank line.
7. `## Not on the timeline` only when at least one scene has no value. It is followed by a blank line and one `- Scene title` line per missing scene in index order.
8. `## Data`, a blank line, a fenced `json` block with a pretty-printed two-space JSON object, and the closing fence.

The success file has no `## Problems` section. Values are rebuilt from parsed numbers, so they are not zero padded. Example: an input of `04/03/2026 09:30:00` appears as `4/3/2026 9:30:0`. A defined zero unit is kept. The file has no trailing newline.

**Problems shape.** The file exists and contains the header, then `## Problems`, a blank line, one bullet per problem in the stated order, a blank line, and `Fix these and the timeline will be rebuilt.` It contains no `## Scenes`, no `## Not on the timeline`, and no `## Data`. The file has no trailing newline.

**No-file result.** The path does not exist and no folder is created. If an older timeline file already exists at that path, it is left untouched and is not deleted.

## Execution Notes

- For deterministic checks, run the `Rebuild timeline` command from the command palette after setting up the state.
- For auto-rebuild tests, make the edit in Obsidian, wait for the metadata cache to settle and for the explorer to refresh, then inspect the file without running the command.
- Compare content line by line. A byte comparison is useful because unchanged content is intentionally not rewritten.
- The plugin must be enabled for `TimeframeObserver` to run. `Rebuild timeline` is only available when a multi-scene project is selected.

## A. Happy Path by Format

| ID | Setup | Expected |
| --- | --- | --- |
| T01 | P with `timeFormat: epoch-datetime-dmy`. A: `1 04/03/2026 09:30:15`. B: `2 20/12/2023 16:00:00`. C: `1 05/03/2026 08:00:00`. | File created at `Novels/My Book/manuscript_timeline.md`. Success shape with label `Epoch date time (num dd/mm/yyyy hh:mm:ss)`, tag `timeframe`, primary `epoch`, secondary `year`. Scenes rows in order A `1 4/3/2026 9:30:15`, C `1 5/3/2026 8:0:0`, B `2 20/12/2023 16:0:0`. No Not on the timeline section. Data `units` is `["epoch","day","month","year","hour","minute","second"]`, primary `epoch`, secondary `year`, scenes in the same order. |
| T02 | P with `timeFormat: epoch-datetime-mdy`. A: `1 04/03/2026 09:30:15`. B: `2 12/20/2023 16:00:00`. C: `1 03/05/2026 08:00:00`. | File at default path. Success shape with label `Epoch date time (num mm/dd/yyyy hh:mm:ss)`, tag `timeframe`, primary `epoch`, secondary `year`. Scenes rows in order C `1 3/5/2026 8:0:0`, A `1 4/3/2026 9:30:15`, B `2 12/20/2023 16:0:0`. Data `units` is `["epoch","month","day","year","hour","minute","second"]` and values preserve month-before-day order. |
| T03 | P with default `timeFormat: datetime`. A: `04/03/2026 09:30:15`. B: `20/12/2023 16:00:00`. C: `05/03/2026 08:00:00`. | File at default path. Success shape with label `Date time (dd/mm/yyyy hh:mm:ss)`, tag `timeframe`, primary `year`, secondary `month`. Scenes rows in order B `20/12/2023 16:0:0`, A `4/3/2026 9:30:15`, C `5/3/2026 8:0:0`. Data `units` is `["day","month","year","hour","minute","second"]`, scenes in the same order. |
| T04 | P with `timeFormat: time`. A: `09:30:15`. B: `16:00:00`. C: `08:00:00`. | File at default path. Success shape with label `Time only (hh:mm:ss)`, tag `timeframe`, primary `hour`, secondary `minute`. Scenes rows in order C `8:0:0`, A `9:30:15`, B `16:0:0`. Data `units` is `["hour","minute","second"]`. |
| T05 | P with `timeFormat: number`. A: unquoted `3`. B: unquoted `1`. C: unquoted `2`. | File at default path. Success shape with label `Chronological order (num)`, tag `timeframe`, primary `number`, secondary `number`. Scenes rows in order B `1`, C `2`, A `3`. Data `units` is `["number"]`, and every `values` object is `{"number":N}`. |

## B. Partial Values

| ID | Setup | Expected |
| --- | --- | --- |
| T06 | P `datetime`. A: `04/03/2026 09:30`. B: `05/03/2026 10:15`. C: `06/03/2026 11:00`. | Success file at default path. All three values use 5 units, so no Problems. Scenes rows in order A `4/3/2026 9:30`, B `5/3/2026 10:15`, C `6/3/2026 11:0`. Data `units` is `["day","month","year","hour","minute"]`, and no scene has a `second` key. |
| T07 | P `datetime`. A: `04/03/2026 09`. B: `05/03/2026 10`. C: `06/03/2026 11`. | Success file. All values use 4 units. Scenes rows in order A `4/3/2026 9`, B `5/3/2026 10`, C `6/3/2026 11`. Data `units` is `["day","month","year","hour"]`, primary `year`, secondary `month`. |
| T08 | P `datetime`. A: `04/03/2026`. B: `05/03/2026`. C: `06/03/2026`. | Success file. All values use 3 units. Scenes rows in order A `4/3/2026`, B `5/3/2026`, C `6/3/2026`. Data `units` is `["day","month","year"]`. No time keys appear anywhere in the Data block. |
| T09 | P `epoch-datetime-dmy`. A: `1 04/03/2026 09:30`. B: `2 20/12/2023 16:00`. C: `1 05/03/2026 08:00`. | Success file. All values use 6 units. Scenes rows in order A `1 4/3/2026 9:30`, C `1 5/3/2026 8:0`, B `2 20/12/2023 16:0`. Data `units` is `["epoch","day","month","year","hour","minute"]`. |
| T10 | P `epoch-datetime-dmy`. A: `1 04/03/2026 09`. B: `2 20/12/2023 16`. C: `1 05/03/2026 08`. | Success file. All values use 5 units. Scenes rows in order A `1 4/3/2026 9`, C `1 5/3/2026 8`, B `2 20/12/2023 16`. Data `units` is `["epoch","day","month","year","hour"]`. |
| T11 | P `epoch-datetime-dmy`. A: `1 04/03/2026`. B: `2 20/12/2023`. C: `1 05/03/2026`. | Success file. All values use 4 units. Scenes rows in order A `1 4/3/2026`, C `1 5/3/2026`, B `2 20/12/2023`. Data `units` is `["epoch","day","month","year"]`, primary `epoch`, secondary `year`. |
| T12 | P `epoch-datetime-mdy`. A: `1 03/04/2026 09:30`. B: `2 12/20/2023 16:00`. C: `1 04/05/2026 08:00`. | Success file. All values use 6 units. Scenes rows in order A `1 3/4/2026 9:30`, C `1 4/5/2026 8:0`, B `2 12/20/2023 16:0`. Data `units` is `["epoch","month","day","year","hour","minute"]`. |
| T13 | P `epoch-datetime-mdy`. A: `1 03/04/2026 09`. B: `2 12/20/2023 16`. C: `1 04/05/2026 08`. | Success file. All values use 5 units. Scenes rows in order A `1 3/4/2026 9`, C `1 4/5/2026 8`, B `2 12/20/2023 16`. Data `units` is `["epoch","month","day","year","hour"]`. |
| T14 | P `epoch-datetime-mdy`. A: `1 03/04/2026`. B: `2 12/20/2023`. C: `1 04/05/2026`. | Success file. All values use 4 units. Scenes rows in order A `1 3/4/2026`, C `1 4/5/2026`, B `2 12/20/2023`. Data `units` is `["epoch","month","day","year"]`. |
| T15 | P `time`. A: `09:30`. B: `16:00`. C: `08:00`. | Success file. All values use 2 units. Scenes rows in order C `8:0`, A `9:30`, B `16:0`. Data `units` is `["hour","minute"]`. The zero minute is present as `0`, not dropped. |

## C. Wrong Format

Each test in this section uses five scenes A through E. A through D have valid values for the configured format. E has the stated bad value. Because any validation error suppresses the success sections, the file contains Problems only.

| ID | Setup | Expected |
| --- | --- | --- |
| T16 | P `datetime`. A-D valid full date-times. E: `09:30` (time only, date dropped). | File created at default path. Problems shape with exactly one bullet: `- **Scene E** does not match the configured format (Date time (dd/mm/yyyy hh:mm:ss)).` No Scenes, Not on the timeline, or Data sections. |
| T17 | P `epoch-datetime-dmy`. A-D valid full epoch date-times such as `1 04/03/2026 09:30:00`. E: `04/03/2026 09:30` (epoch missing). | Problems file with one bullet for E using label `Epoch date time (num dd/mm/yyyy hh:mm:ss)`. No success sections. |
| T18 | P `epoch-datetime-mdy`. A-D valid. E: `2 09:30` (date missing, time kept). | Problems file with one bullet for E using label `Epoch date time (num mm/dd/yyyy hh:mm:ss)`. No success sections. |
| T19 | P `time`. A-D valid times such as `09:30:00`. E: `09` (minute and second dropped). | Problems file with one bullet for E using label `Time only (hh:mm:ss)`. No success sections. |
| T20 | P `number`. A-D valid integers. E: quoted `"1.5"`. | Problems file with one bullet for E using label `Chronological order (num)`. The decimal is a format error, not a range error. |
| T21 | P `datetime`. A-D valid. E: `4/3/26 09:30` (two-digit year). | Problems file with one bullet for E using label `Date time (dd/mm/yyyy hh:mm:ss)`. The four-digit year requirement rejects the value. |
| T22 | P `datetime`. A-D valid. E: `2026` (year only, no day or month). | Problems file with one bullet for E using label `Date time (dd/mm/yyyy hh:mm:ss)`. |
| T23 | P `epoch-datetime-dmy`. A-D valid. E: `2 09:30` (date dropped, time kept). | Problems file with one bullet for E using label `Epoch date time (num dd/mm/yyyy hh:mm:ss)`. This confirms values may only drop units from the right. |
| T24 | P `time`. A-D valid. E: `09:30:15:00` (four time parts). | Problems file with one bullet for E using label `Time only (hh:mm:ss)`. The extra unit is a format error. |
| T25 | P `number`. A-D valid. E: unquoted `-1`. | Problems file with one bullet for E using label `Chronological order (num)`. The minus sign fails the integer pattern, so this is a format error and not a range error. |

## D. Out-of-Range Values and Boundaries

Each range test uses five scenes A through E. A through D are valid. E is the only bad file. The Problems bullet must name the unit and the offending value.

| ID | Setup | Expected |
| --- | --- | --- |
| T26 | P `datetime`. E: `04/13/2026 09:30`. | Problems file with exactly `- **Scene E** has an out-of-range month value (13).` No success sections. |
| T27 | P `datetime`. E: `32/03/2026 09:30`. | Problems file with exactly `- **Scene E** has an out-of-range day value (32).` No success sections. |
| T28 | P `datetime`. E: `04/03/2026 24:00`. | Problems file with exactly `- **Scene E** has an out-of-range hour value (24).` No success sections. |
| T29 | P `datetime`. E: `04/03/2026 09:60`. | Problems file with exactly `- **Scene E** has an out-of-range minute value (60).` No success sections. |
| T30 | P `datetime`. E: `04/03/2026 09:30:60`. | Problems file with exactly `- **Scene E** has an out-of-range second value (60).` No success sections. |
| T31 | P `epoch-datetime-dmy`. E: `2 04/13/2026`. | Problems file with exactly `- **Scene E** has an out-of-range month value (13).` The header uses the epoch day-first label. |
| T32 | P `epoch-datetime-mdy`. E: `2 04/32/2026` (month 4, day 32). | Problems file with exactly `- **Scene E** has an out-of-range day value (32).` The header uses the epoch month-first label. |
| T33 | P `time`. E: `24:00`. | Problems file with exactly `- **Scene E** has an out-of-range hour value (24).` |
| T34 | P `time`. E: `09:60`. | Problems file with exactly `- **Scene E** has an out-of-range minute value (60).` |
| T35 | P `time`. E: `09:30:60`. | Problems file with exactly `- **Scene E** has an out-of-range second value (60).` |
| T36 | P `datetime`. A: `01/12/2026 23:59:59`. B: `31/01/2026 00:00:00`. C: `12/12/2026 23:59:59`. D: `01/01/2026 00:00:00`. | Success file. The boundary values are accepted. Scenes rows in order D `1/1/2026 0:0:0`, B `31/1/2026 0:0:0`, A `1/12/2026 23:59:59`, C `12/12/2026 23:59:59`. No Problems. |
| T37 | P `datetime`. A: `00/03/2026 09:30`. B: `04/00/2026 09:30`. C-E valid. | Problems file with two bullets in scene order: A `has an out-of-range day value (0).` and B `has an out-of-range month value (0).` No success sections. |
| T38 | P `datetime`. A: `31/02/2026 09:30`. B: `30/02/2026 09:30`. | Success file. There is no calendar validation, so both are accepted. Scenes rows in order B `30/2/2026 9:30`, A `31/2/2026 9:30`. No Problems. |
| T39 | P `epoch-datetime-dmy`. A: `0 01/01/2000 00:00:00`. B: `999999 31/12/9999 23:59:59`. | Success file. Epoch and year have no range check. Scenes rows in order A `0 1/1/2000 0:0:0`, B `999999 31/12/9999 23:59:59`. No Problems. |
| T40 | P `datetime`. E: `32/13/2026 24:60:60`. | Problems file with one bullet for E: `has an out-of-range day value (32).` Parsing stops at the first failing unit in the value's unit order, so only the day problem is reported. |

## E. Inconsistent Granularity

The most common unit count becomes the reference. Values with a different count are reported as inconsistent and dropped. When counts tie, the first count encountered in scene order becomes the reference because the sort is stable.

| ID | Setup | Expected |
| --- | --- | --- |
| T41 | P `datetime`. A-D: full values with 6 units such as `04/03/2026 09:30:00`. E: `06/03/2026` with 3 units. | Problems file with exactly one bullet: `- **Scene E** uses 3 time units, but the rest of the project uses 6.` No success sections. File created. |
| T42 | P `datetime`. A-D: date-only values with 3 units. E: full value with 6 units. | Problems file with exactly one bullet: `- **Scene E** uses 6 time units, but the rest of the project uses 3.` No success sections. |
| T43 | P `datetime`. Two scenes only. A: `04/03/2026 09:30:15` with 6 units. B: `05/03/2026` with 3 units. | Problems file. The first scene's count wins the tie, so the reference is 6 and the only bullet is `- **Scene B** uses 3 time units, but the rest of the project uses 6.` No success sections. |
| T44 | P `datetime`. A and B full with 6 units. C and D date-only with 3 units. | Problems file. Counts tie at 2 each, and the first encountered count is 6. Bullets in order: `- **Scene C** uses 3 time units, but the rest of the project uses 6.` and `- **Scene D** uses 3 time units, but the rest of the project uses 6.` No success sections. |
| T45 | P `datetime`. A and B date-only with 3 units. C and D full with 6 units. | Problems file. The first encountered count is 3, so the reference is 3. Bullets in order: `- **Scene C** uses 6 time units, but the rest of the project uses 3.` and `- **Scene D** uses 6 time units, but the rest of the project uses 3.` No success sections. |
| T46 | P `epoch-datetime-dmy`. A-C: full values with 7 units. D: `4 05/03/2026` with 4 units. | Problems file with exactly `- **Scene D** uses 4 time units, but the rest of the project uses 7.` The header uses the epoch day-first label. |
| T47 | P `time`. A-C: `09:30` with 2 units. D: `09:30:15` with 3 units. | Problems file with exactly `- **Scene D** uses 3 time units, but the rest of the project uses 2.` The header uses `Time only (hh:mm:ss)`. |
| T48 | P `datetime`. A: full value with 6 units. B: date-only value with 3 units. C: `09:30` (format error). | Problems file with two bullets in this order: C does not match the configured format, then B uses 3 time units while the rest of the project uses 6. Parse errors are collected during the scan before inconsistent entries are appended. No success sections. |

## F. Missing Values and Empty Timelines

A missing value is not an error. Missing scenes are listed under Not on the timeline. If no scene has a value and there are no errors, no file is created or rewritten.

| ID | Setup | Expected |
| --- | --- | --- |
| T49 | P `datetime`. A and B: `04/03/2026 09:30` and `05/03/2026 09:30`. C, D, E: no `timeframe` key. | Success file at default path. Scenes rows A `4/3/2026 9:30`, B `5/3/2026 9:30`. `## Not on the timeline` lists C, D, E in index order. Data includes only A and B. No Problems. |
| T50 | P `datetime`. A: valid. B: `timeframe: ""`. C: `timeframe: "   "`. | Success file. B and C count as missing, not as errors. Scenes row A only. Not on the timeline lists B, C. No Problems. Data includes A only. |
| T51 | P `datetime`. A: valid. B: `timeframe: null`. C: `timeframe:` with no value. | Success file. B and C count as missing. Not on the timeline lists B, C. No Problems. |
| T52 | P `datetime`. A-E have no `timeframe` key at all. | No file at `Novels/My Book/manuscript_timeline.md`. No folder is created. No Problems file is produced. |
| T53 | P `datetime`. A pre-existing `Novels/My Book/manuscript_timeline.md` contains an older timeline. Remove every scene's `timeframe` key and trigger a rebuild. | No write and no deletion. The existing file is byte-identical to its old contents. It is not replaced by an empty file or a Not on the timeline file. |
| T54 | P `datetime`. A, B, E: valid. C: no tag. D: `09:30` (wrong format). | Problems file with one bullet for D only. The missing C is not reported in Problems. No Scenes, Not on the timeline, or Data sections. File created. |
| T55 | P `datetime`. Index lists A, B, C. A: valid and present. B: no file at `Scenes/Scene B.md` although listed in the index. C: file exists with no tag. | Success file. Scenes row A only. Not on the timeline lists C only. B is silently skipped because its file is absent, so it is neither a row nor a missing entry. Data includes A only. |
| T56 | P `number`. A: unquoted `0`. B: no tag. | Success file. Scenes row A `0`. Not on the timeline lists B. Data includes A with `{"number":0}`. Zero is a valid value, not a missing value. |
| T57 | P `datetime`. A: valid. B: `timeframe: []`. | Success file. B counts as missing because the stringified empty array is empty. Not on the timeline lists B. No Problems. |
| T58 | P `datetime`. A: `timeframe: 0` as an unquoted YAML number. | Problems file with one bullet for A: `- **Scene A** does not match the configured format (Date time (dd/mm/yyyy hh:mm:ss)).` Zero stringifies to `0`, which is non-empty, so it is a format error and not a missing value. No success sections. |
| T59 | P `datetime`. A: `timeframe: false`. B: `timeframe: {}`. C: valid. | Problems file with two bullets in scene order: A and B each `has an empty timeframe value.` The parser receives a non-string and non-number value and reports the empty error. C is valid but not displayed because Problems suppresses success content. |

## G. Mixed Valid and Invalid

| ID | Setup | Expected |
| --- | --- | --- |
| T60 | P `datetime`. A and B: valid. C: `32/03/2026 09:30` (out-of-range day). D: `09:30` (wrong format). E: no tag. | Problems file with two bullets in scene order: C has an out-of-range day value (32), then D does not match the configured format. E is not reported. No Scenes, Not on the timeline, or Data sections. |
| T61 | P `datetime`. A and B: valid. C: date-only 3-unit value. D: `04/13/2026 09:30` (out-of-range month). E: `09:30` (wrong format). | Problems file with three bullets in this order: D has an out-of-range month value (13), E does not match the configured format, then C uses 3 time units while the rest of the project uses 6. Parse errors are collected first, then the inconsistent entry is appended. No success sections. |

## H. Chronological Ordering

| ID | Setup | Expected |
| --- | --- | --- |
| T62 | P `datetime`. Index order: A `10/06/2026 12:00`, B `15/09/1999 08:00`, C `11/06/2026 09:00`. | Success file. The flashback sorts first. Scenes rows in order B `15/9/1999 8:0`, A `10/6/2026 12:0`, C `11/6/2026 9:0`. Data scenes are in the same chronological order. |
| T63 | P `epoch-datetime-dmy`. A: `2 01/01/2000`. B: `1 31/12/2026`. | Success file. Epoch is the largest unit, so B sorts before A even though A's calendar date is earlier. Scenes rows in order B `1 31/12/2026`, A `2 1/1/2000`. |
| T64 | P `time`. A: `16:00`. B: `08:00`. C: `09:30`. | Success file. Scenes rows in order B `8:0`, C `9:30`, A `16:0`. |
| T65 | P `epoch-datetime-mdy`. All same epoch 1. A: `1 12/31/2024`. B: `1 03/12/2025`. C: `1 04/01/2025`. | Success file. Ordering uses year, then month, then day. Scenes rows in order A `1 12/31/2024`, B `1 3/12/2025`, C `1 4/1/2025`. |
| T66 | P `datetime`. A and B both: `04/03/2026 09:30`. C: `05/03/2026 09:30`. | Success file. Equal values sort stably in index order. Scenes rows in order A `4/3/2026 9:30`, B `4/3/2026 9:30`, C `5/3/2026 9:30`. Both A and B appear. No deduplication. Data has three scenes. |
| T67 | P `datetime`. A: `04/03/2026 16:00`. B: `04/03/2026 09:30`. C: `04/03/2026 09:30`. | Success file. B and C tie and keep index order, then A follows. Scenes rows in order B `4/3/2026 9:30`, C `4/3/2026 9:30`, A `4/3/2026 16:0`. |

## I. Number Format

| ID | Setup | Expected |
| --- | --- | --- |
| T68 | P `number`. A: unquoted `10`. B: unquoted `2`. C: unquoted `33`. D: unquoted `1`. | Success file. Numeric, not lexical, ordering. Scenes rows in order D `1`, B `2`, A `10`, C `33`. Data values are JSON numbers. |
| T69 | P `number`. A: unquoted `3`. B: quoted `"1"`. C: unquoted `20`. D: quoted `"2"`. | Success file. Quoted and unquoted integers are both accepted. Scenes rows in order B `1`, D `2`, A `3`, C `20`. |
| T70 | P `number`. A: quoted `"007"`. B: unquoted `7`. C: quoted `"010"`. | Success file. Leading zeros are parsed away. A and B both have value 7 and keep index order. Scenes rows in order A `7`, B `7`, C `10`. Data has numbers, not strings. |
| T71 | P `number`. A: unquoted `0`. B: unquoted `1`. | Success file. Scenes rows in order A `0`, B `1`. Data for A is `{"number":0}`. Zero is accepted. |
| T72 | P `number`. A: unquoted `3.0`. B: unquoted `1`. | Success file. Obsidian's YAML parser presents the unquoted `3.0` as the number 3, which stringifies to `3`. Scenes rows in order B `1`, A `3`. Data has numbers. |
| T73 | P `number`. A: quoted `"3.0"`. | Problems file with one bullet for A using label `Chronological order (num)`. The quoted decimal remains a string and fails the integer pattern. No success sections. |
| T74 | P `number`. A: unquoted `-1`. | Problems file with one bullet for A using label `Chronological order (num)`. The minus sign fails the pattern. This is not a range error. |
| T75 | P `number`. A: unquoted `1000000`. B: unquoted `999999`. | Success file. Scenes rows in order B `999999`, A `1000000`. Large values are accepted without a range limit. |

## J. Output Path Derivation

The timeline path is the compiled path with `_timeline` inserted before the final extension. A target without an extension gets `.md` appended first. The compiled path is relative to the project folder unless it begins with `/`, which makes it relative to the vault root. `$1` is replaced with the project title.

Unless a row says otherwise, each test in this section uses one valid scene A with `timeframe: "04/03/2026 09:30"`.

| ID | Setup | Expected |
| --- | --- | --- |
| T76 | Workflow `standard` Save as Note target: `Build/$1.md`. P title: My Book. | Timeline file created at `Novels/My Book/Build/My Book_timeline.md`. The `Build` folder is created if absent. The compiled counterpart would be `Novels/My Book/Build/My Book.md`. Header title is `My Book`. |
| T77 | Workflow target: `manuscript.md`. | Timeline file at `Novels/My Book/manuscript_timeline.md`. Header title is `My Book`. |
| T78 | Workflow target: `/out/$1.md`. | Compiled counterpart is `out/My Book.md` at the vault root. Timeline file is `out/My Book_timeline.md` at the vault root, not inside the project folder. The `out` folder is created if absent. |
| T79 | Workflow target: `/manuscript.md`. | Timeline file at `manuscript_timeline.md` in the vault root. It is not placed in the project folder. |
| T80 | Workflow target: `Build/$1` with no extension. | The compiled path becomes `Novels/My Book/Build/My Book.md`. Timeline file is `Novels/My Book/Build/My Book_timeline.md`. The suffix is inserted after the appended `.md`. |
| T81 | Workflow target: `Build/$1.txt`. | Compiled counterpart is `Novels/My Book/Build/My Book.txt`. Timeline file is `Novels/My Book/Build/My Book_timeline.txt`. The extension is preserved, so the timeline is not forced to `.md`. |
| T82 | Workflow target: `$1-draft.md`. | Timeline file is `Novels/My Book/My Book-draft_timeline.md`. |
| T83 | Workflow target: `Build/$1-$1.md`. | Only the first `$1` is replaced. Compiled counterpart is `Build/My Book-$1.md`. Timeline file is `Novels/My Book/Build/My Book-$1_timeline.md`. |
| T84 | Index has `workflow: null`. Scenes and values are valid. | The default target is used. Timeline file is `Novels/My Book/manuscript_timeline.md`. |
| T85 | Workflow `standard` exists but has no `write-to-note` step. | The default target is used. Timeline file is `Novels/My Book/manuscript_timeline.md`. |
| T86 | Workflow has a `write-to-note` step whose `target` is `"   "` (whitespace only). | The target trims to empty, so the default is used. Timeline file is `Novels/My Book/manuscript_timeline.md`. |
| T87 | Workflow has a `write-to-note` step with no `target` option at all. | The default is used. Timeline file is `Novels/My Book/manuscript_timeline.md`. |
| T88 | Workflow target: `Build/Part 1/$1.md`. The `Build/Part 1` folder does not exist. | Nested folders are created and the timeline file is written at `Novels/My Book/Build/Part 1/My Book_timeline.md`. |

## K. Data Block Shape

The Data block is pretty-printed JSON with two-space indentation. The top-level keys are exactly `units`, `primary`, `secondary`, `scenes`. Each scene object has exactly `scene` and `values`. `units` is stored once for the whole project, not per scene.

| ID | Setup | Expected |
| --- | --- | --- |
| T89 | P `datetime`. A: `04/03/2026 09:30`. B: `05/03/2026 10:15`. | Success file. Data, when compacted, is `{"units":["day","month","year","hour","minute"],"primary":"year","secondary":"month","scenes":[{"scene":"Scene A","values":{"day":4,"month":3,"year":2026,"hour":9,"minute":30}},{"scene":"Scene B","values":{"day":5,"month":3,"year":2026,"hour":10,"minute":15}}]}`. In the file it is pretty-printed with two spaces. |
| T90 | P `datetime`. A: `04/03/2026 09:30:00`. B: `04/03/2025 09:30:00`. C: `04/03/2024 09:30:00`. | Success file. The `units` array appears once, has length 6, and is `["day","month","year","hour","minute","second"]`. No scene object has its own `units` key. Data scenes are in chronological order C, B, A. |
| T91 | P `epoch-datetime-dmy`. A: `2 04/03/2026 09:30:15`. | Success file. Data `units` is `["epoch","day","month","year","hour","minute","second"]`, primary is `epoch`, secondary is `year`, and values include `"epoch":2`. |
| T92 | P `epoch-datetime-mdy`. A: `1 03/04/2026 09:30`. | Success file. Data `units` is `["epoch","month","day","year","hour","minute"]`, values keys appear in that order, and the table row is `1 3/4/2026 9:30`. Primary is `epoch`, secondary is `year`. |
| T93 | P `time`. A: `09:30`. | Success file. Data `units` is `["hour","minute"]`, primary is `hour`, secondary is `minute`, and values are `{"hour":9,"minute":30}`. |
| T94 | P `number`. A: `7`. | Success file. Data `units` is `["number"]`, primary and secondary are both `number`, and values are `{"number":7}`. |
| T95 | Use the T89 project state and generate the success file. | The fenced JSON block parses without error. It has exactly the top-level keys `units`, `primary`, `secondary`, `scenes`. Every element of `scenes` has exactly `scene` and `values`. No extra keys appear. |

## L. Rebuild Triggers

Auto-rebuild runs when a tracked scene's timeframe value changes, when the project signature changes, and on plugin startup. The signature includes project title, workflow id, scene folder, time format, tag name, and the scene titles in order. It does not include the workflow target, scene indentation, or scene bodies.

| ID | Setup | Expected |
| --- | --- | --- |
| T96 | P `datetime`. A: `04/03/2026 09:30`. B: no tag. Build once so the file shows A in Scenes and B in Not on the timeline. Then add B: `06/03/2026 09:30` and wait for the metadata cache. | The file rebuilds without the manual command. Scenes rows A `4/3/2026 9:30`, B `6/3/2026 9:30`. The Not on the timeline section disappears. Data includes A and B. |
| T97 | P `datetime`. A: `04/03/2026 09:30`. B: `06/03/2026 09:30`. Build once. Change A to `07/03/2026 09:30` and wait. | The file rebuilds. Scenes rows in order B `6/3/2026 9:30`, A `7/3/2026 9:30`. Data is in the same order. There is no stale A row with the old value. |
| T98 | P `datetime`. A: `04/03/2026 09:30`. B: `05/03/2026 09:30`. Build once. Remove B's `timeframe` key and wait. | The file rebuilds. Scenes contains A only with row `4/3/2026 9:30`. Not on the timeline lists B. Data contains A only. |
| T99 | P `datetime`. Only A has a value, `04/03/2026 09:30`. Build once. Remove A's `timeframe` key and wait. | The rebuild produces zero entries and zero errors, so no write occurs. The existing timeline file remains byte-identical with the old A row `4/3/2026 9:30` and old header. It is not deleted and no empty timeline is created. If no file existed before the removal, no file is created. |
| T100 | P `datetime`. A and B: `04/03/2026 09:30` and `05/03/2026 09:30`. Build once. Change the index `timeFormat` to `time` and wait. | The signature changes, so the file rebuilds. It is a Problems file with header label `Time only (hh:mm:ss)` and one format-error bullet for each scene. No Scenes, Not on the timeline, or Data sections. |
| T101 | P `epoch-datetime-dmy`. A: `1 03/04/2026` (day 3, month 4). Build once. Change `timeFormat` to `epoch-datetime-mdy` and wait. | The file rebuilds. Header label becomes `Epoch date time (num mm/dd/yyyy hh:mm:ss)`. The row text remains `1 3/4/2026`, but Data `units` becomes `["epoch","month","day","year"]` and values become `{"epoch":1,"month":3,"day":4,"year":2026}`. Primary is `epoch`, secondary is `year`. |
| T102 | P `datetime`. Change index tag to `when`. Scene A has `when: "04/03/2026 09:30"` and an old `timeframe: "01/01/2020 00:00"`. Build once, then wait after the tag change. | The file rebuilds. Header shows tag `when`. Scenes row A is `4/3/2026 9:30`, taken from `when`, not from the old `timeframe`. Data matches the new tag. |
| T103 | P `datetime`. Existing timeline built with tag `timeframe` and scene A value `04/03/2026 09:30`. Change index tag to `when`, but scenes still have only `timeframe`. Wait. | The rebuild finds no values under `when`, so entries and errors are zero and no write occurs. The existing file remains byte-identical with the old header tag `timeframe` and the old row `4/3/2026 9:30`. It is not replaced by a Not on the timeline file. If no prior file existed, none is created. |
| T104 | P `datetime`. Index scenes A and B. A: `04/03/2026 09:30`. B: no tag. Build once. Add Scene C to the index with value `06/03/2026 09:30` and create `Scenes/Scene C.md`. Wait. | The signature changes, so the file rebuilds. Scenes rows A `4/3/2026 9:30` and C `6/3/2026 9:30` in that order. Not on the timeline lists B. Data includes A and C. |
| T105 | P `datetime`. Index scenes A and B. A: `04/03/2026 09:30`. B: no tag. Build once. Add Scene C to the index with no tag and create its file. Wait. | The file rebuilds. Scenes contains A only with row `4/3/2026 9:30`. Not on the timeline lists B and C in index order. Data contains A only. |
| T106 | P `datetime`. Index scenes A, B, C with values `04/03/2026 09:30`, `05/03/2026 09:30`, and `06/03/2026 09:30`. Build once. Remove B from the index scene list. Wait. | The file rebuilds. Scenes contains A `4/3/2026 9:30` and C `6/3/2026 9:30` only. B is absent from Scenes, Not on the timeline, and Data. |
| T107 | P `datetime`. Index scenes A and B with values `04/03/2026 09:30` and `05/03/2026 09:30`. Build once. Swap their order in the index. Wait. | The signature changes and a rebuild occurs, but the chronological table and Data are unchanged, so the unchanged-content check skips the write. The file content and modification time remain the same. |
| T108 | Vault contains two multi-scene projects P1 and P2 with valid timeframe values (`04/03/2026 09:30` in P1 and `05/03/2026 09:30` in P2) and no timeline files, plus one single-scene project P3. Reload the plugin. | On startup both timeline files are created at their own paths. P3 gets no timeline file and is not processed. No manual command is needed. |
| T109 | Use the T03 project state and build once. Reload the plugin. | The startup rebuild runs, finds identical contents, and does not write. The file is byte-identical and its modification time is unchanged. |
| T110 | P `datetime`. A-E have no `timeframe` key at all, and no timeline file exists. Reload the plugin. | The startup rebuild finds zero entries and zero errors, so no file is created. No Problems file appears. |
| T111 | P `datetime`. A: `04/03/2026 09:30`. Build once. Change A to `07/03/2026 09:30` and run `Rebuild timeline` with P selected. | A Notice says `Timeline rebuilt.` The timeline file is updated with row A `7/3/2026 9:30`. |
| T112 | P `datetime`. A-E have no `timeframe` key and no timeline file exists. Run `Rebuild timeline` with P selected. | A Notice still says `Timeline rebuilt.` No timeline file is created because there are no entries and no errors. |
| T113 | Select a single-scene project. Open the command palette. | `Rebuild timeline` is not listed or is disabled because the selected draft's format is `single`. No file is created. |
| T114 | Select no project, or select a note that is not a project. Open the command palette. | `Rebuild timeline` is unavailable. No file is created. |
| T115 | P `datetime`. A: `04/03/2026 09:30`. Build once. Change only A's `title` frontmatter key, or edit only A's body text, and wait. | The timeframe raw value is unchanged, so no rebuild occurs. The timeline file content and modification time are unchanged. |
| T116 | Use the T03 project state and build once. Edit `Novels/My Book/Notes/idea.md` and change its `timeframe` value. Wait. | The note is not a scene, so no rebuild occurs. The timeline file content and modification time are unchanged. |
| T117 | Use the T03 project state and build once with target `manuscript.md`. Change the workflow target to `Build/$1.md` and wait. | No auto-rebuild occurs because the target is not part of the observer signature. The old `Novels/My Book/manuscript_timeline.md` remains. No `Novels/My Book/Build/My Book_timeline.md` appears yet. |
| T118 | Continue from T117 and run `Rebuild timeline` with P selected. | A new timeline is written at `Novels/My Book/Build/My Book_timeline.md`. The old `Novels/My Book/manuscript_timeline.md` remains in place and is not deleted. |
| T119 | With the plugin running, create a brand-new multi-scene project with one scene A at `04/03/2026 09:30`. Do not restart. | Current behavior: the drafts store adds the project with no previous signature, so no automatic rebuild occurs. No timeline file appears until `Rebuild timeline` is run or the plugin restarts. After either action the file is created with row A `4/3/2026 9:30`. This is a known trigger gap to confirm. |

## M. Scope

Unless a row says otherwise, use scene A with `04/03/2026 09:30` and scene B with `05/03/2026 09:30` in these tests.

| ID | Setup | Expected |
| --- | --- | --- |
| T120 | P `datetime`. Scenes A and B have valid values. Add `Novels/My Book/Notes/idea.md` with `timeframe: "01/01/2020 00:00"`. | The timeline includes only A and B. The note appears in no section, is not in Not on the timeline, and produces no error. |
| T121 | P `datetime`. Scenes A and B are valid. Add `Novels/My Book/My Book_bible.md` with a timeframe value, plus `cover.png` and `notes.txt` in the project folder. | The timeline includes only A and B. The bible, image, and text file are ignored. No error, no missing entry. |
| T122 | P `datetime`. Scenes A and B are valid. Add `Novels/My Book/Scenes/Scene X.md` with a timeframe value but do not add Scene X to the index. | Scene X is ignored. It is not in Scenes, Not on the timeline, or Data, and it produces no error. |
| T123 | P `datetime`. Project scene A has `04/03/2026 09:30`. A separate `Other/Scenes/Scene A.md` has `01/01/1990 00:00`. | The timeline uses only `Novels/My Book/Scenes/Scene A.md` and shows `4/3/2026 9:30`. The same-title file outside the project is ignored. |
| T124 | P `datetime`. Index lists Scene B, but `Novels/My Book/Scenes/Scene B.md` is absent. A file `Other/Scenes/Scene B.md` exists with a timeframe. Scene A is valid. | Scene B is silently skipped because its project path does not resolve. It is not a Scenes row, not a Not on the timeline entry, and not an error. Scene A still appears. |
| T125 | Two multi-scene projects P1 and P2. P1 scene A: `04/03/2026 09:30`. P2 scene Z: `05/03/2026 09:30`. Rebuild P1 only. | P1's timeline contains only P1 scene A. P2 scene Z is ignored by P1's build. P2 has its own separate timeline file when rebuilt. |
| T126 | Use the T03 project state and build once. The index note `My Book.md` itself has a `timeframe: "01/01/2000 00:00"` in its frontmatter. | The index note is not a scene. Its timeframe is ignored and produces no row, missing entry, or error. |
| T127 | Use the T03 project state and build once. Then add a `timeframe` frontmatter key to `Novels/My Book/manuscript_timeline.md` by hand and rebuild P. | The timeline output file is not a scene and is ignored. It does not include itself in Scenes or Data, and no error is produced. |
| T128 | P `datetime`. Add `Scenes/cover.png` and `Scenes/notes.txt` to the scene folder. Scenes A and B are valid. | Non-markdown files in the scene folder are ignored. The timeline includes only A and B, with no errors or missing entries. |

## N. Edge Cases

| ID | Setup | Expected |
| --- | --- | --- |
| T129 | P `datetime`. A: `" 04/03/2026 09:30 "` with leading and trailing spaces inside the quotes. | Success file. The value is trimmed and accepted. Scenes row A `4/3/2026 9:30`. No Problems. |
| T130 | P `datetime`. A: `"04/03/2026   09:30"` with multiple spaces between date and time. | Success file. The separator pattern accepts one or more whitespace characters. Scenes row A `4/3/2026 9:30`. |
| T131 | P `datetime`. A: a tab between date and time, `"04/03/2026\t09:30"`. | Success file. The tab is accepted as a separator. Scenes row A `4/3/2026 9:30`. |
| T132 | P `datetime`. A: `"04/03/2026 09:05:07"`. | Success file. Leading zeros are parsed and not preserved. Scenes row A `4/3/2026 9:5:7`. Data values are numbers 9, 5, 7. |
| T133 | P `datetime`. A: `"4/3/2026 9:30"` with one-digit day, month, and hour. | Success file. One or two digits are accepted for all date and time units except the year. Scenes row A `4/3/2026 9:30`. |
| T134 | Multi-scene P with exactly one scene A: `04/03/2026 09:30`. | Success file at default path. Scenes has one row A `4/3/2026 9:30`. No Not on the timeline section. Data has one scene. |
| T135 | Multi-scene P with exactly one scene A and no `timeframe` key. | No file is created at the default path. |
| T136 | Multi-scene P with an empty scene list. | No file is created. The build sees zero scenes, zero entries, and zero errors. |
| T137 | A single-scene project with `format: single`, a workflow target of `manuscript.md`, and a `timeframe` key on its index note. | No timeline file is created. The observer skips non-scenes drafts and `Rebuild timeline` is unavailable for the project. The `timeframe` key on the note is ignored. |
| T138 | P `datetime`. Index has `timeFormat: bogus`. A: `04/03/2026 09:30`. | The invalid format falls back to `datetime`. Success file with label `Date time (dd/mm/yyyy hh:mm:ss)`, primary `year`, secondary `month`, row `4/3/2026 9:30`. |
| T139 | P with `timeFormat` and `timeframeTagName` omitted from the index. A: `timeframe: "04/03/2026 09:30"`. | Defaults apply. Header shows label `Date time (dd/mm/yyyy hh:mm:ss)` and tag `timeframe`. Success file with row A `4/3/2026 9:30`. |
| T140 | P `time`. A: `0:0:0`. B: `09:30:00`. | Success file. Both values use 3 units. A is valid and sorts first. Scenes rows in order A `0:0:0`, B `9:30:0`. Data for A is `{"hour":0,"minute":0,"second":0}`. |
| T141 | P `datetime`. A scene title contains a vertical bar, for example the title `A` followed by a bar and `B`, with value `04/03/2026 09:30`. | Success file is created. The Scenes table row is malformed because the scene title is not escaped, so it splits into extra columns. The Data JSON remains valid and contains the full scene title. Record this as a robustness defect. |
| T142 | P `datetime`. A: `04/03/2026 00:30`. B: `04/03/2026 09:00`. | Success file. Both values use 5 units and defined zero units are kept. Scenes rows in order A `4/3/2026 0:30`, B `4/3/2026 9:0`. Data for A is `{"day":4,"month":3,"year":2026,"hour":0,"minute":30}` and for B is `{"day":4,"month":3,"year":2026,"hour":9,"minute":0}`. |

## O. Interaction with the Compiled Manuscript

Unless a row says otherwise, each test in this section uses one valid scene A with `timeframe: "04/03/2026 09:30"`.

| ID | Setup | Expected |
| --- | --- | --- |
| T143 | P target `manuscript.md`. Pre-create `Novels/My Book/manuscript.md` with the exact content `MANUSCRIPT`. Rebuild the timeline. | `manuscript.md` remains byte-identical to `MANUSCRIPT`. The timeline is written at `Novels/My Book/manuscript_timeline.md`. The timeline content does not contain `MANUSCRIPT`. |
| T144 | P target `Build/$1.md`. Pre-create `Novels/My Book/Build/My Book.md` with content `COMPILED`. Rebuild the timeline. | The compiled file remains byte-identical. The timeline is written at `Novels/My Book/Build/My Book_timeline.md` beside it. |
| T145 | P target `Build/$1.v2.md`. Rebuild the timeline. | The compiled counterpart is `Build/My Book.v2.md`. The timeline is `Build/My Book.v2_timeline.md`, because the suffix is inserted before the final extension, not after the first dot. |
| T146 | P target `manuscript_timeline.md`. Pre-create `Novels/My Book/manuscript_timeline.md` with content `COMPILED`. Rebuild the timeline. | The timeline path is `Novels/My Book/manuscript_timeline_timeline.md`, so the compiled file named `manuscript_timeline.md` is preserved. The suffix is always inserted, even when the compiled name already contains `_timeline`. |
| T147 | P target `manuscript.md`, and no compiled manuscript file exists. Rebuild the timeline. | The timeline file is still created at `Novels/My Book/manuscript_timeline.md`. Timeline generation does not require the manuscript to be compiled first. |
| T148 | P target `manuscript.md`. Build the timeline first so `manuscript_timeline.md` exists. Then run the project's normal compile workflow that writes `manuscript.md`. | The compile writes `manuscript.md` and leaves `manuscript_timeline.md` untouched. The timeline file is not overwritten or consumed by the compile. |

## Coverage Summary

- Five formats: T01-T05.
- Partial values for every format that supports them: T06-T15.
- Wrong format, all five formats plus right-drop violations: T16-T25.
- Range checks for month, day, hour, minute, and second, plus boundaries, zero values, no calendar validation, and unbounded epoch/year: T26-T40.
- Inconsistent granularity, including majority and tie cases: T41-T48.
- Missing values, empty timelines, and stale-file behavior: T49-T59.
- Mixed valid and invalid files: T60-T61.
- Chronological ordering, flashback, duplicates, and stable ties: T62-T67.
- Number format ordering, quoting, leading zeros, zero, floats, negatives, and large values: T68-T75.
- Output path derivation for relative, absolute, extensionless, non-markdown, `$1`, and default targets: T76-T88.
- Data block shape and shared `units`: T89-T95.
- Every rebuild trigger plus observer gaps and manual command behavior: T96-T119.
- Scope isolation for notes, bibles, assets, untracked scenes, missing scene files, other projects, and the index note: T120-T128.
- Whitespace, YAML coercion, defaults, one-scene projects, unsupported single-scene projects, and title escaping: T129-T142.
- Compiled manuscript coexistence and non-overwrite behavior: T143-T148.
