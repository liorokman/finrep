# finrep v2 — Specification

Self-hosted personal finance ledger for one household, built around Israeli bank and credit-card statements. Single Go binary, SQLite, embedded web UI, MCP interface for AI agents.

Status: **draft for the `rewrite` branch.** Everything here is intended behaviour; nothing is claimed as built until it has a test.

## 1. Goals and non-goals

**Goals**
- Import bank/card statements (CSV and PDF) safely and repeatably: importing the same file twice never changes the data.
- Keep an accurate ledger across bank accounts and credit cards, including card billing cycles and the bank payments that settle them.
- Categorize quickly (rules first, then a local LLM) without ever letting the LLM change the category tree or mark work as reviewed on its own.
- Produce reports that agree with each other because they share one definition of "spending".
- Be correct with Hebrew/English (RTL/LTR mixed) text everywhere.

**Non-goals:** multi-user/multi-tenant, bank-API scraping, investment tracking, mobile app, cloud hosting.

## 2. Core concepts

| Concept | Meaning |
|---|---|
| Account | `BANK` or `CREDIT_CARD`; one currency (ISO 4217); an **owner** (e.g. "Alice", "Wife") for filtering. Cards also have billing rules (§6) and an optional limit. |
| Transaction | One statement line. Amount is signed (negative = money out) in the **account's** currency. Foreign purchases keep the original amount/currency alongside the issuer-billed amount. Card charges are tagged `LOCAL` or `FOREIGN`. |
| Import batch | One uploaded file. Every transaction records the batch it came from; a batch can be undone. |
| Statement | For a card: all charges that will be billed on one bill date, with an expected total. Isracard cards have separate statements for local and foreign charges because they bill on different dates. |
| Settlement | The link between a bank debit and a statement: "this bank charge paid this statement", with an amount. |
| Employer coverage | A line printed as negative on the card statement (stored as a positive amount in the ledger's sign convention, where purchases are negative), e.g. `חיוב תקציב סאפ לאבס ישראל בע"מ`) that cancels some or all of a purchase because the employer's monthly budget pays for it. It is linked to the purchase it covers. The purchase still counts as spending; the covered part is not paid to the card issuer. |
| Transfer | Money moved between the user's own accounts. Excluded from spending and income. |
| Category | Bilingual (he/en), typed `EXPENSE`/`INCOME`/`TRANSFER`, optional parent and monthly budget. May be marked as created by the LLM so it can be reviewed, merged or deleted. |

## 3. Reporting rules (single source of truth)

All reports use one `ledger_view` definition:

1. **Spending** = transactions on any account whose category type is `EXPENSE`, plus uncategorized negative ones (shown as "Uncategorized"). The category's type decides the direction, so a positive refund in an `EXPENSE` category nets against spending instead of becoming income.
2. **Income** = positive transactions whose category type is `INCOME` (or uncategorized).
3. `TRANSFER` category, and any bank debit linked as a settlement of a card statement, are **excluded** from spending/income. The card charges themselves count, so nothing is counted twice.
4. Dates: reports use the transaction (purchase) date; card statements also expose the bill date, and "cash view" reports can group card spending by bill date.
5. Amounts are in each account's currency. v1 supports ILS bank accounts; card amounts are the issuer-billed amount, so no app-side conversion is needed. Non-ILS bank accounts and conversion are Phase 2 (§15).
6. **Gross vs. out-of-pocket.** Every card purchase has a *gross* amount (what was bought) and an *out-of-pocket* amount (gross minus any linked employer coverage, i.e. what the card issuer bills). **Spending reports (category breakdown, heatmap, budget vs. actual, recurring, anomalies, Sankey) use gross by default**, so a ₪902.90 restaurant purchase with ₪770.76 covered by the employer counts as ₪902.90 under Restaurants. Statements, settlements, card liabilities, net worth and cash-flow-to-bank use out-of-pocket, so they tie to the issuer's printed totals and to bank debits. Every spending report offers a Gross / Out-of-pocket toggle.
7. Employer-coverage lines are never spending and never income: they are excluded from both and appear only as the covered portion of their purchase.

## 4. Import

### 4.1 Sources
- **CSV** with interactive column mapping; presets are saved per account.
- **Leumi bank account movements** (`תנועות בחשבון`): an HTML document saved with an `.xls` extension (columns: date, value date, description, reference, debit, credit, balance, extended description, note), UTF-8, with the same movement repeated across overlapping exports. Used for card-payment debits and the bank ledger.
- **PDF card statements** (Isracard, Cal, Leumi) are the **authoritative source for card charges**. The importer reads each statement directly, with no intermediate CSV. From each PDF it takes: the card's last four digits, the statement bill date (e.g. Cal's "monthly billing page for 10/07/26"), every charge with its purchase date, original amount/currency and installment data, the printed statement total, and the "future charges" section, whose charges carry their own later bill dates. **Invariant: the parsed charges must sum to the printed statement total; otherwise the import is rejected with the offending lines.** (Checked: the Cal 1001 statement for 10/07/26 totals ₪2,576.66, which equals the bank debit on that date.) The old `ccpdf2csv` output is not used: it mislabelled bill dates and dropped the card suffix.
  Optional LLM pass repairs missing Hebrew spaces in merchant names.

