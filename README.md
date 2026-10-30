# FinRep

A personal finance ledger for Israeli bank accounts and credit cards. It imports Leumi bank exports and
Cal, Isracard and Leumi card statements, keeps track of which bank debit paid which card bill, categorizes
transactions with a local LLM, and reports on spending, cash flow and net worth. The interface is in English
and handles Hebrew data (payees, category names) correctly. AI agents can read the data through MCP.

Everything is one Go binary with an embedded web UI and a SQLite database. Money is stored as integer
minor units (agorot) and never as floats.

## Try it in two minutes

```sh
task dev            # or: go run ./cmd/finrep --auth=off
```

Open <http://127.0.0.1:8080/?mock=1> for the interface with generated sample data (nothing is saved).
Open `/?mock=0` to switch to your own, empty ledger.

`--auth=off` has no login and is only allowed on a loopback address. Use it for development only.

## Running it for real

Login uses OpenID Connect (authorization code with PKCE), for example with Authentik. Only users whose ID
token lists the group `FinRep_Users` (configurable) can sign in.

```sh
mkdir secrets
head -c 48 /dev/urandom | base64 > secrets/session_secret
echo "your OIDC client secret" > secrets/oidc_client_secret     # skip for a public (PKCE-only) client
head -c 32 /dev/urandom | base64 > secrets/mcp_token            # skip to disable the /mcp endpoint
# edit the OIDC settings in docker-compose.yml, then
docker compose up -d
```

Run it behind a reverse proxy that terminates HTTPS and list the proxy's network in `FINREP_TRUSTED_PROXIES`,
so the app trusts its `X-Forwarded-*` headers (and only theirs). The session cookie is `Secure` over HTTPS,
`HttpOnly` and `SameSite=Lax`; state-changing requests need a same-origin request plus a per-session CSRF token.

### Configuration

Every option is a flag or an environment variable. Secrets can also be read from a file with the `_FILE` suffix.

| Setting | Flag / environment variable | Notes |
|---|---|---|
| Port | `--port` / `FINREP_PORT` | default 8080 |
| Database | `--db-path` / `FINREP_DB_PATH` | SQLite file; created and migrated on start |
| Login | `--auth` / `FINREP_AUTH` | `on` (default) or `off` |
| OIDC issuer, client | `--oidc-issuer`, `--oidc-client-id`, `--oidc-redirect` | the redirect URL ends in `/auth/callback` |
| OIDC client secret | `FINREP_OIDC_CLIENT_SECRET[_FILE]` | optional; environment only |
| Required group | `--oidc-required-group` (default `FinRep_Users`), `--oidc-groups-claim` (default `groups`) | the group cannot be empty |
| Session secret | `FINREP_SESSION_SECRET[_FILE]` | at least 32 bytes; required with login on |
| MCP token | `FINREP_MCP_TOKEN[_FILE]` | at least 16 characters; empty disables HTTP MCP |
| Trusted proxies | `--trusted-proxies` / `FINREP_TRUSTED_PROXIES` | comma-separated CIDRs |
| Upload limit | `--max-upload-mb` / `FINREP_MAX_UPLOAD_MB` | default 10 |
| Log level | `--log-level` / `FINREP_LOG_LEVEL` | debug, info, warn, error |

Membership of the group is checked when you sign in. Removing someone from the group takes effect when their
session ends (24 hours idle, 30 days at most).

## First use

1. **Settings → Accounts → Add account.** Add your bank account and each card. For a card, give the last four
   digits (statement files are matched to cards by them) and its **billing rules**: the bill day, the cutoff
   day and, for a foreign-purchase rule, how many months later it bills. For example: local purchases bill on
   the 10th with a cutoff on the 10th; Isracard foreign purchases bill on the 2nd of the month after next.
2. **Import.** Drop a Leumi `.xls` export or a card statement PDF. You see what would change before anything is
   saved, and a statement whose lines do not add up to its printed total is rejected. Importing the same file
   again adds nothing, and every import can be undone.
3. **Settings → Categorization model.** Point it at an OpenAI-compatible endpoint such as LocalAI, then use
   **Categorize now**. A decision model picks an existing category when it is confident enough (default 75%).
   Otherwise a generator model creates a new one, marked as created by the model so you can keep, rename,
   merge or delete it. Anything you set by hand is never overwritten, and a run can be undone.
4. **Accounts → Match bank debits to bills.** The bank debit that paid a card bill is linked to it, which keeps
   card payments out of your spending totals (the purchases already count). Add the words that mark a card
   payment in your bank (for example `ישראכרט`) under **Settings → Card payments in the bank**. A card whose
   statements you do not import can be handled by putting its payments in a category such as "Wife's Cards".

## Concepts worth knowing

- **Purchased and billed.** *Purchased* is the day the card was used; *billed* is the day the bank account was
  debited. A purchase on a Friday or Saturday counts as the following Sunday for the cutoff, and a bill date on
  a Saturday moves to Sunday.
- **Employer coverage.** A negative card line such as `חיוב תקציב סאפ` cancels part or all of a purchase.
  Reports show the purchase as bought (**As bought**) or as you paid for it (**Out of pocket**); statements and
  bank debits always use what you paid.
- **Earliest date.** Nothing before 2023-01-01 is stored.

## MCP: use your data from an AI agent

Eight read-only tools: `list_accounts`, `get_account_summary`, `query_transactions`, `get_net_worth_trend`,
`get_category_breakdown`, `get_cash_flow`, `get_recurring`, `get_statements`. They never change data.

**Local process (stdio)**, for example in Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "finrep": {
      "command": "/usr/local/bin/finrep",
      "args": ["--mode=mcp", "--db-path=/path/to/finrep.db"]
    }
  }
}
```

**Remote (Streamable HTTP)** at `https://your-host/mcp` with the header `Authorization: Bearer <FINREP_MCP_TOKEN>`.
The token opens only `/mcp`, never the web interface or the REST API.

## Backup and restore

All data is in one SQLite file (plus `-wal` and `-shm` files while the app runs). A plain file copy of a
running database can be inconsistent, so use SQLite's own backup command, which is safe while the app is running:

```sh
sqlite3 /path/to/finrep.db ".backup '/path/to/backup.db'"
```

With the Docker volume, run that against the volume's `finrep.db` (for example from a throwaway container
that mounts the same volume), or stop the container and copy the file.

To restore, stop the app, replace `finrep.db` and delete any `finrep.db-wal` and `finrep.db-shm` next to it.
The schema is migrated forward automatically on start; a database from a newer version is refused.

## Development

```sh
task lint        # gofmt, go vet, and a syntax check of every UI module
task test        # Go tests
task test-race   # Go tests with the race detector
task test-ui     # browser smoke test (needs Google Chrome)
```

Layout: `cmd/finrep` (the binary), `internal/` (`ledger`, `importer`, `billing`, `categorize`, `reports`, `api`,
`authn`, `mcpsrv`, `webui` and friends), `docs/SPECIFICATION.md` (what it does) and
`docs/IMPLEMENTATION_PLAN.md` (how it was built). Real statements and exports are never committed; tests that
use them are opt-in through `FINREP_BANK_DIR` and `FINREP_PDF_DIR`.
