-- Rollback for 20260917090000_better_auth.
-- Preconditions: local/dev database only.

DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;

ALTER TABLE users
    DROP COLUMN IF EXISTS email_verified,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS image;

UPDATE users SET password_hash = '' WHERE password_hash IS NULL;

ALTER TABLE users
    ALTER COLUMN password_hash SET NOT NULL;
