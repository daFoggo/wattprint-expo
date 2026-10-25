# Image-row list performance on a device

Opened: 2026-10-25. Source: `docs/data-fetching.md` (lists), baseline caveats.

## Why it matters

The FlashList versus FlatList numbers come from text-only rows on an x86_64 emulator, but real lists will have images.

## Facts (measured or verified)

- Measured, emulator, release, text rows: FlashList had lower janky % at 500 and 1000 rows and about 40 MB less PSS than
  FlatList; frame percentiles were equal (baseline section 2).
- Not measured: rows with images (the product list uses `expo-image` with `recyclingKey`) and any physical device.
- The agent must not use the physical phone (HANDOFF standing rule); the owner decides when a device run happens.

## Ideas (not verified)

- Idea: add an image variant to `scripts/bench/list-bench.sh` using `ProductRow` rows.
- Unverified: that the FlashList advantage holds, or grows, on a slow phone.

## Start when

The owner provides a device for measurement, or a real list with images exists.

## Done when

Image-row results (n >= 5, median and range, release build) are in `docs/benchmarks/`, and `docs/data-fetching.md` and
`docs/performance.md` section 2 are updated or their "re-measure" caveat is removed.

## Docs touched

`docs/performance.md`, `docs/data-fetching.md`, `docs/benchmarks/`.
