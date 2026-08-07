# Implementation Plan: Financial Reporting Application

Build a self-hosted financial reporting application in Go 1.26 using **Echo** (`github.com/labstack/echo/v4`) and TypeScript + Tailwind CSS, featuring SQLite3 ledgers, issuer-billed credit card amounts, interactive CSV header mapping with `Windows-1255` character encoding auto-detection, LocalAI smart categorization (URL & API Key config & prompt playground), OIDC PKCE authentication (Cosmos OS reverse proxy trusted headers), customizable CLI flags (`--port`, `--log-level`, `--mode`, `--db-path`), dynamic `log/slog` structured tracing, a pluggable 10-report visual suite, MCP tool execution over Stdio and HTTP SSE via `mark3labs/mcp-go`, and **Taskfile.yaml** task automation.

---

## User Review Required

> [!IMPORTANT]
> All specifications have been updated directly in your project repository at [`docs/SPECIFICATION.md`](SPECIFICATION.md).
>
> Key technical additions confirmed per your latest feedback:
> 1. **CLI Flag Configuration**: `--port` (custom listening port, default `8080`), `--log-level` (`debug`, `info`, `warn`, `error`, default `info`), `--mode` (`web`, `mcp`), `--db-path`.
> 2. **Granular `log/slog` Tracing**: Structured Debug-level tracing logs incorporated across:
>    - SQL query duration and affected row counts.
>    - CSV encoding detection (`UTF-8` vs `Windows-1255`), column mapping, and duplicate hash skipping.
>    - Credit Card payment reconciliation candidate scoring logic.
>    - LocalAI raw prompt JSON payloads, latency, status codes, and category results.
>    - OIDC PKCE verifier/challenge generation and claims validation.
>    - MCP JSON-RPC/SSE tool invocations and execution timing.
> 3. **Go Version**: **Go 1.26** runtime confirmed.
> 4. **Web Framework**: **Labstack Echo** (`github.com/labstack/echo/v4`) with 100% standard `net/http` SSE streaming support via `echo.WrapHandler`.

---

## Proposed Changes

### Phase 1: Taskfile, CLI Flags & Core Database Engine (Go 1.26 + Echo)
- [NEW] `Taskfile.yaml`: Define tasks `build-ui`, `build`, `dev` (runs `--log-level=debug`), `run-mcp`, `test`, `docker-build`, `docker-up`.
- [MODIFY] `go.mod`: Target Go 1.26. Add Echo (`github.com/labstack/echo/v4`), `modernc.org/sqlite`, `github.com/mark3labs/mcp-go`, `golang.org/x/text`.
- [NEW] `internal/config/config.go`: Parse CLI flags (`--port`, `--log-level`, `--mode`, `--db-path`, `--oidc-enabled`) and environment variable overrides (`PORT`, `LOG_LEVEL`, `MODE`, `DB_PATH`).
- [NEW] `internal/logger/logger.go`: `log/slog` logger initialization with dynamic `slog.LevelVar` level configuration.
- [NEW] `internal/models/models.go`: Domain models for Accounts, Transactions (with `amount` billed and `original_amount`/`original_currency`), Categories (with `monthly_budget`), Settings (LocalAI URL/Key), Transfers, Presets, and Rules.
- [NEW] `internal/database/database.go`: SQLite initialization (`modernc.org/sqlite`), WAL mode, DDL migrations, index creation, and SQL query tracing logs.
- [NEW] `internal/database/queries.go`: SQL CRUD, analytical aggregations, and budget variance queries with debug tracing.

---

### Phase 2: MCP Engine (`mark3labs/mcp-go` Stdio + Echo HTTP SSE)
- [NEW] `internal/mcp/server.go`: Initializes MCP server instance using `mark3labs/mcp-go`. Registers financial tools (`list_accounts`, `get_account_summary`, `query_transactions`, `get_net_worth_trend`, `get_category_breakdown`, `get_subscriptions`) with debug call tracing.
- [NEW] `internal/mcp/stdio.go`: Stdio transport handler (`--mode=mcp`).
- [NEW] `internal/mcp/sse.go`: HTTP SSE transport handler mounted natively on Echo router (`e.GET("/mcp/sse", echo.WrapHandler(...))` and `e.POST("/mcp/messages", echo.WrapHandler(...))`).

---

### Phase 3: Echo Web Server & OIDC PKCE Security
- [NEW] `cmd/server/main.go`: Application bootstrap parsing CLI flags, configuring Echo router, `slog` middleware logging, Cosmos OS reverse proxy trust (`IPExtractor`), embedded Vite static files, and customizable port listener (`--port`).
- [NEW] `internal/auth/pkce.go`: OAuth2 PKCE state generator, SHA-256 verifier/challenge logic, and auth debug tracing.
- [NEW] `internal/auth/authentik.go`: OIDC token exchange client & session cookie manager.
- [NEW] `internal/handlers/handlers.go`: Echo handlers for Accounts, Transactions, Categories, CSV Imports, Transfers, LocalAI Models/Playground, OIDC config info, and Report Widgets.

