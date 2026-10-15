# Optional Genie / DNB provisioning (reference scripts)

These are the **original authoring scripts** used to provision the Genie spaces
and Supervisors behind `/ask`, `/dnb` and the live briefings on the author's
FEVM. They are included so you can reproduce those experiences. They are **not**
part of the tested `delivery/manage.py` lifecycle and will not run unmodified.

| Script | Creates |
|---|---|
| `dnb_setup.py` | 4 synthetic cohort tables + 4 UC Metric Views, 4 specialist Genie spaces, 1 native Supervisor (modes: `supervisor`, `data`, `agents`, `connect`, `readiness`, `reference`) |
| `genie_setup.py` | Aggregate tables from `app/src/hr_demo/data/snapshot.json`, the historical Genie space and its Supervisor (modes: `supervisor`, `tables`, `genie`, `connect`, `readiness`, `genie_smoke`, `tune`) |

Adapt before running:

1. `WorkspaceClient(profile="fevm-gdpr2")` and `"profile": "fevm-gdpr2"` → your profile.
2. `ROOT = Path(__file__).resolve().parents[2]` and the `demo/app/src` /
   `demo/app/src/hr_demo/data/snapshot.json` paths → this repo's `app/src/...`
   (one level up: `parents[1]`).
3. `TARGET = ROOT / "resources.deadline-fevm.local.json"` → your
   `target.local.json` (needs `warehouse_id` and `app_name`).
4. `NAMESPACE = "gdpr2_catalog.hr_demo"` → a dedicated catalog.schema you own.
5. `OUT` evidence directories under `validation/` → any local folder.

Then copy the created space IDs / endpoint names into the `agents` and
`dnb_agents` blocks of `target.local.json` (see `docs/index.html` → Deploy) and
re-run `delivery/manage.py deploy`. Grant the App service principal CAN_RUN on
each Genie space, CAN_QUERY on the Supervisor endpoints, and SELECT on the tables.
All generated data is synthetic aggregates; no person-level records are created.
