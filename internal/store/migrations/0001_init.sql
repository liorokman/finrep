-- finrep v2 schema. Money is stored as integer minor units (agorot/cents).
-- Dates are ISO text (YYYY-MM-DD); 2023-01-01 is the earliest supported date.

CREATE TABLE accounts (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    account_type  TEXT NOT NULL CHECK (account_type IN ('BANK', 'CREDIT_CARD')),
    institution   TEXT NOT NULL,
    owner         TEXT NOT NULL DEFAULT '',
    last4         TEXT,
    currency      TEXT NOT NULL DEFAULT 'ILS',
    opening_balance_minor INTEGER NOT NULL DEFAULT 0,
    credit_limit_minor    INTEGER,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- How a card's purchases map to bill dates (spec section 6.1).
CREATE TABLE billing_rules (
    id           TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    scope        TEXT NOT NULL CHECK (scope IN ('LOCAL', 'FOREIGN', 'ALL')),
    bill_day     INTEGER NOT NULL CHECK (bill_day BETWEEN 1 AND 31),
    month_offset INTEGER NOT NULL DEFAULT 0 CHECK (month_offset BETWEEN 0 AND 6),
    cutoff_day   INTEGER CHECK (cutoff_day IS NULL OR cutoff_day BETWEEN 1 AND 31),
    standing_order_extra_cycles INTEGER NOT NULL DEFAULT 0 CHECK (standing_order_extra_cycles BETWEEN 0 AND 3),
    UNIQUE (account_id, scope)
);

CREATE TABLE categories (
    id            TEXT PRIMARY KEY,
    name_he       TEXT NOT NULL,
    name_en       TEXT NOT NULL,
    parent_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    color_hex     TEXT NOT NULL DEFAULT '#3B82F6',
    icon          TEXT NOT NULL DEFAULT 'tag',
    category_type TEXT NOT NULL CHECK (category_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    monthly_budget_minor INTEGER,
    created_by    TEXT NOT NULL DEFAULT 'USER' CHECK (created_by IN ('USER', 'LLM')),
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_categories_name_en ON categories (lower(name_en));

CREATE TABLE import_batches (
    id         TEXT PRIMARY KEY,
    source     TEXT NOT NULL,              -- e.g. CAL_PDF, ISRACARD_PDF, LEUMI_PDF, LEUMI_BANK_XLS, CSV
    filename   TEXT NOT NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    row_count  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    undone_at  TEXT
);

CREATE TABLE categorization_runs (
    id               TEXT PRIMARY KEY,
    started_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at      TEXT,
    status           TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'DONE', 'CANCELED', 'FAILED', 'UNDONE')),
    classifier_model TEXT NOT NULL DEFAULT '',
    generator_model  TEXT NOT NULL DEFAULT '',
    threshold        REAL NOT NULL DEFAULT 0.75,
    processed        INTEGER NOT NULL DEFAULT 0,
    total            INTEGER NOT NULL DEFAULT 0,
    error            TEXT
);

-- One statement per card and bill date (spec section 6.3).
CREATE TABLE statements (
    id                  TEXT PRIMARY KEY,
    account_id          TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    bill_date           TEXT NOT NULL CHECK (bill_date >= '2023-01-01'),
    printed_total_minor INTEGER,             -- total printed on the issuer's statement, when known
    source_file         TEXT,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, bill_date)
);

CREATE TABLE transactions (
    id                     TEXT PRIMARY KEY,
    account_id             TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    batch_id               TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
    import_key             TEXT NOT NULL UNIQUE,   -- dedup key, spec section 4.3
    date                   TEXT NOT NULL CHECK (date >= '2023-01-01'),   -- purchase / posting date
    amount_minor           INTEGER NOT NULL,       -- signed, negative = money out, in the account's currency
    currency               TEXT NOT NULL DEFAULT 'ILS',
    original_amount_minor  INTEGER,
    original_currency      TEXT,
    scope                  TEXT NOT NULL DEFAULT 'LOCAL' CHECK (scope IN ('LOCAL', 'FOREIGN')),
    kind                   TEXT NOT NULL DEFAULT 'PURCHASE' CHECK (kind IN ('PURCHASE', 'EMPLOYER_COVERAGE', 'OTHER')),
    covers_transaction_id  TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    is_standing_order      INTEGER NOT NULL DEFAULT 0,
    bill_date              TEXT,
    bill_date_source       TEXT CHECK (bill_date_source IN ('PDF', 'BANK', 'RULE')),
    statement_id           TEXT REFERENCES statements(id) ON DELETE SET NULL,
    current_installment    INTEGER,
    total_installments     INTEGER,
    payee_raw              TEXT NOT NULL,
    payee_cleaned          TEXT,
    notes                  TEXT,
    category_id            TEXT REFERENCES categories(id) ON DELETE SET NULL,
    categorized_by         TEXT NOT NULL DEFAULT 'UNSET' CHECK (categorized_by IN ('UNSET', 'MANUAL', 'LLM')),
    llm_confidence         REAL,
    run_id                 TEXT REFERENCES categorization_runs(id) ON DELETE SET NULL,
    is_reviewed            INTEGER NOT NULL DEFAULT 0,
    created_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Ledger sign: purchases are negative, so a coverage line that reduces the charge is positive.
    CHECK (kind <> 'EMPLOYER_COVERAGE' OR amount_minor > 0),
    CHECK (covers_transaction_id IS NULL OR kind = 'EMPLOYER_COVERAGE')
);
CREATE INDEX idx_tx_account_date ON transactions (account_id, date);
CREATE INDEX idx_tx_category     ON transactions (category_id);
CREATE INDEX idx_tx_statement    ON transactions (statement_id);
CREATE INDEX idx_tx_bill_date    ON transactions (bill_date);
CREATE INDEX idx_tx_batch        ON transactions (batch_id);
CREATE INDEX idx_tx_covers       ON transactions (covers_transaction_id);

-- A bank debit that paid (part of) a statement. Many-to-many capable (Phase 2 auto-match).
CREATE TABLE settlements (
    id                  TEXT PRIMARY KEY,
    statement_id        TEXT NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
    bank_transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount_minor        INTEGER NOT NULL CHECK (amount_minor > 0),
    source              TEXT NOT NULL CHECK (source IN ('AUTO', 'MANUAL')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (statement_id, bank_transaction_id)
);
CREATE INDEX idx_settlements_bank ON settlements (bank_transaction_id);

-- Bank debits paying a card that is not tracked here; excluded from spending.
CREATE TABLE external_payments (
    bank_transaction_id TEXT PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    note                TEXT,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auto-match decisions the user rejected; never proposed again.
CREATE TABLE settlement_rejections (
    statement_id        TEXT NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
    bank_transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    PRIMARY KEY (statement_id, bank_transaction_id)
);

CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