### 4.2 Pipeline
1. **Upload** (size-capped). Detect encoding: BOM → UTF-8 (strip BOM); `utf8.Valid` → UTF-8; otherwise Windows-1255.
2. **Map** columns (date, payee, amount or debit/credit, billing date, original amount/currency, installments, notes). Date format is honoured exactly: `DD/MM/YYYY`, `MM/DD/YYYY`, `DD/MM/YY`, `YYYY-MM-DD`, `DD.MM.YYYY`.
3. **Stage:** parse every row; return passed rows, failed rows with reasons, and rows already in the database.
4. **Commit** in one database transaction, recorded as an import batch.

### 4.3 Deduplication
Row identity = `account | date | amount | currency | payee | statement bill date | issuer/bank reference | n`, hashed, where **`n` is the 1-based position among identical rows within the same uploaded file**. It never depends on what is already stored. Including the statement bill date keeps identical purchases that fall into different statements apart, and lets a "future charge" in one statement match the same charge when it later appears as a regular line. The bank reference (`אסמכתא`) separates same-day debits with different amounts. Consequences: re-importing a file inserts nothing; overlapping exports dedupe; two genuine identical purchases on one day both import. If an overlapping export contains *more* identical rows than were previously imported, only the extra ones are inserted.

### 4.3a Employer coverage pairing
During import, each coverage line is linked to the purchase it covers: same card, same purchase date, same merchant, and a coverage amount no larger than the purchase (partial coverage allowed: ₪902.90 purchase, ₪770.76 covered, ₪132.14 paid by the user). The line pattern is a setting (default `חיוב תקציב סאפ`) so it survives employer or budget-name changes. A coverage line that cannot be paired is kept, flagged in a "needs attention" list, and counts toward the statement total but not toward spending. Pairing never changes the statement total, which still equals the printed one.

### 4.4 Installments
Parsed from mapped columns or from text ("תשלום 2 מתוך 12"). Stored as `current/total`; used by the payoff forecast.

### 4.5 Cutoff
History before **2023** is incomplete, so 2023 is the earliest year the application works with. Rows whose purchase or posting date is before `2023-01-01` are skipped by every importer and reported as skipped; this is a floor, not a setting. A later cutoff (YYYY-MM or YYYY-MM-DD) may be configured as a default or chosen per import, but never earlier than the floor. Reports, statements and the import wizard therefore never show or generate anything before 2023.

## 5. Categorization

Categorization is automatic and runs as a **categorization run** over transactions that have no category. There are no suggestion queues.

1. **Decision model (classifier).** Each transaction is sent in a batch (OpenAI-compatible `/v1/chat/completions`; default batch 20, configurable 1–50; retry with backoff; cancellable) together with the full list of existing categories. The model must choose one existing category id and give a confidence between 0 and 1. Ids not in the list, and transactions not in the batch, are ignored.
2. **Threshold.** If the best confidence is **≥ 0.75** (configurable), the category is applied.
3. **Category generator (regular model).** If it is below the threshold, a second, general-purpose model is asked to create a category (he/en names and type) for the transaction. The result is matched against existing names first; only if there is no match is a new category created, marked `created_by=LLM`, and applied. Transactions in one run that need the same new category share it.
4. Every automatic assignment records `categorized_by=LLM`, the confidence, the model and the run id on the transaction, and leaves `is_reviewed=false`. Only a user action sets `is_reviewed`.
5. A run can be **undone**: all assignments from that run are cleared, and categories it created that are now unused are removed.
6. Manual categorization sets `categorized_by=MANUAL` and is never overwritten by a run.
7. Two models are configured separately (settings): `classifier_model` and `generator_model`, plus the threshold and the endpoint/key. Neither model can write to the database directly; the service validates and applies results.

