# Implementation Plan: Financial Reporting Application

Build a self-hosted financial reporting application in Go 1.26 using **Echo** (`github.com/labstack/echo/v4`) and TypeScript + Tailwind CSS, featuring SQLite3 ledgers with versioned migrations, issuer-billed credit card amounts, 1-to-many statement payment reconciliation, Israeli installment tracking ("תשלומים"), transaction splits, interactive CSV header mapping with `Windows-1255` character encoding auto-detection, LocalAI batch categorization (25 items/request) with **AI New Category Suggestions & User Approval Workflow**, single-tenant OIDC PKCE authentication (with `--oidc-enabled=false` dev bypass), customizable CLI flags (`--port`, `--log-level`, `--mode`, `--db-path`, `--oidc-enabled`), dynamic `log/slog` structured tracing, a pluggable 10-report visual suite, MCP tool execution over Stdio and HTTP SSE via `mark3labs/mcp-go`, and **Taskfile.yaml** task automation.

---

## User Review Required

> [!IMPORTANT]
> All specifications have been updated directly in your project repository at [`docs/SPECIFICATION.md`](SPECIFICATION.md).
>
> Architectural enhancements incorporated per your latest request:
> 1. **AI New Category Suggestions**: LocalAI batch prompt updated to suggest a new category (with Hebrew/English names) if no existing category matches an input transaction.
> 2. **Suggested Category Pending Fields**: Added `suggested_category_he`, `suggested_category_en`, and `suggested_category_type` to `transactions` table.
> 3. **User Approval & Creation Flow**: UI displays visual suggestion cards in the review drawer (`[ Accept & Create Category ]` / `[ Reject / Select Existing ]`). Accepting creates the category in SQLite and links the transaction.

---

## Proposed Changes

### Phase 1: Taskfile, Database Migrations & Core Engine (Go 1.26 + Echo)
- [NEW] `Taskfile.yaml`: Define tasks `build-ui`, `build`, `dev` (runs `--log-level=debug --oidc-enabled=false`), `run-mcp`, `test`, `docker-build`, `docker-up`.
- [MODIFY] `go.mod`: Target Go 1.26. Add Echo (`github.com/labstack/echo/v4`), `modernc.org/sqlite`, `github.com/mark3labs/mcp-go`, `golang.org/x/text`.
- [NEW] `internal/config/config.go`: Parse CLI flags (`--port`, `--log-level`, `--mode`, `--db-path`, `--oidc-enabled`) and environment variable overrides (`PORT`, `LOG_LEVEL`, `MODE`, `DB_PATH`).
- [NEW] `internal/logger/logger.go`: `log/slog` logger initialization with dynamic `slog.LevelVar` level configuration.
- [NEW] `internal/models/models.go`: Domain models for Accounts, Transactions (with `amount`, `original_amount`, `current_installment`, `total_installments`, `suggested_category_he`, `suggested_category_en`), Transaction Splits, Categories, Settings, Transfers, Presets, and Rules.
- [NEW] `internal/database/migrations.go`: Versioned DDL migration runner (`schema_migrations` table).
- [NEW] `internal/database/database.go`: SQLite initialization (`modernc.org/sqlite`), WAL mode, migrations trigger, and query tracing logs.
- [NEW] `internal/database/queries.go`: SQL CRUD, category creation from suggestion, split transactions, and statement aggregation queries.

---

### Phase 2: MCP Engine (`mark3labs/mcp-go` Stdio + Echo HTTP SSE)
- [NEW] `internal/mcp/server.go`: Initializes MCP server instance using `mark3labs/mcp-go`. Registers financial tools (`list_accounts`, `get_account_summary`, `query_transactions`, `get_net_worth_trend`, `get_category_breakdown`, `get_subscriptions`) with debug call tracing.
- [NEW] `internal/mcp/stdio.go`: Stdio transport handler (`--mode=mcp`).
- [NEW] `internal/mcp/sse.go`: HTTP SSE transport handler mounted natively on Echo router (`e.GET("/mcp/sse", echo.WrapHandler(...))` and `e.POST("/mcp/messages", echo.WrapHandler(...))`). Exclude `/mcp/` path from Echo response gzip compression & buffering to ensure unbuffered real-time event streaming.

---

### Phase 3: Echo Web Server & OIDC PKCE Security (Dev Bypass)
- [NEW] `cmd/server/main.go`: Application bootstrap parsing CLI flags, configuring Echo router, `slog` middleware logging, Cosmos OS reverse proxy trust (`IPExtractor`), embedded Vite static files, and customizable port listener (`--port`).
- [NEW] `internal/auth/middleware.go`: Echo session middleware supporting Authentik OIDC PKCE redirect flow and dev bypass mode (`--oidc-enabled=false` auto-injecting local admin context).
- [NEW] `internal/auth/pkce.go`: OAuth2 PKCE state generator, SHA-256 verifier/challenge logic.
- [NEW] `internal/handlers/handlers.go`: Echo handlers for Accounts, Transactions, Category Suggestions Accept/Reject, Splits, Categories, CSV Imports, Transfers, LocalAI Models/Playground, OIDC config info, and Report Widgets.

