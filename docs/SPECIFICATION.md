# Functional & Technical Specification: Financial Reporting & Ledger Application

## 1. Executive Summary & Core Requirements

This document presents the complete technical and functional specification for a self-hosted financial reporting application designed to track bank accounts and credit cards, import statement CSVs with flexible column mapping and character encoding detection, auto-categorize transactions using a local **LocalAI** instance, reconcile inter-account payments (such as bank accounts paying credit card bills), authenticate securely via **OIDC (PKCE)** against **Authentik**, provide rich pluggable visual financial analytics, support multi-currency credit card statements using issuer-billed amounts, offer an **MCP (Model Context Protocol)** server interface over both Stdio and HTTP SSE (via `mark3labs/mcp-go`), use **Labstack Echo** for HTTP routing, feature customizable CLI flags (`--port`, `--log-level`, `--mode`, `--db-path`) with granular `log/slog` tracing, and utilize **Taskfile.yaml** (`go-task`) for build automation.

### 1.1 Requirements Matrix

| # | Requirement | Implementation Specification |
|---|---|---|
| 1 | **Local Database** | **SQLite3** (`modernc.org/sqlite`, CGO-free, WAL mode) with SQL analytical functions, strict foreign key constraints, and multi-currency ledger schemas. |
| 2 | **Browser-Based UI & Pluggable Dashboard** | **TypeScript + HTML5 + Tailwind CSS** (Vite build pipeline). Full UTF-8 and Hebrew/English BiDi support (`dir="rtl"`). Pluggable modular widget registry for the dashboard. |
| 3 | **Language & Web Framework** | **Go 1.26** backend using **Echo** framework (`github.com/labstack/echo/v4`). |
| 4 | **CLI Configuration & Logging** | Flag & Environment variable support: `--port` (default: 8080), `--log-level` (`debug`, `info`, `warn`, `error`), `--mode` (`web`, `mcp`), `--db-path`. Dynamic `log/slog` structured tracing. |
| 5 | **Task Automation** | **Taskfile.yaml** (`go-task`) for project task runner (building, running dev mode, testing, docker tasks). |
| 6 | **Reverse Proxy & TLS Offloading** | Designed to sit behind a local **Cosmos OS** reverse proxy handling TLS termination. Echo configured to trust `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For`. |
| 7 | **Docker Support** | Multi-stage `Dockerfile` creating a single-binary container with embedded static assets (`go:embed`) and `docker-compose.yml`. |
| 8 | **OIDC PKCE Authentication** | OAuth 2.0 Authorization Code flow with **PKCE** via standard session middleware targeting local **Authentik** OIDC provider with copyable Redirect URL display. |
| 9 | **CSV Column Mapper & Charset Engine** | Interactive CSV mapper supporting arbitrary column header mapping (Date, Payee, Billed Amount, Debit, Credit, Foreign Amount, Currency, Category, Notes). Automatic encoding detection (`UTF-8` and `Windows-1255` / `CP1255`), preset saving, and SHA-256 hash deduplication. |
| 10 | **Bank vs Credit Card Currencies** | **Bank accounts**: strictly single currency per account. **Credit Card accounts**: Billed amounts explicitly provided by card issuers (including fees) are stored directly; no synthetic app-side rate conversion is computed. |
| 11 | **Inter-Account Payment Reconciliation** | Heuristic matching algorithm linking Bank debits with Credit Card credits to prevent double-counting expenses in financial reports. |
| 12 | **LocalAI Categorization & Prompt Tuning** | Go REST client communicating with LocalAI (`/v1/chat/completions`). Supports Base URL and API Key configuration. Config UI dynamically populates models via `GET /v1/models` and displays customizable prompts. |
| 13 | **Comprehensive Report Suite** | Pluggable reports: Net Worth, Cash Flow, Category Donut, Sankey Flow, Budget vs Actual, Subscriptions/Fixed vs Variable, Month-over-Month Heatmap, CC Payoff Calculator, Foreign Currency Billed Analysis, Anomaly Detector. |
| 14 | **MCP Framework (Stdio + HTTP SSE)** | Uses standard Go MCP library (`github.com/mark3labs/mcp-go`). Echo routes native `net/http` SSE handler (`GET /mcp/sse` and `POST /mcp/messages`) without buffering layers. |

---

## 2. Command Line Interface (CLI) Flags & Environment Variables

