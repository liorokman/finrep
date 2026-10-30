# finrep v2 — Implementation Plan

Branch: `rewrite`. Reference: `docs/SPECIFICATION.md`. Old code stays in place until each area is replaced; the ccpdf parsers, CSV fixtures in `data/`, and their tests are ported, not rewritten.

Each phase ends green: `go build ./... && go vet ./... && go test ./...`, with the listed acceptance tests.

## Phase 0 — Hygiene (before any feature work)
- `.gitignore` / `.dockerignore`: `data/`, `*.csv`, `*.pdf`, `*.db*`, `ccpdf*.json`, `*.local.*`, built binaries, `web/node_modules`.
- Move secrets out of the tree; rotate the LocalAI key found in `ccpdf*.json` (the legacy `internal/ccpdf` LocalAI client is deleted with the old code, not ported).
- Remove the stray `leumi-2026-09.csv` from the root (move under ignored `data/`).

## Phase 1 — Foundation  *(done: `internal/money`, `internal/store`, `internal/conf`, `cmd/finrep`)*
Package names: `store` (database), `conf` (configuration), `money`. The old `internal/{database,config}` packages remain until their replacements land and are then deleted. HTTP uses the standard library `net/http` mux; the Echo dependency goes away with the old server. The money type is our own (the libraries don't parse statement amounts such as `₪ 1,003.05`).
- Layout: `cmd/finrep`, `internal/{config,db,money,ledger,importer,categorize,statements,reports,fx,api,auth,mcpsrv,web}`.
- `money`: integer minor-unit type, parsing/formatting, tests.
- `db`: migrations (fresh v2 schema, §13), single transaction helper, shared transaction scanner.
- `config`: flags + env, validation (refuse to start with auth on and no session secret).
- Acceptance: migrations apply to empty DB; money round-trips; config validation tests.

## Phase 2 — Ledger core  *(done: `internal/ledger`)*
- Accounts (owner, currency, billing rules), categories (merge, delete, `created_by`), transactions CRUD, bulk update, pagination caps.
- Acceptance: category delete/merge re-points transactions in one database transaction.

## Phase 3 — Import  *(done: importer core, Leumi bank export, Cal / Isracard / Leumi-card PDFs, CSV mapper; wiring into the HTTP API comes with Phase 8)*
- Encoding detection (BOM, `utf8.Valid`, Windows-1255), format-aware date parser, column mapper (no saved presets in v1).
- Tag each card charge `LOCAL`/`FOREIGN`; keep the issuer's bill date from the file.
- Dedup key by in-file ordinal; batches + undo; stage/commit API.
- Isracard/Cal/Leumi PDF parsers rewritten on positioned cells behind the same importer interface. No LLM text-repair step: it only compensated for the old line-based extraction and was slow.
- Acceptance: import-twice-inserts-zero property test; BOM/emoji/Windows-1255/`MM/DD/YYYY` fixtures; PDF fixture tests from `data/*.pdf`.

## Phase 4 — Categorization  *(done: `internal/llm`, `internal/categorize`; HTTP/config wiring comes with Phase 8)*
- Categorization runs: classifier model picks an existing category with confidence; ≥ 0.75 applies; otherwise the generator model creates (or reuses by name) a category. Records model, confidence and run id; batching, retry, cancel, run-scoped state; run undo.
- Identical payees (per direction) are asked once per run; employer-coverage lines are not sent to the models and inherit their purchase's category. A starter category set is seeded once on first start (`categorize.SeedOnce`).
- Acceptance (fake LLM servers): threshold behavior at 0.74/0.75; unknown ids ignored; new categories de-duplicated; manual categories never overwritten; undo restores state; cancel+restart does not leak state.

## Phase 5 — Card billing, statements and settlements  *(done: `internal/billing`; HTTP wiring comes with Phase 8)*
- Billing rules per card (scope, bill day, month offset, optional cutoff day), weekend shift, month-end clamping; issuer bill date from file overrides computed date. Only a Saturday bill date moves (to Sunday): the real bank data shows card debits on Fridays.
- Statements grouped by `(account, bill_date)`, including upcoming ones; settlement states UPCOMING/BILLED/PARTIAL/PAID; external payments.
- Auto-match proposals for unlinked, undecided bank debits; sticky manual decisions; payee hints from settings.
- Acceptance: the Isracard foreign case (September purchase → 2 November); the Cal local case around its cutoff day (9th vs 10th); a purchase on the 31st; leap-year February; re-running auto-match is idempotent and never touches manual links.

## Phase 6 — Reserved
- Formerly FX. Foreign-currency bank accounts and exchange rates moved to Phase 2 of the product (spec §15); this slot is free for overflow.

## Phase 7 — Reports  *(done: `internal/reports`, migration 0003 `ledger_view`; REST/MCP exposure comes with Phases 8-9)*
- `ledger_view` (SQL view) implementing §3; ten reports as functions over it; shared filter.
- Acceptance: reconciliation test — every report's total ties to the seeded ledger; transfers/settlements never double count.

## Phase 8 — Auth and API hardening  *(done: `internal/authn`, `internal/api`, `internal/settings`, `cmd/finrep`)*
- OIDC with real ID-token validation through go-oidc (issuer, audience, signature, expiry, nonce; PKCE and state handled here; allow-list is product Phase 2); signed sliding sessions with an absolute cap; same-origin check plus a per-session CSRF header; JSON-only bodies with size and unknown-field limits; upload caps; staged uploads bounded in count and age; settings allow-list with write-only secrets; trusted-proxy handling; `/healthz`.
- MCP routes are mounted by Phase 9 (they authenticate with the static bearer token, not a session).
- Acceptance: fake-OIDC integration test; forged-cookie and CSRF tests.

## Phase 9 — MCP  *(done: `internal/mcpsrv`, `internal/jsonx`; stdio via `--mode=mcp`, HTTP at `/mcp`)*
- Eight read-only tools over the same services; stdio and Streamable HTTP under `/mcp`; static bearer-token auth.
- Acceptance: integration tests list tools and call them over **both** transports.

## Phase 10 — Web UI
- Design pass first (type scale, spacing, colour tokens, light/dark, RTL rules) as a small static prototype for sign-off.
- Then build the views listed in spec §13 (including Cards & statements by owner and the upcoming-bills timeline) with an escaping-by-construction component layer, accessible charts, click-through filtering.
- Acceptance: browser smoke tests for import → categorize → settle → report; axe accessibility check; Hebrew/English bidi snapshot checks.

## Phase 11 — Packaging
- Embedded UI build, Dockerfile (non-root, healthcheck), compose example, Taskfile, README (setup, auth, backup/restore, importing, MCP client config).

## Decisions captured
- Rewrite in place on branch `rewrite`; clean DB with re-import from source files; frontend technology chosen on merit in Phase 10 and signed off via the prototype.
- Money: integer minor units with ISO 4217 code (`go-money` or a thin own type; decided in Phase 1).
- Cards: per-card billing rules with owner; issuer bill date from the file wins. Categorization: classifier ≥ 0.75, else generator creates a category; no suggestion queue. MCP: static bearer token. Net worth includes unsettled card liabilities.
- Not implemented in the old code, so deferred (spec §15): splits, rules, saved presets, widget registry, FX/foreign bank accounts, OIDC allow-list, multi-statement auto-match.

## Risks
- PDF parsing depends on bank layouts; keep fixtures and fail loudly with the offending line.
- Auto-match false positives; mitigated by proposals-first and sticky manual decisions.
- UI scope is the largest item; the prototype gate keeps rework small.
