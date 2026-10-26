# Reports

A report records what a finished chunk of work left behind: what exists, how it was reviewed, what was decided or
deviated from, what was deferred. Specs say what we intend (`../specs/`), plans say how (`../plans/`), reports say what is
true afterwards. A report does not copy numbers from measurement records; the old benchmark records were removed on 2026-10-26.

File name: `YYYY-MM-DD-<topic>.md`, one per chunk (a merged goal, a phase). Header: date, branch or commit range, the specs
and plans it closes. Every statement is checked against code, a command result or a URL, or labelled as an opinion.

Template:

```
# <Topic> report

Date, commits (`git log --oneline <from>..<to>`), specs and plans closed.

## Status
One paragraph: done, partly done, blocked. Gate results with the real command output summary and the date.

## What exists
Folders, modules, routes, tests, docs that now exist. Paths, not prose.

## Review outcome
Who or what reviewed (reviewer agent, CI, device check), verdict, fix waves. Say plainly when no review is recorded.

## Decisions and deviations
Each decision with its reason, and each deviation from the spec or plan with why. Mark "my call" when the user was not asked.

## Deferred
Open items, each linked to a file in `../backlog/`.

## Next
The next step and the first command to run.
```

Do not edit a report after the fact except to fix a factual error; write a new report instead.

## Index

- [2026-10-25-base-and-data-layer](2026-10-25-base-and-data-layer.md): base, data layer, architecture.
- [2026-10-25-vercel-rn-audit](2026-10-25-vercel-rn-audit.md): React Native best-practice audit.
- [2026-10-25-wave-c](2026-10-25-wave-c.md): contrast, Input 48 dp, project skill, docs-links guard.
- [2026-10-26-smarthome-ui-demo](2026-10-26-smarthome-ui-demo.md): Home, Devices, Energy and Settings tabs on mock data.
