# docs/progress/ — one record per verified change

From 2026-09-24, each change records what it did here, in a file of its own: `YYYY-MM-DD-<slug>.md`. Before that date the record is `PROGRESS.md`, which every session appended to at the end. Two branches in progress at once therefore always conflicted there, and the file grew too long to read (`AGENTS.md` §8, §11).

A record states, facts only:

- **Changed:** the files or behaviour, and why, in a few lines.
- **Verified:** each command exactly as run, with its real result.
- **Not verified:** what could not be checked, and why.

Records are never rewritten afterwards. A later correction is a new record that names the one it corrects. The current state is not kept here: it lives in [`STATUS.md`](../../STATUS.md), which each change updates in place.
