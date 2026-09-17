-- 20260917100000_trial_intake_from_public_form
--
-- Purpose:
--   Expand parent/guardian, student and catalogue course fields to match the
--   public trial form at https://www.austineducation.com.au/zh/book-a-trial
--   plus the published course list on /zh/courses and campus pages.
--
-- Preconditions:
--   20260917080000_init_trial_slice and 20260917090000_better_auth applied.
--
-- Assumptions (dropdown HTML was not fully published):
--   Grade options are Year 1–12.
--   Subject options follow the published catalogue, not an unseen <select>.
--   Ausyouth Music is a separate brand and is not in this catalogue.
--
-- Rollback:
--   db/migrations/20260917100000_trial_intake_from_public_form.down.sql

CREATE TYPE "CourseProgram" AS ENUM ('primary', 'junior', 'vce', 'exam_prep', 'ucat');
CREATE TYPE "CourseSubject" AS ENUM (
    'english',
    'eal',
    'english_language',
    'writing',
    'maths',
    'general_maths',
    'maths_methods',
    'specialist_maths',
    'science',
    'chemistry',
    'biology',
    'physics',
    'psychology',
    'latin',
    'selective_entry',
    'scholarship',
    'ucat'
);
CREATE TYPE "GuardianRelationship" AS ENUM ('parent', 'guardian');
CREATE TYPE "TrialSubmittedBy" AS ENUM ('student', 'guardian');
CREATE TYPE "ReferralSource" AS ENUM (
    'instagram',
    'facebook',
    'other_social',
    'friend_referral',
    'open_day',
    'web_search',
    'other'
);

CREATE TABLE campuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    name_zh text NOT NULL,
    suburb text,
    address text,
    year_from integer NOT NULL,
    year_to integer NOT NULL,
    is_online boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campuses_code_key UNIQUE (code),
    CONSTRAINT campuses_year_range_check CHECK (
        year_from >= 1 AND year_to <= 12 AND year_from <= year_to
    )
);

COMMENT ON TABLE campuses IS
    'Public trial-form campuses: Box Hill, Mt Waverley, Melbourne city, Ormond, Point Cook, Adelaide, Online.';

CREATE TABLE guardians (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    marketing_opt_in boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT guardians_email_format CHECK (position('@' IN email) > 1)
);

CREATE INDEX guardians_email_idx ON guardians (email);

COMMENT ON TABLE guardians IS
    'Parent/guardian contact from trial form section B. One guardian may link to several students.';
COMMENT ON COLUMN guardians.phone IS
    'Full number. UI must mask until the student card is expanded.';

CREATE TABLE student_guardians (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    guardian_id uuid NOT NULL REFERENCES guardians (id) ON DELETE RESTRICT,
    relationship "GuardianRelationship" NOT NULL DEFAULT 'parent',
    is_primary boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT student_guardians_student_guardian_key UNIQUE (student_id, guardian_id)
);

CREATE INDEX student_guardians_guardian_id_idx ON student_guardians (guardian_id);

ALTER TABLE students
    ADD COLUMN current_school text,
    ADD COLUMN email text,
    ALTER COLUMN year_level SET NOT NULL,
    DROP COLUMN guardian_name;

ALTER TABLE students
    ADD CONSTRAINT students_year_level_check CHECK (
        year_level ~ '^Year ([1-9]|1[0-2])$'
    ),
    ADD CONSTRAINT students_email_format CHECK (
        email IS NULL OR position('@' IN email) > 1
    );

COMMENT ON COLUMN students.email IS
    'Optional. Present when the public form was submitted as student (section A).';
COMMENT ON COLUMN students.current_school IS
    'Current school from the trial form.';

ALTER TABLE courses
    ADD COLUMN name_en text,
    ADD COLUMN subject "CourseSubject",
    ADD COLUMN program "CourseProgram",
    ADD COLUMN year_from integer,
    ADD COLUMN year_to integer;

UPDATE courses
SET
    name_en = name,
    subject = 'maths',
    program = 'primary',
    year_from = 1,
    year_to = 6
WHERE subject IS NULL;

ALTER TABLE courses
    ALTER COLUMN name_en SET NOT NULL,
    ALTER COLUMN subject SET NOT NULL,
    ALTER COLUMN program SET NOT NULL,
    ALTER COLUMN year_from SET NOT NULL,
    ALTER COLUMN year_to SET NOT NULL,
    ADD CONSTRAINT courses_year_range_check CHECK (
        year_from >= 1 AND year_to <= 12 AND year_from <= year_to
    );

COMMENT ON TABLE courses IS
    'Published catalogue (what families pick on the trial form), not a dated class.';

ALTER TABLE classes
    ADD COLUMN campus_id uuid REFERENCES campuses (id) ON DELETE RESTRICT;

-- Existing classes stay valid after seed reloads. Placeholder campus for any
-- leftover row if migrate runs against a previously seeded database.
INSERT INTO campuses (
    id, code, name, name_zh, suburb, address, year_from, year_to, is_online
) VALUES (
    '09000000-0000-4000-8000-000000000000',
    'unspecified',
    'Unspecified',
    '未指定',
    NULL,
    NULL,
    1,
    12,
    false
);

UPDATE classes
SET campus_id = '09000000-0000-4000-8000-000000000000'
WHERE campus_id IS NULL;

ALTER TABLE classes
    ALTER COLUMN campus_id SET NOT NULL;

CREATE INDEX classes_campus_id_idx ON classes (campus_id);

ALTER TABLE trial_cases
    ADD COLUMN preferred_campus_id uuid REFERENCES campuses (id) ON DELETE RESTRICT,
    ADD COLUMN requested_course_id uuid REFERENCES courses (id) ON DELETE RESTRICT,
    ADD COLUMN submitted_by "TrialSubmittedBy" NOT NULL DEFAULT 'guardian',
    ADD COLUMN referral_source "ReferralSource",
    ADD COLUMN concerns text;

CREATE INDEX trial_cases_preferred_campus_id_idx ON trial_cases (preferred_campus_id);
CREATE INDEX trial_cases_requested_course_id_idx ON trial_cases (requested_course_id);

COMMENT ON COLUMN trial_cases.preferred_campus_id IS
    'Campus chosen on the public trial form before a class is scheduled.';
COMMENT ON COLUMN trial_cases.requested_course_id IS
    'Catalogue subject/program requested on the form.';
COMMENT ON COLUMN trial_cases.submitted_by IS
    'Form section A (student) or B (parent/guardian).';
COMMENT ON COLUMN trial_cases.referral_source IS
    'How did you hear about us.';
COMMENT ON COLUMN trial_cases.concerns IS
    'Special questions or concerns from the form.';