Keyword rules, and saved rules created from manual choices, are Phase 2 (§15).

## 6. Card billing, statements and settlements

The goal: see card purchases over time, know on which date each purchase will be (or was) billed, and know when the bank account was charged for it.

### 6.1 Billing rules
Each card account has an ordered list of **billing rules**:

`{ scope: LOCAL | FOREIGN | ALL, bill_day: 1–31, month_offset: N, cutoff_day: optional 1–31 }`

A charge made on day *d* of month *M* is billed on `bill_day` of month *M + month_offset*, or of month *M + month_offset + 1* when `cutoff_day` is set and *d ≥ cutoff_day*. The day is clamped to month end; if it lands on a Saturday it moves to Sunday (a Friday does not move). Examples:
Verified against the July 2026 statement PDFs, with every printed statement total matching a bank debit:
- **Local purchases, all three issuers:** `LOCAL, bill_day 10, month_offset 0, cutoff_day 10`. Ordinary purchases from the 10th of one month through the 9th of the next are billed on that next 10th. Cal 1001: purchases 10 June–8 July → 10 July (₪2,576.66). Leumi 1003: 11 June–7 July → 10 July. Isracard 1002: 30 June–3 July → 10 July (₪647.88). So a purchase on 5 September bills on 10 September and one on 25 September on 10 October. (Isracard's lower boundary is not directly shown by the sample and is assumed to match.)
- **Isracard, foreign purchases:** `FOREIGN, bill_day 2, month_offset 1, cutoff_day 2`. A purchase made 2 May–1 June is billed on 2 July (₪251.83); anything made in September from the 2nd is billed on 2 November, and one made on 1 September on 2 October.
- **Leumi, foreign purchases:** billed with a one-month deferral ("דחוי חודש"): 20 May → 10 July, 20 June → 10 August, i.e. `FOREIGN, bill_day 10, month_offset 2`. The cutoff is not yet known.
- **Cal, foreign purchases:** unknown; to be taken from a statement that contains one.
- Isracard lets the customer choose the billing day ("מועד החיוב שבחרת"), so the day is per card.

**Effective date (weekend roll).** The cutoff is compared with the *effective date*, not the raw purchase date. The effective date is the purchase date moved to the next Israeli business day (Sunday–Thursday): a purchase on a Friday or Saturday takes effect on the following Sunday. So a purchase on Saturday 9th has effective date Sunday 10th and rolls into the next month's statement. The bill date itself moves to Sunday only when it falls on a Saturday (10th on a Saturday → 11th). Fridays are not shifted: the bank export shows card debits on Fridays (2 Jun 2023, 10 Nov 2023, 2 Feb 2024) and on the Sunday after a Saturday bill date (11 Jun 2023, 11 Feb 2024).

**Standing orders.** Charges marked `הוראת קבע` (standing order) appear to bill one cycle later than ordinary purchases: in the Cal 10/07/26 statement, standing orders dated 2 June and 4 June are billed on 10 July, and one dated 2 July is listed as a future charge for 10 August. This is a hypothesis from one Cal statement only; the Leumi statement shows standing orders (23–29 June) billed on 10 July like ordinary purchases, so any lag is per issuer. Billing rules therefore allow a per-charge-kind `extra_cycles` (default 0) and the statement PDF always overrides.

Offsets and days are data, not code, so a change in how an issuer bills is a settings edit. Cards are owned by a person (e.g. "Alice", "Wife"), so reports can filter by owner.

### 6.2 Which bill date does a charge get?
**Definitions.** *Purchased* is the day the card was used. *Billed* is the day the bank account was debited for that card's cycle. The bank debit is the ground truth for "billed".

1. If a charge belongs to a statement that has been **settled** by a bank debit, its bill date is that debit's date.
2. Otherwise, the bill date from the **statement PDF** (header date for billed charges, per-charge date in the "future charges" section) is used. Dates in CSVs produced by the old `ccpdf2csv` are not trusted: checks against real data showed them a month off or swapped between the 2nd and the 10th.
3. If the file has none (recent charges not yet billed), the card's billing rule for that charge's scope computes it.
4. A charge is `FOREIGN` when it has an original currency other than ILS or the issuer marks it as abroad; otherwise `LOCAL`.
5. When a settled statement's actual debit date disagrees with the date a rule would have computed, the app flags that rule for review.

### 6.3 Statements
A statement is all of one card's charges billed on one bill date (`account_id`, `bill_date`), shown with the sections the issuer prints (local, foreign, deferred). Its expected total is the sum of its charges, **net of employer-covered amounts (§3)**, and equals the statement's printed total. An Isracard card therefore has two statements around the turn of the month (the 2nd for foreign, the 10th for local), each paid by its own debit. A Leumi card's deferred foreign charges and domestic charges falling on the same 10th form one statement paid by one debit (₪74.90 + ₪6,915.66 = ₪6,990.56). Future statements are shown from the issuers' "future charges" sections and computed dates, so you can see what will be billed on which day.

### 6.4 Settlements (when the bank was charged)
- Each card is paid by its own bank debit, so a **settlement** links one bank debit to one statement, with an amount. v1 supports one debit ↔ one statement, entered manually or confirmed from auto-match, including partial payments. A statement is `UPCOMING` (bill date in the future), `BILLED` (due, nothing paid), `PARTIAL`, or `PAID` (settled ≥ expected, with a tolerance).
- The schema allows many-to-many settlements so lump-sum debits covering several cards can be added in Phase 2 without migration.
- **Auto-match** proposes links for bank debits that are not already linked and not manually decided, scoring by bill-date distance then amount difference. Proposals are confirmed one by one or in bulk. A manual unlink is remembered and never auto-redone. Re-running is idempotent.
- Payee hints for "this debit is a card payment" come from settings, not hardcoded names.
- A debit paying a card that isn't tracked in the app can be marked **external**; it is excluded from spending (the card spend is not in the ledger).

### 6.5 Views this must support
- Card overview by owner: spend by purchase month and by bill month.
- Statement list with status, expected vs. settled amount, and the bank debit that paid it (date and amount).
- Timeline of upcoming bills and expected bank outflow per day.

## 7. Reports

Each report is a pure function over the `ledger_view` SQL view (migration 0003, the one implementation of §3) with a shared filter (accounts, owner, date range, categories incl. "uncategorized", purchase vs. bill-date basis, gross vs. out-of-pocket measure, currency) and is available via REST and MCP. Spending reports default to gross; cash flow, Sankey, installment forecast and net worth default to out-of-pocket. v1 reports one currency at a time (ILS by default). A card charge with no bill date is placed on its purchase date under the bill-date basis, and is listed as "undated" in the card balances.

1. Net worth trend (assets from ILS bank accounts; liabilities = card charges not yet settled by a bank debit, including statements not yet billed)
2. Cash flow (income, spending, net, savings rate by month)
3. Category breakdown (donut + drill-down to transactions)
4. Sankey (income sources → accounts → categories, for a chosen period)
5. Budget vs. actual
6. Recurring payments (detected by payee + cadence + amount stability; fixed vs. variable)
7. Month × category heatmap (click-through to transactions; rows keyed by category id)
8. Card payoff and installment forecast (future installments projected month by month)
9. Foreign-currency purchases (original vs. billed, implied rate, fees)
10. Anomalies (per-category z-score/IQR outliers and new unusual recurring debits)

## 8. Multi-currency (Phase 2)
v1: all bank accounts are ILS. Foreign purchases on cards are shown with their original amount and currency next to the issuer-billed ILS amount.

Phase 2: non-ILS bank accounts; exchange rates fetched daily from a configurable provider (default Bank of Israel), cached per date, nearest-earlier lookup; if no rate exists, ILS conversion is shown as unavailable rather than guessed.

## 9. Interfaces

### 9.1 REST (`/api/v1`, JSON, session-authenticated)
Resources: accounts (with billing rules), categories (merge, delete, filter by `created_by`), transactions (+ bulk update), imports (inspect/stage/commit/undo), categorization runs (start/status/cancel/undo), statements and settlements (+ auto-match proposals, external payments), reports, settings (allow-listed keys only; secrets write-only), auth info. List endpoints are paginated with a hard cap (≤500).

### 9.2 MCP (`mark3labs/mcp-go`)
Read-only tools: `list_accounts`, `get_account_summary`, `query_transactions`, `get_net_worth_trend`, `get_category_breakdown`, `get_cash_flow`, `get_recurring`, `get_statements` (with settlement info and upcoming bills). Transports: **stdio** (`--mode=mcp`) and **Streamable HTTP/SSE** mounted under `/mcp`. Transport routes are covered by integration tests. HTTP MCP authenticates with a static bearer token from configuration (OIDC redirect flows do not work for agents). The token is compared in constant time; with no token configured `/mcp` answers 404, and the token never unlocks the REST API (nor does a login session unlock `/mcp`). HTTP runs stateless, so a server restart never strands an agent. Stdio mode (`--mode=mcp`) opens the same database directly and sends logs to stderr only, because stdout carries the protocol. Tool arguments are validated (e.g. `limit` 1-100) and errors name the problem so an agent can retry; internal errors are generic.

## 10. Security
- OIDC Authorization Code + PKCE (Authentik). ID token validated (issuer, audience, nonce, signature via JWKS). **Group membership is required:** the ID token must list the group `FinRep_Users` (configurable with `--oidc-required-group`; the claim is `groups`, configurable with `--oidc-groups-claim`, and may be a list or a single string). The match is exact and case-sensitive; a user who authenticates but is not in the group gets a 403 and no session. The group cannot be set to empty. Membership is checked at login only, so removing someone from the group takes effect when their session ends (24 h idle, 30 days at most). The single-tenant allow-list of subjects/emails is Phase 2.
- Session: HMAC-signed, `HttpOnly`, `Secure` (when behind HTTPS), `SameSite=Lax`, sliding 24 h expiry. **Session key comes from configuration; with auth enabled the server refuses to start without it.**
- Dev mode (`--auth=off`) only binds to loopback.
- CSRF: state-changing requests require a custom header plus same-origin check.
- Uploads capped (default 10 MB); request bodies capped; `limit` capped.
- UI never builds HTML from strings; all text is escaped by construction. Strict CSP.
- Outbound LLM/exchange-rate URLs are configured server-side; test-connection endpoints use stored settings only (no arbitrary URLs from the browser).
- Secrets (LLM key, session key, MCP token) live in env/config files excluded from git and Docker context; API never returns them.

## 11. Configuration and operations
Flags with env fallbacks: `--port`, `--log-level`, `--mode web|mcp`, `--db-path`, `--auth on|off`, `--oidc-issuer`, `--oidc-client-id`, `--oidc-redirect`, `--oidc-required-group`, `--oidc-groups-claim`, `--session-secret`, (`FINREP_OIDC_CLIENT_SECRET[_FILE]`, optional, env only), `--mcp-token`, `--max-upload-mb`. Trusts `X-Forwarded-*` from a configured proxy list (Cosmos OS). Structured `slog` logging. Graceful shutdown. `/healthz`.

Build: `Taskfile.yaml` (`build`, `dev`, `test`, `lint`, `docker-build`). `Dockerfile` multi-stage, non-root user. `.dockerignore` and `.gitignore` exclude data, CSVs, PDFs, DB files and local config.

## 12. Data model (summary)

v1 tables: `accounts` (`owner`, `currency`), `billing_rules` (`account_id`, `scope`, `bill_day`, `month_offset`, `cutoff_day`), `categories` (`created_by` USER/LLM), `import_batches`, `transactions` (`batch_id`, `import_key` unique, `scope` LOCAL/FOREIGN, `bill_date`, `bill_date_source` PDF/BANK/RULE, `kind` PURCHASE/EMPLOYER_COVERAGE/OTHER, `covers_transaction_id`, `category_id`, `categorized_by` MANUAL/LLM, `llm_confidence`, `run_id`, `is_reviewed`, installment/original-amount fields, `notes`), `categorization_runs`, `statements` (`account_id`, `bill_date`, `scope`), `settlements` (`statement_id`, `bank_transaction_id`, `amount`, `source` AUTO/MANUAL; many-to-many capable), `external_payments`, `settings`, `schema_migrations`. A statement's charges are derived from `(account_id, scope, bill_date)`, not stored twice.

Phase 2 tables: `transaction_splits`, `rules`, `import_presets`, `exchange_rates`.

Money is stored as **integer minor units (agorot/cents)** with an ISO 4217 currency code, never floats. All multi-row writes run in transactions. A single shared column list and scanner is used for transaction reads.

## 13. UI requirements
- Functional, beautiful, correct: clear hierarchy, dense-but-readable tables, keyboard-friendly review of automatically categorized transactions (a "needs review" filter, bulk confirm/change), accessible contrast (WCAG AA), light and dark themes.
- Full RTL/LTR bidi handling: `dir="auto"` on user text, correct number/currency alignment, Hebrew-capable fonts.
- Views: Dashboard, Transactions, Import wizard, Cards & statements (by owner; spend by purchase month and bill month; upcoming bills; settlements), Accounts (including billing rules), Categories, Reports, Settings.
- Dashboard is a fixed layout in v1; the widget registry (show/hide/reorder) is Phase 2.
- Charts are accessible (labels/tooltips, non-colour cues) and clickable through to filtered transactions.

## 14. Testing
- Unit tests for money math, date/format parsing, dedup keys, billing-rule date computation (all bill days, month-end clamping, weekend shift, the Isracard foreign +2-month case), settlement states.
- Employer coverage: full and partial pairing, unpaired coverage line flagged; gross vs. out-of-pocket totals for the Cal 10/07/26 statement (net ₪2,576.66 equals the bank debit; gross is larger).
- Categorization run tests with fake classifier/generator servers: ≥ 0.75 applies an existing category; < 0.75 invokes the generator; new categories are de-duplicated; run undo restores state.
- Fixture tests for the three PDF parsers and CSV encodings (UTF-8, BOM, emoji, Windows-1255).
- Property test: importing any file twice inserts zero rows the second time.
- HTTP integration tests, including MCP over stdio and HTTP, OIDC with a fake provider.
- Report consistency test: totals from every report reconcile with the ledger for a seeded dataset.
- UI end-to-end smoke tests against the embedded build.

## 15. Phase 2 (deferred)
Everything below was specified or schema-only in the original design but never implemented. It is deliberately out of v1 and will be revisited after v1 is working.

- Transaction splits (with the sum invariant)
- Keyword/regex categorization rules and "make this a rule" from a manual choice
- Saved CSV import presets
- Dashboard widget registry (show/hide/reorder)
- Foreign-currency bank accounts and the exchange-rate cache (§8)
- OIDC single-tenant allow-list
- Auto-match of one bank debit to a *combination* of statements (the schema already allows it; manual linking works in v1)
- Hebrew/English RTL is in v1; theming beyond light/dark is not
- Employer budget usage report (monthly budget used vs. remaining, derived from linked coverage lines)
- Per-issuer standing-order lag, once more statements confirm it
- **Savings and investment accounts** (pension, קרן השתלמות, קופת גמל להשקעה, brokerage). These are valued by periodic **balance snapshots** from the provider's report (date, value, optionally the provider's own contribution total), not by a stream of transactions. Design: a new account type `INVESTMENT` with a subtype (`PENSION`, `STUDY_FUND`, `GEMEL`, `OTHER`) and a `snapshots` table (account, date, value in minor units, source file). Net worth uses the latest snapshot at or before each date, and the account appears on the Accounts page with its value, the change since the previous snapshot, and a value-over-time chart. Contributions are bank transfers to the provider; linking one to the account (the same idea as linking a bank debit to a card statement) lets the app separate **contributions** from **growth**, so growth = change in value minus contributions in the period. Employer and employee deposits show up in the provider's report rather than in the bank, so a snapshot may also carry the deposits the provider received. Import: the providers' PDF or Excel reports, one parser per provider like the card parsers, plus manual entry of a snapshot. Not counted as spending or income; the deposits stay categorized as transfers.