The application binary accepts the following CLI flags and corresponding environment variables:

| CLI Flag | Environment Var | Default Value | Allowed Values | Description |
|---|---|---|---|---|
| `--port` | `PORT` | `8080` | Any valid TCP port (e.g. `9090`) | HTTP server listening port in Web UI mode. |
| `--log-level` | `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` | Output verbosity for `log/slog` structured logger. |
| `--mode` | `MODE` | `web` | `web`, `mcp` | Operation mode (`web` serves Web UI & HTTP SSE MCP; `mcp` runs stdio MCP mode). |
| `--db-path` | `DB_PATH` | `./data/reporting.db` | Any valid file path | Path to SQLite database file. |
| `--oidc-enabled` | `OIDC_ENABLED` | `true` | `true`, `false` | Enable or disable OIDC authentication for dev/local use. |

---

## 3. Structured Logging & Tracing Strategy (`log/slog`)

Structured logging is implemented using Go 1.26 standard library `log/slog` with a dynamic `slog.LevelVar`.

### 3.1 Log Levels & Application Tracing Points

```
+---------------------------------------------------------------------------------------+
|  LOGGING LEVEL & TRACING STRATEGY                                                     |
+---------------------------------------------------------------------------------------+
|  ERROR: Unrecoverable failures (DB query failure, OIDC token rejection, LocalAI down) |
|  WARN:  Recoverable anomalies (CSV duplicate transaction skipped, low AI confidence)  |
|  INFO:  Lifecycle events (Server startup, Port configuration, Route hit, Import done)  |
|  DEBUG: Fine-grained tracing logs (SQL duration, CSV encoding, Payment candidate score)|
+---------------------------------------------------------------------------------------+
```

#### Detailed Tracing Invocations (`log-level=debug`):
1. **Database Layer Tracing**:
   * Logs query execution duration, row counts returned, and SQLite transaction commits/rollbacks.
   * `slog.Debug("SQL execution complete", "query", sql, "duration_ms", elapsed, "rows_affected", n)`
2. **CSV Importer & Charset Tracing**:
   * Logs file header detection, character encoding detected (`UTF-8` vs `Windows-1255`), column mapping dictionary applied, and SHA-256 hash collision checks.
   * `slog.Debug("CSV character encoding detected", "encoding", detectedCharset, "rows_parsed", totalRows, "duplicates_skipped", duplicateCount)`
3. **Credit Card Payment Reconciliation Tracing**:
   * Logs candidates evaluated, date proximity delta, amount equality match, and confidence calculation steps.
   * `slog.Debug("Evaluating payment candidate pair", "bank_tx_id", bID, "cc_tx_id", cID, "days_delta", deltaDays, "confidence_score", score)`
4. **LocalAI REST Client Tracing**:
   * Logs raw prompt JSON payload dispatched, LocalAI HTTP status code, API response latency, model ID, and returned category IDs.
   * `slog.Debug("LocalAI request dispatched", "model", modelID, "url", localAIURL, "latency_ms", latency, "status", statusCode)`
5. **OIDC PKCE Authentication Tracing**:
   * Logs PKCE state generation, SHA-256 code verifier/challenge pair creation, token exchange response claims validation, and session token generation.
   * `slog.Debug("OIDC token exchange complete", "subject", claims.Subject, "email", claims.Email)`
6. **MCP Tool Execution Tracing**:
   * Logs incoming JSON-RPC / SSE tool calls, parameters, execution duration, and result payloads.
   * `slog.Debug("MCP tool invoked", "tool_name", toolName, "args", jsonArgs, "duration_ms", elapsed)`

---

## 4. Web Framework Architecture (Labstack Echo)

### 4.1 Echo Setup with `log/slog` and CLI Config
```go
// Logger setup with dynamic level flag
var levelVar slog.LevelVar
// Parse --log-level flag ('debug', 'info', 'warn', 'error')
switch logLevelFlag {
case "debug":
    levelVar.Set(slog.LevelDebug)
case "warn":
    levelVar.Set(slog.LevelWarn)
case "error":
    levelVar.Set(slog.LevelError)
default:
    levelVar.Set(slog.LevelInfo)
}

logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: &levelVar,
}))
slog.SetDefault(logger)

e := echo.New()
e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
    LogStatus:   true,
    LogURI:      true,
    LogMethod:   true,
    LogLatency:  true,
    LogValuesFunc: func(c echo.Context, v middleware.RequestLoggerValues) error {
        slog.Info("HTTP Request",
            "method", v.Method,
            "uri", v.URI,
            "status", v.Status,
            "latency_ms", v.Latency.Milliseconds(),
        )
        return nil
    },
}))
```

