# infrastructure/

Terraform and operational configuration for the platform's cloud and self-hosted infrastructure (`docs/ARCHITECTURE.md` §7/§11/§14).

Planned contents:

```
infrastructure/
├── terraform/
│   ├── modules/                  # reusable modules: vpc, ecs-service, rds-postgres,
│   │                                elasticache-redis, s3-storage, cdn
│   └── environments/
│       ├── dev/                    # each environment is a SEPARATE Terraform root module
│       ├── staging/                   with its own state file — a `terraform apply` in dev
│       └── production/                  can never accidentally touch production state
├── orthanc/                      # self-hosted PACS server config (docs/ARCHITECTURE.md §11) —
│                                    kept separate from terraform/ since it's application-level
│                                    config for specific software, not a cloud resource definition
└── scripts/                      # ops scripts run by a human (reconciliation runner,
                                     backup-restore verification), not part of the deploy pipeline
```

This directory is deliberately built out **last** in the milestone plan (`docs/MILESTONES.md` M147–M150) — local development is fully served by `docker/docker-compose.yml` throughout the rest of the build, so cloud infrastructure is only needed once there's a real application ready to deploy. See `docs/FOLDER_STRUCTURE.md` §6 for the full rationale, including why environments are isolated root modules rather than one parameterized config.
