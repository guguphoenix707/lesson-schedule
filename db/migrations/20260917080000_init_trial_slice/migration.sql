-- 20260917080000_init_trial_slice
--
-- Purpose:
--   Create the schema required by this period's trial journey
--   (Admin / Teacher login, unpaid students, schedule, attendance, follow-up).
--
-- Preconditions:
--   PostgreSQL 14+; empty public schema or no colliding table names.
--   Role can CREATE EXTENSION (pgcrypto, btree_gist).
--
-- Compatibility:
--   First schema. Additive only. Does not migrate existing business data.
--   Business timestamps are timestamptz; interpret and display as
--   Australia/Melbourne. This file does not change the database TimeZone.
--
-- Not in this migration (designed, later modules):
--   schedule_rules, enrollments, credit_accounts, credit_entries,
--   parents / student_guardians. session_participants.kind is trial-only
--   until the enrollment module relaxes the CHECK and adds enrollment_id.
--
-- Extra constraints Prisma cannot express:
--   CHECKs, partial unique indexes, assigned-teacher exclusion, updated_at trigger.
--
-- Rollback:
--   db/migrations/20260917080000_init_trial_slice.down.sql
--   Drops objects created here. Do not run against retained user data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "UserRole" AS ENUM ('admin', 'teacher');
CREATE TYPE "ClassSessionStatus" AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE "TrialCaseStatus" AS ENUM (
    'pending_schedule',
    'scheduled',
    'pending_followup',
    'following_up',
    'interested',
    'closed'
);
CREATE TYPE "SessionKind" AS ENUM ('trial');
CREATE TYPE "BookingStatus" AS ENUM ('booked', 'cancelled');
CREATE TYPE "AttendanceStatus" AS ENUM ('pending', 'present', 'absent');
CREATE TYPE "FollowUpOutcome" AS ENUM (
    'unreachable',
    'considering',
    'interested',
    'not_interested'
);

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    display_name text NOT NULL,
    role "UserRole" NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_email_format CHECK (position('@' IN email) > 1)
);

COMMENT ON TABLE users IS
    'Staff accounts. Admin and teacher share one login table; diagrams split roles only.';
COMMENT ON COLUMN users.password_hash IS
    'pgcrypto bf hash for local seed/demo until an auth module owns credentials.';

CREATE TABLE students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    year_level text,
    guardian_name text,
    phone text,
    notes text,
    owner_admin_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX students_owner_admin_id_idx ON students (owner_admin_id);

COMMENT ON TABLE students IS
    'Student facts and current owner. Trial workflow status lives on trial_cases, not here.';
COMMENT ON COLUMN students.phone IS
    'Full number for the expanded student card. UI must mask until the user opens details.';
COMMENT ON COLUMN students.owner_admin_id IS
    'Current responsible admin. Transfer updates this; historical follow-ups keep author_admin_id.';

CREATE TABLE courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT courses_name_key UNIQUE (name)
);

CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES courses (id) ON DELETE RESTRICT,
    default_teacher_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classes_name_key UNIQUE (name)
);

CREATE INDEX classes_course_id_idx ON classes (course_id);
CREATE INDEX classes_default_teacher_id_idx ON classes (default_teacher_id);

COMMENT ON TABLE classes IS
    'Ongoing class. Weekly templates (schedule_rules) are a later module; this period seeds concrete sessions.';

CREATE TABLE class_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    planned_teacher_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    assigned_teacher_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status "ClassSessionStatus" NOT NULL DEFAULT 'scheduled',
    cancel_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT class_sessions_time_order CHECK (ends_at > starts_at),
    CONSTRAINT class_sessions_cancel_reason_check CHECK (
        (status = 'cancelled' AND cancel_reason IS NOT NULL)
        OR (status <> 'cancelled' AND cancel_reason IS NULL)
    )
);

CREATE INDEX class_sessions_class_id_idx ON class_sessions (class_id);
CREATE INDEX class_sessions_assigned_teacher_ends_idx
    ON class_sessions (assigned_teacher_id, ends_at)
    WHERE status <> 'cancelled';

ALTER TABLE class_sessions
    ADD CONSTRAINT class_sessions_assigned_teacher_no_overlap
    EXCLUDE USING gist (
        assigned_teacher_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    )
    WHERE (status <> 'cancelled');

COMMENT ON TABLE class_sessions IS
    'One dated lesson. Substitute teaching changes assigned_teacher_id and keeps planned_teacher_id.';
COMMENT ON COLUMN class_sessions.status IS
    'scheduled/completed/cancelled. "Waiting vs needs teacher result" is derived from ends_at and attendance, not a timer job.';