---

## 5. CSV Dynamic Column Mapper & Encoding Detection

### 5.1 Target Schema Mapping Attributes

| Expected Target Attribute | Description | Required? |
|---|---|---|
| `date` | Transaction date (supports formats `DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`). | **Yes** |
| `payee_raw` | Merchant / transaction description string (supports Hebrew & English UTF-8). | **Yes** |
| `amount` | Account native currency billed amount (negative for debit, positive for credit). | **Yes** (or Debit+Credit) |
| `debit` | Separate debit amount column (converted to negative `amount`). | Optional |
| `credit` | Separate credit amount column (converted to positive `amount`). | Optional |
| `original_amount` | Foreign original transaction amount (e.g. `$100.00` for credit cards). | Optional |
| `original_currency` | Foreign original currency code (e.g. `USD`, `EUR`). | Optional |
| `category` | Imported category string (if present in CSV). | Optional |
| `notes` | Check number, reference ID, or memo notes. | Optional |

### 5.2 Character Set Auto-Detection (`golang.org/x/text`)
* Israeli banks (such as Bank Hapoalim, Leumi, Discount) often export CSV files in `Windows-1255` (CP1255) or `ISO-8859-8` character encodings.
* The Go CSV parser uses `golang.org/x/text/encoding/charmap` to detect non-UTF-8 character byte sequences.
* If `Windows-1255` bytes are detected, the reader automatically converts the input stream to UTF-8 before parsing headers and rows.

---

## 6. Bank vs. Credit Card Currency Handling Rules

### 6.1 Bank Account Ledger Strategy
* Bank accounts are tied strictly to a single native currency (e.g. Bank Hapoalim checking is strictly `ILS`).
* Bank transactions are recorded in that account's native currency.

### 6.2 Credit Card Account Ledger Strategy
* Credit Card statements (such as Max, Isracard, Cal, Visa, Mastercard) often feature transactions made in foreign currencies (e.g., buying a digital subscription in USD or EUR).
* Credit card issuers explicitly bill the exact final amount in the account's home currency (e.g. `ILS`), which includes the issuer's foreign exchange fee and conversion rate.
* **App Ledger Rule**: For Credit Card transactions, the application stores **BOTH**:
  1. `original_amount` & `original_currency` (e.g. `$100.00 USD`).
  2. `billed_amount` (e.g. `₪374.50 ILS`) as explicitly provided by the credit card CSV export.
* **No Synthetic Conversion**: The application does **NOT** attempt to dynamically estimate or overwrite foreign exchange conversions for credit card purchases; it relies strictly on the card issuer's billed numbers.

---

## 7. Database Schema (SQLite3)

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

