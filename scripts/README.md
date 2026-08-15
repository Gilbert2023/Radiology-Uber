# scripts/

Repo-wide developer and ops scripts that don't belong to any single app — bootstrap helpers, database reset/seed triggers, and codegen runners invoked from the root `package.json` or CI.

This folder is intentionally empty at this milestone. The first scripts land alongside the work that needs them (e.g., a `db:reset` helper alongside the first database migrations in M11–M29, a `bootstrap.sh` once there's more than one app to stand up together). Adding scripts speculatively, before a concrete task needs one, is exactly the kind of premature tooling this project avoids — see `docs/FOLDER_STRUCTURE.md` §11.