---

### Phase 4: Business Logic & CSV Encoding Parser
- [NEW] `internal/parser/csv.go`: Dynamic CSV header mapper, character encoding auto-detector (`golang.org/x/text` for `Windows-1255` / `CP1255` $\rightarrow$ UTF-8 conversion), preset manager, SHA-256 hash deduplication, and parser tracing logs.
- [NEW] `internal/services/reconciliation.go`: Bank-to-Credit Card payment heuristic auto-matcher ($\pm 3$ days, $|Debit| = Credit$, confidence scoring) with candidate score tracing.
- [NEW] `internal/localai/client.go`: Go REST client for LocalAI (`GET /v1/models` with API Key, `/v1/chat/completions` categorization) with raw prompt payload & latency tracing logs.
- [NEW] `internal/services/reports.go`: Data providers for all 10 visual reports (Net worth, Cash flow, Category Donut, Sankey, Budget vs Actual, Subscriptions, Month-over-Month matrix, CC Payoff, Foreign Billed Costs, Anomaly detector).

---

### Phase 5: Tailwind CSS + TypeScript Frontend (Pluggable Dashboard & 7 Views)
- [NEW] `web/package.json`, `web/vite.config.ts`, `web/tailwind.config.js`: Vite + TypeScript + Tailwind CSS setup.
- [NEW] `web/src/styles/main.css`: Tailwind CSS directives, glassmorphic styling, and BiDi UTF-8 Hebrew font support.
- [NEW] `web/src/widgets/`: Pluggable `DashboardWidget` implementations (NetWorth, CashFlow, CategoryDonut, Sankey, BudgetVsActual, Subscriptions, MoMTrend, CCPayoff, ForeignCurrency, AnomalyDetector).
- [NEW] `web/src/components/`: Modular UI components (`Navbar`, `AccountCard`, `TransactionTable` displaying original foreign currency alongside card-billed amount, `CSVImporter` with interactive column mapper & encoding selector, `TransferMatcher`, `PromptPlayground`, `OIDCCopyBox`).
- [NEW] `web/src/views/`:
  1. `DashboardView.ts`: Pluggable widget grid container & widget store modal.
  2. `AccountsView.ts`: Account grid, native balances, credit limit utilization, add/edit account modal.
  3. `TransactionsView.ts`: Filterable UTF-8 ledger table, search, multi-select batch actions.
  4. `ImportView.ts`: Drag & drop zone, interactive CSV column mapper, preset manager for Bank Hapoalim / Max / Isracard, duplicate hash review.
  5. `ReconciliationView.ts`: Bank-to-CC payment candidate matcher, confidence score indicator, 1-click link/unlink.
  6. `SettingsView.ts`: LocalAI status & URL/API Key configuration, `/v1/models` dropdown, prompt template editor & playground, OIDC Authentik config with copyable redirect URL box, category/rule tree editor, MCP SSE endpoint copy box (`/mcp/sse`).
  7. `ExportsView.ts`: Data export (CSV/JSON), full 10-report visual analytics suite.

---

### Phase 6: Docker Containerization
- [NEW] `Dockerfile`: Multi-stage build (Node 20 Vite + Tailwind build $\rightarrow$ Go 1.26 CGO-free static build $\rightarrow$ Alpine runtime).
- [NEW] `docker-compose.yml`: Container configuration with persistent SQLite data volume and LocalAI network bridge.

---

## Verification Plan

### Automated Tests
- `task test` - Run all Go unit and integration tests via Taskfile.
- `task build-ui` - Verify TypeScript and Tailwind CSS frontend build via Taskfile.
- `task build` - Verify full single-binary compilation via Taskfile.

### Manual Verification
- Execute `task dev` (runs `--port=8080 --log-level=debug`) to launch application and verify `log/slog` JSON debug tracing logs on stdout.
- Run with custom port `--port=9090` and verify HTTP server binds to port 9090.
- Test CSV upload with Israeli bank exports in `Windows-1255` encoding and verify `slog.Debug` tracing log output for character encoding detection.
- Test LocalAI categorization call and inspect `slog.Debug` tracing log for raw prompt JSON payload and latency.
- Test HTTP SSE MCP endpoint (`http://localhost:8080/mcp/sse`) via `echo.WrapHandler` with an SSE client / LocalAI agent and check MCP tracing logs.
- Execute `task run-mcp` to test Stdio MCP tool execution.
