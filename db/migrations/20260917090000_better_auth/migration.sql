-- 20260917090000_better_auth
--
-- Purpose:
--   Add Better Auth session/credential tables and the user columns the
--   adapter expects. Login passwords live in account.password.
--
-- Preconditions:
--   20260917080000_init_trial_slice has been applied.
--
-- Rollback:
--   db/migrations/20260917090000_better_auth.down.sql

ALTER TABLE users
    ADD COLUMN email_verified boolean NOT NULL DEFAULT true,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN image text;

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

COMMENT ON COLUMN users.password_hash IS
    'Legacy pgcrypto hash from the SQL seed. Better Auth stores the login hash in account.password.';

CREATE TABLE session (
    id text PRIMARY KEY,
    expires_at timestamptz NOT NULL,
    token text NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    ip_address text,
    user_agent text,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT session_token_key UNIQUE (token)
);

CREATE INDEX session_user_id_idx ON session (user_id);

CREATE TABLE account (
    id text PRIMARY KEY,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamptz,
    refresh_token_expires_at timestamptz,
    scope text,
    password text,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT account_provider_account_key UNIQUE (provider_id, account_id)
);

CREATE INDEX account_user_id_idx ON account (user_id);

CREATE TABLE verification (
    id text PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz,
    updated_at timestamptz
);