CREATE TABLE trial_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    status "TrialCaseStatus" NOT NULL,
    next_followup_at timestamptz,
    followup_draft text,
    closed_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT trial_cases_student_id_key UNIQUE (student_id),
    CONSTRAINT trial_cases_followup_time_check CHECK (
        (status = 'following_up' AND next_followup_at IS NOT NULL)
        OR (status IN ('interested', 'closed') AND next_followup_at IS NULL)
        OR (status IN ('pending_schedule', 'scheduled', 'pending_followup'))
    ),
    CONSTRAINT trial_cases_closed_reason_check CHECK (
        (status = 'closed' AND closed_reason IS NOT NULL)
        OR (status <> 'closed' AND closed_reason IS NULL)
    )
);

CREATE INDEX trial_cases_status_idx ON trial_cases (status);
CREATE INDEX trial_cases_followup_due_idx
    ON trial_cases (next_followup_at)
    WHERE status = 'following_up';

COMMENT ON TABLE trial_cases IS
    'One trial workflow per student. Created at signup, before any session is booked.';
COMMENT ON COLUMN trial_cases.status IS
    'Workbench queue key. pending_schedule covers first booking and rebook after absence/cancel.';
COMMENT ON COLUMN trial_cases.followup_draft IS
    'Admin communication draft. Saving it must not advance status.';

CREATE TABLE session_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    session_id uuid NOT NULL REFERENCES class_sessions (id) ON DELETE RESTRICT,
    trial_case_id uuid NOT NULL REFERENCES trial_cases (id) ON DELETE RESTRICT,
    kind "SessionKind" NOT NULL DEFAULT 'trial',
    booking_status "BookingStatus" NOT NULL DEFAULT 'booked',
    attendance "AttendanceStatus" NOT NULL DEFAULT 'pending',
    teacher_feedback jsonb,
    cancelled_at timestamptz,
    cancel_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT session_participants_session_student_key UNIQUE (session_id, student_id),
    CONSTRAINT session_participants_booking_attendance_check CHECK (
        (booking_status = 'cancelled' AND attendance = 'pending')
        OR (booking_status = 'booked')
    ),
    CONSTRAINT session_participants_cancel_fields_check CHECK (
        (
            booking_status = 'cancelled'
            AND cancelled_at IS NOT NULL
            AND cancel_reason IS NOT NULL
        )
        OR (
            booking_status = 'booked'
            AND cancelled_at IS NULL
            AND cancel_reason IS NULL
        )
    ),
    CONSTRAINT session_participants_feedback_check CHECK (
        (attendance = 'pending' AND teacher_feedback IS NULL)
        OR (
            attendance = 'present'
            AND teacher_feedback ? 'performance'
            AND teacher_feedback ? 'fit_suggestion'
        )
        OR (attendance = 'absent')
    )
);

CREATE INDEX session_participants_student_id_idx ON session_participants (student_id);
CREATE INDEX session_participants_trial_case_id_idx ON session_participants (trial_case_id);

CREATE UNIQUE INDEX session_participants_one_present_trial
    ON session_participants (trial_case_id)
    WHERE kind = 'trial' AND attendance = 'present';

CREATE UNIQUE INDEX session_participants_one_open_trial_booking
    ON session_participants (trial_case_id)
    WHERE kind = 'trial'
        AND booking_status = 'booked'
        AND attendance = 'pending';

COMMENT ON TABLE session_participants IS
    'One student on one session roster. Trial and future regular classes share this table; this period only inserts kind=trial.';
COMMENT ON COLUMN session_participants.teacher_feedback IS
    'present: {performance, fit_suggestion, questions_for_admin?}; absent: {absent_note?} optional.';

CREATE TABLE follow_ups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_case_id uuid NOT NULL REFERENCES trial_cases (id) ON DELETE RESTRICT,
    author_admin_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    outcome "FollowUpOutcome" NOT NULL,
    summary text,
    next_followup_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT follow_ups_summary_check CHECK (
        outcome = 'unreachable'
        OR (
            outcome IN ('considering', 'interested', 'not_interested')
            AND summary IS NOT NULL
            AND btrim(summary) <> ''
        )
    ),
    CONSTRAINT follow_ups_next_time_check CHECK (
        (
            outcome IN ('unreachable', 'considering')
            AND next_followup_at IS NOT NULL
        )
        OR (
            outcome IN ('interested', 'not_interested')
            AND next_followup_at IS NULL
        )
    )
);

CREATE INDEX follow_ups_trial_case_id_created_idx
    ON follow_ups (trial_case_id, created_at DESC);

COMMENT ON TABLE follow_ups IS
    'Each contact attempt. Historical next_followup_at stays on the row; current due time is trial_cases.next_followup_at.';

CREATE INDEX session_participants_open_pending_idx
    ON session_participants (session_id)
    WHERE booking_status = 'booked' AND attendance = 'pending';

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trial_cases_set_updated_at
    BEFORE UPDATE ON trial_cases
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