-- Settings Table (Stores LocalAI URL, LocalAI API Key, System Prompt, Base Currency)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,                       
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,                       -- UUID v4
    name TEXT NOT NULL,                        -- e.g., "Bank Hapoalim Checking", "Max Executive"
    account_type TEXT NOT NULL CHECK(account_type IN ('BANK', 'CREDIT_CARD')),
    institution TEXT NOT NULL,                 -- e.g., "Bank Hapoalim", "Leumi", "Max", "Isracard"
    account_number_last4 TEXT,                 -- e.g., "9402"
    currency TEXT NOT NULL DEFAULT 'ILS',      -- Account native billing currency ('ILS', 'USD', 'EUR')
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    credit_limit DECIMAL(12,2) DEFAULT NULL,   -- Applicable for CREDIT_CARD
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,                       -- UUID v4
    name_he TEXT NOT NULL,                     -- Hebrew name (e.g. "קניות מזון")
    name_en TEXT NOT NULL,                     -- English name (e.g. "Groceries")
    parent_id TEXT,                            -- Parent category
    color_hex TEXT NOT NULL DEFAULT '#3B82F6',  -- Accent color
    icon TEXT NOT NULL DEFAULT 'tag',          -- Icon string
    category_type TEXT NOT NULL CHECK(category_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    monthly_budget DECIMAL(12,2) DEFAULT NULL, -- Target monthly budget in ILS
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- CSV Import Presets
CREATE TABLE IF NOT EXISTS import_presets (
    id TEXT PRIMARY KEY,                       -- UUID v4
    name TEXT NOT NULL,                        -- e.g., "Bank Hapoalim CSV", "Max Credit Card"
    account_id TEXT NOT NULL,
    date_column TEXT NOT NULL,                 
    date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    amount_column TEXT,                        -- Billed amount in account currency
    original_amount_column TEXT,               -- Foreign original amount (if present)
    original_currency_column TEXT,             -- Foreign currency code (if present)
    debit_column TEXT,                         
    credit_column TEXT,                        
    payee_column TEXT NOT NULL,                
    category_column TEXT,                      
    notes_column TEXT,                         
    has_header BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,                       -- UUID v4
    account_id TEXT NOT NULL,
    date DATE NOT NULL,                        -- ISO Format: YYYY-MM-DD
    amount DECIMAL(12,2) NOT NULL,             -- Billed amount in account's native currency (ILS)
    currency TEXT NOT NULL DEFAULT 'ILS',      -- Account currency
    original_amount DECIMAL(12,2),             -- Foreign original transaction amount (e.g. $100.00)
    original_currency TEXT,                    -- Foreign original currency code (e.g. 'USD')
    payee_raw TEXT NOT NULL,                   -- Original string from CSV (UTF-8 Hebrew/English)
    payee_cleaned TEXT,                        -- Cleaned merchant name
    category_id TEXT,
    notes TEXT,                                
    import_hash TEXT UNIQUE,                   -- SHA-256(account_id | date | amount | payee_raw)
    is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    categorized_by TEXT NOT NULL DEFAULT 'UNSET' CHECK(categorized_by IN ('UNSET', 'MANUAL', 'LOCALAI', 'RULE')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Inter-Account Transfer Reconciliation Table
CREATE TABLE IF NOT EXISTS account_transfers (
    id TEXT PRIMARY KEY,                       -- UUID v4
    bank_transaction_id TEXT NOT NULL UNIQUE,       -- Debit entry in Bank account
    credit_card_transaction_id TEXT NOT NULL UNIQUE,-- Credit entry in Credit Card account
    amount DECIMAL(12,2) NOT NULL,                  -- Transfer amount in base currency (ILS)
    match_confidence REAL NOT NULL DEFAULT 1.0,     -- 1.0 for manual, <1.0 for auto match
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bank_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(credit_card_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Keyword Rules Engine Table
CREATE TABLE IF NOT EXISTS categorization_rules (
    id TEXT PRIMARY KEY,                       -- UUID v4
    pattern TEXT NOT NULL,                      -- Substring/Regex match
    category_id TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(import_hash);
```

---

## 8. MCP Integration via `mark3labs/mcp-go` (Echo SSE Integration)

Echo routes `mark3labs/mcp-go` standard `net/http` handlers natively:

```go
sseServer := server.NewSSEServer(mcpServer, "/mcp/messages")
e.GET("/mcp/sse", echo.WrapHandler(http.HandlerFunc(sseServer.HandleSSE)))
e.POST("/mcp/messages", echo.WrapHandler(http.HandlerFunc(sseServer.HandleMessage)))
```

---

## 9. Task Automation (`Taskfile.yaml`)

```yaml
version: '3'

tasks:
  build-ui:
    desc: Build Vite & Tailwind CSS frontend assets
    dir: web
    cmds:
      - npm ci
      - npm run build

  build:
    desc: Build frontend and compile static Go single-binary
    deps: [build-ui]
    cmds:
      - CGO_ENABLED=0 go build -ldflags="-w -s" -o reporting ./cmd/server/main.go

  dev:
    desc: Run development environment with debug logging
    cmds:
      - go run ./cmd/server/main.go --mode=web --port=8080 --log-level=debug

  run-mcp:
    desc: Run application in Stdio MCP mode
    cmds:
      - go run ./cmd/server/main.go --mode=mcp --log-level=info

  test:
    desc: Run all Go unit and integration tests
    cmds:
      - go test -v ./...

  docker-build:
    desc: Build production Docker container
    cmds:
      - docker build -t money-reporting:latest .

  docker-up:
    desc: Run containerized stack with docker-compose
    cmds:
      - docker-compose up -d
```

---

## 10. Summary & Location

This specification document is stored directly in your project folder at:
`SPECIFICATION.md`
