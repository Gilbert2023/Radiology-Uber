# testing/

Cross-cutting test suites that don't belong to any single app.

**Unit tests are deliberately NOT here.** They live colocated with the code they test (e.g., `apps/api/src/modules/bookings/bookings.service.spec.ts`), because a unit test's value depends on staying next to the implementation it exercises and moving with it in the same PR. This top-level folder is reserved for tests that inherently span more than one app, or aren't unit-shaped at all.

Planned contents:

```
testing/
├── e2e-web/                  # Playwright — flows spanning multiple web apps
├── e2e-mobile/                # Detox — patient-app / practitioner-app critical flows
├── contract/                    # validates apps/api's live responses against docs/API_DESIGN.md
├── load/                          # k6 scripts modeling docs/ARCHITECTURE.md §2's capacity assumptions
└── fixtures/                        # shared factory/seed data used by more than one suite above
```

Built out at **M144–M146**, once the apps and endpoints these suites exercise actually exist. See `docs/FOLDER_STRUCTURE.md` §7 for the full rationale, including why contract tests are tracked separately from e2e tests (they fail for different reasons and should be distinguishable in CI output).
