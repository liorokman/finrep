# Deploying FinRep on Cosmos Cloud with Authentik login

## 1. Authentik (already created: application `fin-rep`)
- Provider: OAuth2/OpenID, **public** client (PKCE, no client secret). The client ID is in `cosmos-compose.json`.
- Redirect URI (strict): `https://finrep.example.com/auth/callback`
  (`http://localhost:8080/auth/callback` for a local run).
- Create the group **`FinRep_Users`**, add yourself, and bind it to the application. The built-in `profile` scope
  puts the user's groups in the token (`groups` claim); FinRep refuses anyone who is not in the group.
- Issuer: `https://auth.example.com/application/o/fin-rep/` (matches the discovery document).

## 2. The image
Cosmos always pulls the image from a registry, even when it is already on the host. The first deployment used a
throwaway registry on the Cosmos host itself (Docker allows plain HTTP to `localhost`), so nothing was published:

    docker build -t finrep:0.1.0 .
    docker save finrep:0.1.0 | ssh cosmos.example.com docker load
    ssh cosmos.example.com 'docker run -d --name finrep-tmp-registry -p 127.0.0.1:5000:5000 registry:2 &&
      docker tag finrep:0.1.0 localhost:5000/finrep:0.1.0 && docker push localhost:5000/finrep:0.1.0'

The compose file uses `localhost:5000/finrep:0.1.0`. For a registry such as ghcr.io, push there and change the tag.

## 3. Secrets and import into Cosmos
Cosmos did not pass secret-looking environment values through unchanged, so the two secrets are read from files in
the data volume (`FINREP_SESSION_SECRET_FILE`, `FINREP_MCP_TOKEN_FILE`). Create them once, owned by UID 10001:

    head -c 48 /dev/urandom | base64 -w0     # session secret (at least 32 bytes; signs the login cookies)
    head -c 32 /dev/urandom | base64 -w0 | tr '+/' '-_' | tr -d '='   # MCP bearer token; drop the env line to disable /mcp

    printf %s "$VALUE" | ssh cosmos 'docker run --rm -i --user root --entrypoint sh -v finrep-data:/data \
      localhost:5000/finrep:0.1.3 -c "cat > /data/mcp_token && chown 10001:10001 /data/mcp_token && chmod 400 /data/mcp_token"'

Then create or update the service. Cosmos replaces the container and the route when the name already exists:

    curl -sk -X POST -H "Authorization: Bearer $COSMOS_TOKEN" -H "Content-Type: application/json" \
      --data @deploy/cosmos/cosmos-compose.json https://cosmos.example.com/cosmos/api/docker-service

(or Cosmos UI: URLs -> Add -> Import compose). Leave the route's **Authentication required OFF**: the app does its
own OIDC login. The MCP endpoint (`https://finrep.example.com/mcp`) takes the bearer token and never
opens the web interface.

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
