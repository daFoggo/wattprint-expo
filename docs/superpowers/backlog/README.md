# Backlog

One file per open item that is not being worked on now. A backlog file is a decision aid, not a task list: it separates
what is known from what is guessed, so the next person does not start from an old assumption.

File name: `YYYY-MM-DD-<item>.md`. When the item starts, move its content into a spec or plan and delete the file in the
same commit; when it is dropped, delete it and say why in the commit message.

Template:

```
# <Item>

Opened: date. Source: where it came from (a doc, a measurement, a review).

## Why it matters
One or two sentences.

## Facts (measured or verified)
Each line says how it was checked: a file, a command, a benchmark section, a URL. Include the caveats.

## Ideas (not verified)
Each line starts with "idea" or "unverified". Never repeat an idea as a fact in another document.

## Start when
The trigger (a real feature exists, a device is available, ...).

## Done when
Checks that prove it: commands, measurements, device steps.

## Docs touched
The docs (and skills) that change in the same commit, per the maintenance rule in `AGENTS.md`.
```
