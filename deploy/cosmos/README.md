# Deploying FinRep on Cosmos Cloud with Authentik login

## 1. Authentik (already created: application `fin-rep`)
- Provider: OAuth2/OpenID, **public** client (PKCE, no client secret). The client ID is in `cosmos-compose.json`.
- Redirect URI (strict): `https://finrep.example.com/auth/callback`
  (`http://localhost:8080/auth/callback` for a local run).
- Create the group **`FinRep_Users`**, add yourself, and bind it to the application. The built-in `profile` scope
  puts the user's groups in the token (`groups` claim); FinRep refuses anyone who is not in the group.
- Issuer: `https://auth.example.com/application/o/fin-rep/` (matches the discovery document).

## 2. The image
Cosmos pulls the image, so build it and push it somewhere it can reach (change the tag in the JSON to match):

    docker build -t ghcr.io/liorokman/finrep:0.1.0 .
    docker push ghcr.io/liorokman/finrep:0.1.0

## 3. Import into Cosmos
URLs -> Add -> Import compose -> `cosmos-compose.json`, replace the placeholders:
- `<SESSION_SECRET>`: `head -c 48 /dev/urandom | base64` (at least 32 bytes; signs the session cookies)
- `<MCP_TOKEN>`: `head -c 32 /dev/urandom | base64`, or delete that line to switch the HTTP MCP endpoint off

Leave the route's **Authentication required OFF**: the app does its own OIDC login. The MCP endpoint
(`https://finrep.example.com/mcp`) uses the bearer token and never opens the web interface.

## 4. Load your existing data (once)
Stop the container, copy a consistent snapshot into the volume, start it again:

    sqlite3 data/finrep-real.db ".backup '/tmp/finrep.db'"
    docker cp /tmp/finrep.db finrep:/data/finrep.db        # the container may be stopped
    docker run --rm -v finrep-data:/data alpine chown 10001:10001 /data/finrep.db

The volume's real name in Docker may carry a Cosmos prefix (`docker volume ls`). Remove stale
`finrep.db-wal` / `finrep.db-shm` files in the volume if any exist. The categorization settings (LocalAI address and
key) are stored in the database; check them under Settings after the move.

## 5. Backups and upgrades
Back up with SQLite's own command (safe while running), for example from the Docker host:

    docker exec finrep sh -c 'wget -qO- http://127.0.0.1:8080/healthz'   # health check
    docker run --rm -v finrep-data:/data -v "$PWD":/out keinos/sqlite3 sqlite3 /data/finrep.db ".backup '/out/finrep-backup.db'"

To upgrade: back up, push a new tag, change the tag in Cosmos, recreate. Migrations run forward at start.