---

### Phase 4: Business Logic, LocalAI Category Suggestions & Reconciliation
- [NEW] `internal/parser/csv.go`: Dynamic CSV header mapper, character encoding auto-detector (`golang.org/x/text` for `Windows-1255` / `CP1255` $\rightarrow$ UTF-8 conversion), installment fields extractor, preset manager, SHA-256 hash deduplication (`SHA-256(account_id | date | amount | payee_raw | daily_occurrence_ordinal)`), and parser tracing logs.
- [NEW] `internal/services/reconciliation.go`: Bank-to-Credit Card 1-to-1 and 1-to-Many statement lump-sum payment heuristic auto-matcher ($\sum \text{amount}_{\text{cc}} = |\text{amount}_{\text{bank}}|$) enforcing strict single-reconciliation per credit card transaction (`UNIQUE(credit_card_transaction_id)`).
- [NEW] `internal/localai/batch.go`: Go REST batch categorization client for LocalAI (`POST /v1/chat/completions` sending 25 items per request) with markdown codeblock stripping (` ```json `) parsing category ID matches and `suggested_category` objects.
- [NEW] `internal/services/reports.go`: Data providers for all 10 visual reports (Net worth, Cash flow, Category Donut, Sankey, Budget vs Actual, Subscriptions, Month-over-Month matrix, CC Payoff, Foreign Billed Costs, Anomaly detector).

---

### Phase 5: Tailwind CSS + TypeScript Frontend (Pluggable Dashboard & 7 Views)
- [NEW] `web/package.json`, `web/vite.config.ts`, `web/tailwind.config.js`: Vite + TypeScript + Tailwind CSS setup.
- [NEW] `web/src/styles/main.css`: Tailwind CSS directives, glassmorphic styling, and BiDi UTF-8 Hebrew font support.
- [NEW] `web/src/widgets/`: Pluggable `DashboardWidget` implementations (NetWorth, CashFlow, CategoryDonut, Sankey, BudgetVsActual, Subscriptions, MoMTrend, CCPayoff, ForeignCurrency, AnomalyDetector).
- [NEW] `web/src/components/`: Modular UI components (`Navbar`, `AccountCard`, `TransactionTable` displaying installments and pending AI category suggestion cards, `CategorySuggestionCard` with 1-click Accept/Reject buttons, `CSVImporter`, `TransferMatcher`, `PromptPlayground`, `OIDCCopyBox`).
- [NEW] `web/src/views/`:
  1. `DashboardView.ts`: Pluggable widget grid container & widget store modal.
  2. `AccountsView.ts`: Account grid, native balances, credit limit utilization, add/edit account modal.
  3. `TransactionsView.ts`: Filterable UTF-8 ledger table, search, multi-select batch actions, installment pills, pending AI category suggestion approval cards.
  4. `ImportView.ts`: Drag & drop zone, interactive CSV column mapper, preset manager for Bank Hapoalim / Max / Isracard, duplicate hash review.
  5. `ReconciliationView.ts`: Bank-to-CC payment candidate matcher (1-to-1 and 1-to-Many statement cycles), 1-click link/unlink.
  6. `SettingsView.ts`: LocalAI status & URL/API Key configuration, `/v1/models` dropdown, prompt template editor & playground, OIDC Authentik config with copyable redirect URL box, category/rule tree editor, MCP SSE endpoint copy box (`/mcp/sse`).
  7. `ExportsView.ts`: Data export (CSV/JSON), full 10-report visual analytics suite.

---

### Phase 6: Docker Containerization
- [NEW] `Dockerfile`: Multi-stage build (Node 20 Vite + Tailwind build $\rightarrow$ Go 1.26 CGO-free static build $\rightarrow$ Alpine runtime).
- [NEW] `docker-compose.yml`: Container configuration with persistent SQLite data volume and LocalAI network bridge.

---

## Verification Plan

### Automated Tests
- `task test` - Run all Go unit and integration tests (LocalAI category suggestion JSON parsing, category creation handler, migrations, DB queries, reconciliation heuristics, CSV parser).
- `task build-ui` - Verify TypeScript and Tailwind CSS frontend build via Taskfile.
- `task build` - Verify full single-binary compilation via Taskfile.

### Manual Verification
- Execute `task dev` to launch application.
- Trigger LocalAI batch categorization on a transaction with an unknown merchant name (e.g., "קייטנת ספורט").
- Verify that LocalAI returns a `suggested_category` object with Hebrew and English names.
- In the UI Transactions view, verify the AI Category Suggestion card appears with `[ Accept & Create Category ]`.
- Click `[ Accept & Create Category ]`, verify new category is created in SQLite and assigned to the transaction.
