# Functional & Technical Specification: Financial Reporting & Ledger Application

## 1. Executive Summary & Core Requirements

This document presents the complete technical and functional specification for a self-hosted financial reporting application designed to track bank accounts and credit cards, import statement CSVs with flexible column mapping and character encoding detection (`UTF-8` and `Windows-1255`), auto-categorize transactions using a local **LocalAI** instance with AI category suggestion approval workflows, reconcile inter-account payments (1-to-1 and 1-to-many statement lump-sum payments), authenticate securely via **OIDC (PKCE)** against **Authentik** (Single-Tenant guard), provide rich pluggable visual financial analytics, support multi-currency credit card statements using issuer-billed amounts and Bank account rate caching, offer an **MCP (Model Context Protocol)** server interface over both Stdio and HTTP SSE (via `mark3labs/mcp-go`), use **Labstack Echo** for HTTP routing, feature customizable CLI flags (`--port`, `--log-level`, `--mode`, `--db-path`, `--oidc-enabled`) with granular `log/slog` tracing, and utilize **Taskfile.yaml** (`go-task`) for build automation.

### 1.1 Requirements Matrix

| # | Requirement | Implementation Specification |
|---|---|---|
| 1 | **Local Database & Migrations** | **SQLite3** (`modernc.org/sqlite`, CGO-free, WAL mode) with SQL analytical functions, versioned DDL migration runner (`schema_migrations`), foreign key constraints, and multi-currency schemas. |
| 2 | **Browser-Based UI & Pluggable Dashboard** | **TypeScript + HTML5 + Tailwind CSS** (Vite build pipeline). Full UTF-8 and Hebrew/English BiDi support (`dir="rtl"`). Pluggable modular widget registry for the dashboard. |
| 3 | **Language & Web Framework** | **Go 1.26** backend using **Echo** framework (`github.com/labstack/echo/v4`). |
| 4 | **CLI Configuration & Logging** | Flag & Environment variable support: `--port` (default: 8080), `--log-level` (`debug`, `info`, `warn`, `error`), `--mode` (`web`, `mcp`), `--db-path`, `--oidc-enabled`. Dynamic `log/slog` structured tracing. |
| 5 | **Task Automation** | **Taskfile.yaml** (`go-task`) for project task runner (building, running dev mode, testing, docker tasks). |
| 6 | **Reverse Proxy & TLS Offloading** | Designed to sit behind a local **Cosmos OS** reverse proxy handling TLS termination. Echo configured to trust `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-For`. |
| 7 | **Single-Tenant OIDC PKCE Auth** | Single-tenant personal finance application guarded by OAuth 2.0 Authorization Code flow with **PKCE** via Authentik. Dev mode (`--oidc-enabled=false`) auto-injects local admin session. Copyable Redirect URL display. |
| 8 | **CSV Mapper, Charset & Installments** | Interactive CSV mapper supporting arbitrary column headers, automatic character encoding conversion (`Windows-1255` / `CP1255` $\rightarrow$ `UTF-8`), preset saving, installment tracking ("תשלומים"), and SHA-256 hash deduplication. |
| 9 | **Bank vs Credit Card Currencies** | **Bank accounts**: single currency with exchange rate cache fallback (`open.er-api.com` / Bank of Israel) for ILS net worth aggregations. **Credit Card accounts**: Billed amounts explicitly provided by card issuers (including fees) are stored directly; no synthetic app-side rate conversion is computed. |
| 10 | **Reconciliation & Split Transactions** | Supports both 1-to-1 payment matching and **1-to-Many statement lump-sum reconciliation** (linking 1 Bank debit to multiple Credit Card transactions). Supports multi-category transaction splits. |
| 11 | **LocalAI Categorization & New Category Suggestions** | Go REST client communicating with LocalAI (`/v1/chat/completions`) using batch requests (20–50 items). If no existing category fits, LocalAI suggests a new Hebrew/English category. User approval UI creates the category and applies it. |
| 12 | **Comprehensive Report Suite** | Pluggable reports: Net Worth, Cash Flow, Category Donut, Sankey Flow, Budget vs Actual, Subscriptions/Fixed vs Variable, Month-over-Month Heatmap, CC Payoff Calculator, Foreign Currency Billed Analysis, Anomaly Detector. |
| 13 | **MCP Framework (Stdio + HTTP SSE)** | Uses standard Go MCP library (`github.com/mark3labs/mcp-go`). Echo routes native `net/http` SSE handler (`GET /mcp/sse` and `POST /mcp/messages`) without buffering layers. |

