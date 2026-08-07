# Implementation Plan: Financial Reporting Application

Build a self-hosted financial reporting application in Go 1.26 using **Fiber/v3** and TypeScript + Tailwind CSS, featuring SQLite3 ledgers, issuer-billed credit card amounts, LocalAI smart categorization (URL & API Key config & prompt playground), OIDC PKCE authentication (Cosmos OS reverse proxy trusted headers), `log/slog` structured logging, a pluggable 10-report visual suite, MCP tool execution over Stdio and HTTP SSE via `mark3labs/mcp-go`, and **Taskfile.yaml** task automation.

---

## User Review Required

> [!IMPORTANT]
> All specifications have been updated directly in your project repository at [`SPECIFICATION.md`](file:///path/to/data).
>
> Key technical choices confirmed per your feedback:
> 1. **Task Automation**: **`Taskfile.yaml`** (`go-task`) replaces Makefile for build, dev, test, and container orchestration.
> 2. **Web Framework**: **Go Fiber/v3** (`github.com/gofiber/fiber/v3`) with standard middleware filters.
> 3. **Structured Logging**: Standard Go 1.26 `log/slog` formatted JSON/text logs to stdout/stderr.
> 4. **Reverse Proxy Trust**: Configured for **Cosmos OS** reverse proxy with TLS offloading and `X-Forwarded-*` header trusting.
> 5. **MCP Framework**: Built using `github.com/mark3labs/mcp-go` supporting both **Stdio** mode and **HTTP SSE** endpoint (`/mcp/sse`) for LocalAI model access.
> 6. **Credit Card Currency Rule**: Bank accounts are single currency. Credit card foreign transactions store both original amount and exact card-issuer billed amount (including issuer fees) directly from statement exports—no synthetic app conversions.

---

## Proposed Changes

### Phase 1: Taskfile & Core Database Engine (Go 1.26 + Fiber/v3)
- [NEW] `Taskfile.yaml`: Define tasks `build-ui`, `build`, `dev`, `run-mcp`, `test`, `docker-build`, `docker-up`.
- [MODIFY] `go.mod`: Add Fiber/v3 (`github.com/gofiber/fiber/v3`), `modernc.org/sqlite`, `github.com/mark3labs/mcp-go`.
- [NEW] `internal/models/models.go`: Domain models for Accounts, Transactions (with `amount` billed and `original_amount`/`original_currency`), Categories (with `monthly_budget`), Settings (LocalAI URL/Key), Transfers, Presets, and Rules.
- [NEW] `internal/database/database.go`: SQLite initialization (`modernc.org/sqlite`), WAL mode, DDL migrations, and index creation.
- [NEW] `internal/database/queries.go`: SQL CRUD, analytical aggregations, and budget variance queries.
- [NEW] `internal/logger/logger.go`: `log/slog` structured logger initialization for Fiber v3.

---

### Phase 2: MCP Engine (`mark3labs/mcp-go` Stdio + HTTP SSE)
- [NEW] `internal/mcp/server.go`: Initializes MCP server instance using `mark3labs/mcp-go`. Registers financial tools (`list_accounts`, `get_account_summary`, `query_transactions`, `get_net_worth_trend`, `get_category_breakdown`, `get_subscriptions`).
- [NEW] `internal/mcp/stdio.go`: Stdio transport handler (`--mode=mcp`).
- [NEW] `internal/mcp/sse.go`: HTTP SSE transport handler mounted on Fiber router (`/mcp/sse` and `/mcp/messages`).

---

### Phase 3: Fiber/v3 Web Server & OIDC PKCE Security
- [NEW] `cmd/server/main.go`: Application bootstrap configuring Fiber v3 app, `slog` logging, Cosmos OS reverse proxy trust (`TrustProxy: true`), embedded Vite static files, and routes.
- [NEW] `internal/auth/pkce.go`: OAuth2 PKCE state generator, SHA-256 verifier/challenge logic.
- [NEW] `internal/auth/authentik.go`: OIDC token exchange client & session cookie manager.
- [NEW] `internal/handlers/handlers.go`: Fiber v3 handlers for Accounts, Transactions, Categories, CSV Imports, Transfers, LocalAI Models/Playground, OIDC config info, and Report Widgets.

---

### Phase 4: Business Logic & Report Providers
- [NEW] `internal/parser/csv.go`: Dynamic CSV parser, Israeli bank & credit card format auto-detector (Bank Hapoalim, Leumi, Max, Isracard, Cal), and SHA-256 hash deduplication.
- [NEW] `internal/services/reconciliation.go`: Bank-to-Credit Card payment heuristic auto-matcher ($\pm 3$ days, $|Debit| = Credit$, confidence scoring).
- [NEW] `internal/localai/client.go`: Go REST client for LocalAI (`GET /v1/models` with API Key, `/v1/chat/completions` categorization).
- [NEW] `internal/services/reports.go`: Data providers for all 10 visual reports (Net worth, Cash flow, Category Donut, Sankey, Budget vs Actual, Subscriptions, Month-over-Month matrix, CC Payoff, Foreign Billed Costs, Anomaly detector).

---

### Phase 5: Tailwind CSS + TypeScript Frontend (Pluggable Dashboard & 7 Views)
- [NEW] `web/package.json`, `web/vite.config.ts`, `web/tailwind.config.js`: Vite + TypeScript + Tailwind CSS setup.
- [NEW] `web/src/styles/main.css`: Tailwind CSS directives, glassmorphic styling, and BiDi UTF-8 Hebrew font support.
- [NEW] `web/src/widgets/`: Pluggable `DashboardWidget` implementations (NetWorth, CashFlow, CategoryDonut, Sankey, BudgetVsActual, Subscriptions, MoMTrend, CCPayoff, ForeignCurrency, AnomalyDetector).
- [NEW] `web/src/components/`: Modular UI components (`Navbar`, `AccountCard`, `TransactionTable` displaying original foreign currency alongside card-billed amount, `CSVImporter`, `TransferMatcher`, `PromptPlayground`, `OIDCCopyBox`).
- [NEW] `web/src/views/`:
  1. `DashboardView.ts`: Pluggable widget grid container & widget store modal.
  2. `AccountsView.ts`: Account grid, native balances, credit limit utilization, add/edit account modal.
  3. `TransactionsView.ts`: Filterable UTF-8 ledger table, search, multi-select batch actions.
  4. `ImportView.ts`: Drag & drop zone, CSV mapper preview, preset manager for Bank Hapoalim / Max / Isracard, duplicate hash review.
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
- Execute `task dev` to launch application with `--mode=web` and verify `log/slog` structured JSON logs on stdout.
- Verify reverse proxy headers under Cosmos OS simulation (`X-Forwarded-Proto`, `X-Forwarded-Host`).
- Test HTTP SSE MCP endpoint (`http://localhost:8080/mcp/sse`) with an SSE client / LocalAI agent.
- Execute `task run-mcp` to test Stdio MCP tool execution.
- Open OIDC Settings, verify copyable Redirect URL box (`https://<COSMOS_DOMAIN>/api/v1/auth/callback`).
