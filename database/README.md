# database/

Migrations, seed data, and a maintained snapshot of the PostgreSQL schema designed in `docs/DATABASE_DESIGN.md`.

Planned contents:

```
database/
├── migrations/               # versioned migration files, applied in the exact order from
│                                DATABASE_DESIGN.md §11.4 — starting at M12 (extensions/enums)
├── seeds/
│   ├── reference/              # always-run reference data (modalities, Ghana regions) —
│   │                              safe, required, in every environment including production
│   └── dev-fixtures/             # local/staging-only sample data — never runs against production
└── schema/
    └── schema.prisma            # a committed, CI-regenerated snapshot of the live schema —
                                    the reviewable artifact DATABASE_DESIGN.md's tables map onto
```

Migration tooling (Prisma, per `docs/FOLDER_STRUCTURE.md` §5) is initialized in **M11**, with the full migration set built out across **M12–M29** — one migration per table group, in the exact dependency order documented in `docs/DATABASE_DESIGN.md` §11.4 (notably: `match_requests`/`match_offers` must be created *before* `reports`, since `reports.match_request_id` is a foreign key into the matching tables).

`seeds/reference/` and `seeds/dev-fixtures/` are kept as separate folders, not one shared `seeds/` directory, specifically so a deploy script can never run the wrong one by mistake — reference data is safe (and required) in production; fixture data must never touch it. See `docs/FOLDER_STRUCTURE.md` §5 for the full rationale.