---

## 2. LocalAI New Category Suggestion & User Approval Workflow

### 2.1 Updated System Prompt Specification
When prompting LocalAI for batch categorization, the system prompt explicitly instructs the LLM that it can either match an existing category ID or suggest a new category definition:

```text
You are a financial transaction categorization assistant specialized in Israeli and international transactions.
You understand Hebrew, English, and transliterated Hebrew merchant names.

For each transaction in the batch:
1. Match it to an existing category ID from the allowed list if a clear fit exists.
2. If NONE of the existing categories fits, leave 'category_id' as null and provide a 'suggested_category' object with proposed Hebrew and English names:
   {"name_he": "...", "name_en": "...", "category_type": "EXPENSE" | "INCOME" | "TRANSFER"}

Respond ONLY with valid JSON.
```

### 2.2 LocalAI REST Batch Response Payload Schema

```json
{
  "categorizations": [
    {
      "transaction_id": "tx-101",
      "category_id": "cat-3",
      "suggested_category": null,
      "confidence": 0.95
    },
    {
      "transaction_id": "tx-102",
      "category_id": null,
      "suggested_category": {
        "name_he": "חינוך וחוגים",
        "name_en": "Education & Activities",
        "category_type": "EXPENSE"
      },
      "confidence": 0.88
    }
  ]
}
```

### 2.3 Database Schema Update for Suggested Categories

To hold pending AI category suggestions before user approval, the `transactions` table includes nullable suggestion fields:

```sql
ALTER TABLE transactions ADD COLUMN suggested_category_he TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN suggested_category_en TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN suggested_category_type TEXT DEFAULT NULL;
```

### 2.4 User Approval & Category Creation Lifecycle

```
[ LocalAI Batch Inference ] ---> [ Suggests New Category: "Education & Activities" ]
                                                |
                                                v
                              [ Transaction stored with is_reviewed=FALSE ]
                              [ Pending Suggestion Pill displayed in UI  ]
                                                |
                                                +-----------------------+
                                                |                       |
                                     (Click: Approve)          (Click: Reject/Select Existing)
                                                |                       |
                                                v                       v
                              [ 1. Insert new row in `categories` ]  [ Assign chosen `category_id` ]
                              [ 2. Assign category_id to tx     ]  [ Clear suggestion fields    ]
                              [ 3. Clear suggestion fields      ]  [ Mark is_reviewed=TRUE      ]
                              [ 4. Mark is_reviewed=TRUE        ]
```

* **UI Interface**: In the **"Transactions Needing Review"** drawer and **Category Manager**, an interactive suggestion card appears:
  > *"LocalAI suggested creating a new category: **Education & Activities / חינוך וחוגים** for transaction 'קייטנת ספורט'"*
  > Buttons: `[ Accept & Create Category ]` `[ Select Existing Category ]` `[ Reject ]`

---

## 3. Database Schema (SQLite3)

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

