-- Rollback for 20260917100000_trial_intake_from_public_form.
-- Preconditions: local/dev database only.

DROP INDEX IF EXISTS trial_cases_requested_course_id_idx;
DROP INDEX IF EXISTS trial_cases_preferred_campus_id_idx;
DROP INDEX IF EXISTS classes_campus_id_idx;
DROP INDEX IF EXISTS student_guardians_guardian_id_idx;
DROP INDEX IF EXISTS guardians_email_idx;

ALTER TABLE trial_cases
    DROP COLUMN IF EXISTS concerns,
    DROP COLUMN IF EXISTS referral_source,
    DROP COLUMN IF EXISTS submitted_by,
    DROP COLUMN IF EXISTS requested_course_id,
    DROP COLUMN IF EXISTS preferred_campus_id;

ALTER TABLE classes
    DROP COLUMN IF EXISTS campus_id;

DROP TABLE IF EXISTS student_guardians;
DROP TABLE IF EXISTS guardians;
DROP TABLE IF EXISTS campuses;

ALTER TABLE students
    DROP CONSTRAINT IF EXISTS students_email_format,
    DROP CONSTRAINT IF EXISTS students_year_level_check,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS current_school,
    ALTER COLUMN year_level DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS guardian_name text;

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS courses_year_range_check,
    DROP COLUMN IF EXISTS year_to,
    DROP COLUMN IF EXISTS year_from,
    DROP COLUMN IF EXISTS program,
    DROP COLUMN IF EXISTS subject,
    DROP COLUMN IF EXISTS name_en;

DROP TYPE IF EXISTS "ReferralSource";
DROP TYPE IF EXISTS "TrialSubmittedBy";
DROP TYPE IF EXISTS "GuardianRelationship";
DROP TYPE IF EXISTS "CourseSubject";
DROP TYPE IF EXISTS "CourseProgram";
