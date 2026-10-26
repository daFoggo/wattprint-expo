@AGENTS.md

# Working guidelines

Favor caution over speed; for trivial edits (typos, renames) use judgment. Adapted from the four principles in
[andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (MIT; repo and licence checked 2026-10-25).

## 1. Think before coding

- State assumptions. If a request has several readings, say so instead of silently picking one; if something is unclear, ask.
- If a simpler approach exists, say so.
- Unknown FastAPI contract? Read the backend's `/openapi.json` before writing the client; do not guess endpoints or fields.
- Expo, React Native and the libraries here are newer than your memory: check the installed version, the typings in
  `node_modules` or the official docs before using an API (see "Read the doc before changing the area" in AGENTS.md).

## 2. Simplicity first

- Write the minimum that solves the request: no unrequested features, no single-use abstractions, no speculative config.
- Extract to shared code only by the rule in `docs/architecture.md` (a second feature needs it).

## 3. Surgical changes

- Touch only what the request needs; match the existing style; do not reformat or refactor neighbours.
- Remove imports and functions that your change orphaned; only mention unrelated dead code.
- Respect the import boundaries enforced by ESLint (`eslint.boundaries.js`).

## 4. Goal-driven execution

- Turn the task into a verifiable goal with a check per step; test first where you can.
- "Done" means the commands in AGENTS.md "Done commands" ran and you report their real output, failures included; UI or
  native changes are also run on the physical phone.
- Say what was and was not verified; never claim a flow works if only its error path was tried.
