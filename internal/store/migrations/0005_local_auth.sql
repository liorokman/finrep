-- Local authentication (--auth=local): the single admin user, and secrets the application generates for itself.
-- The password is stored only as a salted PBKDF2 hash. generation changes with every password change, which
-- ends all other sessions.
CREATE TABLE local_auth (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    generation    INTEGER NOT NULL DEFAULT 1,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_secrets (
    name  TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
