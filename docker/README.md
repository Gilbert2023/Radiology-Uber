# docker/

Container build recipes and the local-development environment.

Planned contents:

```
docker/
├── api.Dockerfile              # multi-stage build of apps/api — CMD ["node", "dist/main.js"]
├── worker.Dockerfile             # same source tree as api.Dockerfile, different CMD (dist/worker.js) —
│                                    one source, two images, no duplicated build logic
├── web.Dockerfile                  # ONE parameterized Dockerfile (build-arg selects which of
│                                     radiologist-portal / provider-dashboard / admin-panel to build)
├── docker-compose.yml                # local dev stack: postgres, redis, orthanc, mock SMS/payment
│                                       providers — the whole backend dependency set, one command
├── docker-compose.override.yml         # local-only additions (hot-reload volumes, debug ports)
└── .dockerignore
```

**M8** (this milestone's next step) creates `docker-compose.yml` with just Postgres and Redis — the minimum needed to start building the database schema and backend. Orthanc, the mock provider services, and the Dockerfiles for each app are added as those apps come online (M65, M147+).

See `docs/FOLDER_STRUCTURE.md` §9 for the full rationale, including why there's one templated `web.Dockerfile` rather than three near-duplicate files.
