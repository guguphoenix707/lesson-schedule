-- Rollback for 20260917080000_init_trial_slice.
-- Preconditions: local/dev database only. Destroys all rows in these tables.
-- Recovery: restore from backup, or re-apply migration.sql and seed.

DROP TRIGGER IF EXISTS trial_cases_set_updated_at ON trial_cases;
DROP FUNCTION IF EXISTS set_updated_at();

DROP TABLE IF EXISTS follow_ups;
DROP TABLE IF EXISTS session_participants;
DROP TABLE IF EXISTS trial_cases;
DROP TABLE IF EXISTS class_sessions;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS "FollowUpOutcome";
DROP TYPE IF EXISTS "AttendanceStatus";
DROP TYPE IF EXISTS "BookingStatus";
DROP TYPE IF EXISTS "SessionKind";
DROP TYPE IF EXISTS "TrialCaseStatus";
DROP TYPE IF EXISTS "ClassSessionStatus";
DROP TYPE IF EXISTS "UserRole";

-- Extensions may be shared; leave them in place.
