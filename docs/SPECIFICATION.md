# Functional & Technical Specification: Financial Reporting & Ledger Application

## 1. Executive Summary & Core Requirements

This document presents the complete technical and functional specification for a self-hosted financial reporting application designed to track bank accounts and credit cards, import statement CSVs, auto-categorize transactions using a local **LocalAI** instance, reconcile inter-account payments (such as bank accounts paying credit card bills), authenticate securely via **OIDC (PKCE)** against **Authentik**, provide rich pluggable visual financial analytics, support multi-currency credit card statements using issuer-billed amounts, offer an **MCP (Model Context Protocol)** server interface over both Stdio and HTTP SSE (via `mark3labs/mcp-go`), and utilize **Taskfile.yaml** (`go-task`) for build automation.

### 1.1 Requirements Matrix

| # | Requirement | Implementation Specification |
|---|---|---|
| 1 | **Local Database** | **SQLite3** (`modernc.org/sqlite`, CGO-free, WAL mode) with SQL analytical functions, strict foreign key constraints, and multi-currency ledger schemas. |
| 2 | **Browser-Based UI & Pluggable Dashboard** | **TypeScript + HTML5 + Tailwind CSS** (Vite build pipeline). Full UTF-8 and Hebrew/English BiDi support (`dir="rtl"`). Pluggable modular widget registry for the dashboard. |
| 3 | **Language & Web Framework** | **Go 1.26** backend using **Fiber/v3** framework (`github.com/gofiber/fiber/v3`) with structured logging (`log/slog`) and middleware filters. |
| 4 | **Task Automation** | **Taskfile.yaml** (`go-task`) for project task runner (building, running dev mode, testing, docker tasks). |
| 5 | **Reverse Proxy & TLS Offloading** | Designed to sit behind a local **Cosmos OS** reverse proxy handling TLS termination. Fiber configured to trust `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For`. |
| 6 | **Docker Support** | Multi-stage `Dockerfile` creating a single-binary container with embedded static assets (`go:embed`) and `docker-compose.yml`. |
| 7 | **OIDC PKCE Authentication** | OAuth 2.0 Authorization Code flow with **PKCE** via Fiber OIDC middleware targeting local **Authentik** OIDC provider with copyable Redirect URL display. |
| 8 | **CSV Data Import Interface** | Interactive CSV mapper supporting arbitrary column layouts (including Israeli bank and credit card exports), preset saving per institution, and SHA-256 hash deduplication. |
| 9 | **Bank vs Credit Card Currencies** | **Bank accounts**: strictly single currency per account. **Credit Card accounts**: Billed amounts explicitly provided by card issuers (including fees) are stored directly; no synthetic app-side rate conversion is computed. |
| 10 | **Inter-Account Payment Reconciliation** | Heuristic matching algorithm linking Bank debits with Credit Card credits to prevent double-counting expenses in financial reports. |
| 11 | **LocalAI Categorization & Prompt Tuning** | Go REST client communicating with LocalAI (`/v1/chat/completions`). Supports Base URL and API Key configuration. Config UI dynamically populates models via `GET /v1/models` and displays customizable prompts. |
| 12 | **Comprehensive Report Suite** | Pluggable reports: Net Worth, Cash Flow, Category Donut, Sankey Flow, Budget vs Actual, Subscriptions/Fixed vs Variable, Month-over-Month Heatmap, CC Payoff Calculator, Foreign Currency Billed Analysis, Anomaly Detector. |
| 13 | **MCP Framework (Stdio + HTTP SSE)** | Uses standard Go MCP library (`github.com/mark3labs/mcp-go`). Supports Stdio mode AND HTTP Server-Sent Events (SSE) endpoint (`/mcp/sse`) for LocalAI model tool integration. |

---

## 2. System Architecture & Task Automation

### 2.1 Task Automation (`Taskfile.yaml`)
Instead of a legacy Makefile, task orchestration uses `go-task` (`Taskfile.yaml`):

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
    desc: Run development environment
    cmds:
      - go run ./cmd/server/main.go --mode=web

  run-mcp:
    desc: Run application in Stdio MCP mode
    cmds:
      - go run ./cmd/server/main.go --mode=mcp

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

## 3. Bank vs. Credit Card Currency Handling Rules

### 3.1 Bank Account Ledger Strategy
* Bank accounts are tied strictly to a single native currency (e.g. Bank Hapoalim checking is strictly `ILS`).
* Bank transactions are recorded in that account's native currency.

### 3.2 Credit Card Account Ledger Strategy
* Credit Card statements (such as Max, Isracard, Cal, Visa, Mastercard) often feature transactions made in foreign currencies (e.g., buying a digital subscription in USD or EUR).
* Credit card issuers explicitly bill the exact final amount in the account's home currency (e.g. `ILS`), which includes the issuer's foreign exchange fee and conversion rate.
* **App Ledger Rule**: For Credit Card transactions, the application stores **BOTH**:
  1. `original_amount` & `original_currency` (e.g. `$100.00 USD`).
  2. `billed_amount` (e.g. `₪374.50 ILS`) as explicitly provided by the credit card CSV export.
* **No Synthetic Conversion**: The application does **NOT** attempt to dynamically estimate or overwrite foreign exchange conversions for credit card purchases; it relies strictly on the card issuer's billed numbers.

---

## 4. Database Schema (SQLite3)

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

## 5. LocalAI, OIDC, and Structured Logging Specifications

### 5.1 Structured Logging with `log/slog`
* In Web UI mode, Fiber v3 uses Go 1.26 `log/slog` for structured logging:
```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
slog.SetDefault(logger)
```
* Logs HTTP requests, authentication events, LocalAI queries, and CSV parsing errors with key-value fields (`path`, `method`, `status`, `latency`, `account_id`, `error`).

### 5.2 LocalAI Configuration (URL & API Key)
* `localai_url`: Base URL (default: `http://localhost:8080`).
* `localai_api_key`: Optional API Key / Bearer Token.
* Sent with header `Authorization: Bearer <LOCALAI_API_KEY>` when querying `/v1/models` and `/v1/chat/completions`.

### 5.3 OIDC Authentik Settings & Copyable Redirect URL
* Designed to run behind **Cosmos OS** reverse proxy.
* OIDC Settings page displays the calculated callback URL:
  * `https://<YOUR_COSMOS_DOMAIN>/api/v1/auth/callback`
  * Includes a **1-Click Copy Button** for copying directly into Authentik's OIDC Provider configuration.

---

## 6. MCP Integration via `mark3labs/mcp-go`

The application imports `github.com/mark3labs/mcp-go` to serve Model Context Protocol tools:

```go
import (
    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
)
```

---

## 7. Summary & Location

This specification document is stored directly in your project folder at:
`file:///path/to/data`
