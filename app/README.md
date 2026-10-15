# Enterprise and Global HR demo

This package runs a synthetic HR application on Databricks Apps and Lakebase.
The Enterprise experience includes three decision stories, six legal entities,
three periods, assumed FX, source reconciliation, live model explanations,
explicitly reviewed synthetic actions and a reusable business-case worksheet.
The DNB specialists and historical cockpit remain separate experiences.

## Install and configure

Prerequisites: Python 3.11+, uv, Databricks CLI 1.19+ and an
explicitly selected workspace profile. Customer deployment additionally requires
the customer's authorization, appropriate region and assigned identity scopes.
No private MCP tools or authoring-machine skills are required.

1. Extract the release and run `uv sync --project app --default-index https://pypi.org/simple`.
2. The archive includes the built wheel and frontend; deployment needs no Node
   installation or access to the original Git repository.
3. To rebuild from source, install Node 24+ and APX, run `npm install` and
   `apx build` in `app`. Authoring lockfiles pointing at private proxies are
   deliberately excluded; resolve dependencies in your approved registry.
4. Copy the structure of `target.example.json` to a private target file. Supply
   the selected profile, target App, selected Lakebase project/branch/database,
   model endpoint and presenter identity. Never store a token in that file.
5. Run `app/.venv/bin/python delivery/manage.py preflight --profile PROFILE
   --config target.local.json --out preflight.json`.
6. Run the same command with `provision`, then `deploy`, then `verify`, using a
   different output file for each operation. Provision creates only the named
   App if absent and attaches the selected existing Lakebase database/model.
   It does not create or delete a Lakebase project implicitly.

Commands are shown from the release root. In the authoring repository, the
equivalent root is `demo`. All target IDs come from configuration. The original
FEVM deployment registry is deliberately excluded from the release.

`provision` records the target App principal and configures OAuth database
connectivity. The app initializes its dedicated `app` tables using the database
resource grant. Use a dedicated database for this demo, not a production HR
database. A target administrator must supply a database whose permissions allow
this initialization. Preflight records identity and resource readiness; it does
not claim that source HR permissions propagate automatically.

## Present and reset

Open `/enterprise`, choose a story, then **New rehearsal**. All data are
synthetic. A rehearsal is a new run: previous batches, approvals and audits are
preserved. Run `manage.py reset` to create another rehearsal via the authenticated
App API. Run `manage.py stop` to stop the configured App's compute; Lakebase and
data are retained. The teardown command requires the exact App name with
`--confirm-app`, deletes only that App, and never deletes a shared database,
project, warehouse, model or historical evidence.

The app's English/French selectors apply to the three stories and business-case
flow. Local account preferences and account JSON imports contain presenter inputs
only. They do not change authentication or live scenario data.

## Simulated source and agent

`delivery/simulate_sources.py --out source.json --demand-increase 30` produces a
**simulated GCP export**, not a GCP connection. Upload it in **Group & sources**.
The server validates the source contract, binds the payload hash, performs an
idempotent transactional upsert and increments the accepted revision. Bad batches
are recorded without changing accepted rows. New source revisions invalidate
uncommitted approvals. **Recover baseline source** restores the synthetic source
as another revision, preserving the failed batch and audit.

`/agent-workspace` is a **Dust-style interface simulation**, not a Dust tenant.
It issues real authenticated HTTP requests to the read-only tool and optionally
the live explanation endpoint. The standalone client exercises the external path:

```sh
app/.venv/bin/python delivery/tool_client.py --profile PROFILE \
  --url https://SELECTED-APP.databricksapps.com --run-id RUN_ID \
  --entity FR --out external-result.json
```

The callable contract is `GET /api/enterprise/tools/manifest`. Configure a real
agent's HTTP tool only after its target is selected: POST to the stated path
with its declared JSON schema, a valid Databricks Apps OAuth bearer credential,
and a dedicated server-assigned read-only identity. No arbitrary SQL or write
endpoint is exposed by this tool contract. The API also publishes its standard
OpenAPI schema at `/api/openapi.json`.

## Identity and operational boundaries

Apps authenticates the caller. Deployment-owned bindings map the proxy identity
to a canonical workspace identity. `enterprise.access` assigns entity lists,
reader/editor roles and a synthetic tenant. Persona preview grants no rights.
Queries run under the App service principal with additional server-side entity
filtering; this is not Genie OBO or database row-level security. Assigning a
reader does not grant access to the historical cockpit or its actions.

Only group editors ingest sources/create runs. Local editors can propose and
review decisions in their assigned entities. Approval expires after 15 minutes.
The synthetic queue never writes to Workday, GCP, Dust or another HR system.
Automated rehearsal notes must say `AUTOMATED TEST - no actual human approval`.

Country labels and currency conversion are not residency or legal compliance
proof. The same target hosts the synthetic data; inspect the actual target region
and required contracts before processing customer data. Synthetic policy passages
are versioned examples, not legal advice.

## Day-two ownership

| Change / incident | Accountable role | Repeatable check |
|---|---|---|
| New source table | Customer data owner + data engineer | SourceRow mapping, reconciliation, failed batch, revised SQL result |
| KPI definition | Business metric owner | Reviewed definition plus fixed expected/actual comparison |
| New country | Local HR/data authority | Entity mapping, currency/fiscal rules, allowed identities, residency decision |
| Access change | Workspace administrator | Two authenticated identities and actual allowed/denied reads |
| Failed ingestion | Data operator | Retained rejection, unchanged accepted revision, corrected batch |
| Unavailable model | App operator | SQL remains inspectable, explicit failure, successful retry |
| Performance / cost | Platform owner | Measured concurrency, latency/token evidence, target billing and price inputs |

## Evidence and limitations

The technical tab shows actual SQL, revision/hash, actor-specific timings, tokens,
audit and lineage. Cost inputs in the value model are estimates, not invoices.
Released staff time is kept separate from cash benefit. FX and capacity effects
are explicit assumptions, not forecasts or observed intervention effects.

Use `FIELD_GUIDE.md` for discovery, objection handling, evaluation and expansion.
Use real recordings from the delivered evidence as **recorded mode**, with their
date and source revision visible. Never describe playback as live execution.
Full A00-A15/G0-G9 certification and customer acceptance remain separate from this
supporting Enterprise delivery.