-- Schema Version Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table (Stores LocalAI URL, LocalAI API Key, System Prompt, Base Currency)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,                       
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Rates Cache (For Non-ILS Bank Account Net Worth Aggregation)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id TEXT PRIMARY KEY,
    rate_date DATE NOT NULL,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL DEFAULT 'ILS',
    rate DECIMAL(14,6) NOT NULL,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rate_date, from_currency, to_currency)
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
    current_installment_column TEXT,          -- Current installment number (if present)
    total_installments_column TEXT,            -- Total installments count (if present)
    debit_column TEXT,                         
    credit_column TEXT,                        
    payee_column TEXT NOT NULL,                
    category_column TEXT,                      
    notes_column TEXT,                         
    has_header BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Transactions Table (Includes Israeli Installments "תשלומים" & AI Category Suggestions)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,                       -- UUID v4
    account_id TEXT NOT NULL,
    date DATE NOT NULL,                        -- ISO Format: YYYY-MM-DD
    amount DECIMAL(12,2) NOT NULL,             -- Billed amount in account's native currency (ILS)
    currency TEXT NOT NULL DEFAULT 'ILS',      -- Account currency
    original_amount DECIMAL(12,2),             -- Foreign original transaction amount (e.g. $100.00)
    original_currency TEXT,                    -- Foreign original currency code (e.g. 'USD')
    current_installment INT DEFAULT NULL,      -- Current installment number (e.g. 2)
    total_installments INT DEFAULT NULL,        -- Total installment count (e.g. 12)
    payee_raw TEXT NOT NULL,                   -- Original string from CSV (UTF-8 Hebrew/English)
    payee_cleaned TEXT,                        -- Cleaned merchant name
    category_id TEXT,
    suggested_category_he TEXT DEFAULT NULL,   -- AI proposed category name (Hebrew)
    suggested_category_en TEXT DEFAULT NULL,   -- AI proposed category name (English)
    suggested_category_type TEXT DEFAULT NULL, -- AI proposed category type ('EXPENSE'/'INCOME'/'TRANSFER')
    notes TEXT,                                
    import_hash TEXT UNIQUE,                   -- SHA-256(account_id | date | amount | payee_raw | daily_occurrence_ordinal)
    is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    categorized_by TEXT NOT NULL DEFAULT 'UNSET' CHECK(categorized_by IN ('UNSET', 'MANUAL', 'LOCALAI', 'RULE')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Split Transactions Table (Multi-category Itemization)
CREATE TABLE IF NOT EXISTS transaction_splits (
    id TEXT PRIMARY KEY,                       -- UUID v4
    transaction_id TEXT NOT NULL,              -- Parent transaction
    category_id TEXT NOT NULL,                 -- Category assigned to this split portion
    amount DECIMAL(12,2) NOT NULL,             -- Split amount in transaction currency
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Inter-Account Transfer & Statement Reconciliation Table (Supports 1-to-1 & 1-to-Many)
CREATE TABLE IF NOT EXISTS account_transfers (
    id TEXT PRIMARY KEY,                       -- UUID v4
    bank_transaction_id TEXT NOT NULL,          -- Lump-sum debit entry in Bank account (e.g. -$3500 ILS)
    credit_card_transaction_id TEXT NOT NULL UNIQUE, -- Credit Card transaction covered by transfer (strictly 1 transfer per CC transaction)
    amount DECIMAL(12,2) NOT NULL,              -- Reconciled transfer amount
    match_confidence REAL NOT NULL DEFAULT 1.0,     -- 1.0 for manual, <1.0 for auto match
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bank_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(credit_card_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    UNIQUE(bank_transaction_id, credit_card_transaction_id)
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
CREATE INDEX IF NOT EXISTS idx_splits_tx ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transfers_bank ON account_transfers(bank_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_cc_unique ON account_transfers(credit_card_transaction_id);
```

---

## 4. REST API Endpoints (`--mode=web`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/categories/accept-suggestion` | Accepts an AI category suggestion, creates new category row, assigns to transaction. |
| `POST` | `/api/v1/categories/reject-suggestion` | Clears AI category suggestion from transaction. |
| `GET` | `/api/v1/transactions` | Query transactions (filters: unreviewed, suggested_category, search). |
| `POST` | `/api/v1/categorize/localai` | Triggers LocalAI batch categorization with category suggestion prompts. |

---

## 5. Summary & Location

This specification document is stored directly in your project folder at:
`SPECIFICATION.md`
