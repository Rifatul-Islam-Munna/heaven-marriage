# Niqaha — Dynamic Profile Question Builder

## Usage

1. Log in as an administrator.
2. Open Admin dashboard → ডাইনামিক প্রশ্ন বিল্ডার, route: /dashboard/user-question.
3. Choose an existing question on the left, or click Add new.
4. Configure the user-facing question, gender, one of 10 sections, answer type, required/optional, public visibility, order and public label.
5. Click Save all changes. This saves a new revision to MongoDB and invalidates the published question-config cache.

### Input types

Short text; large textarea; number; select; dropdown; single checkbox (yes/no); and multi-checkbox.
For choice options, write one per line in this format:
Display label | stored_value

Keep stored values unchanged when simply renaming a display label to preserve existing answers.

### Separate question and public biodata label

Example:
- Question shown to user: How old are you?
- Answer type: Number
- Form section: Basic information
- Target: Both men and women
- Public label: Age
- Public visibility: On
- Answer given by user: 30

Visitors see **Age: 30**, not “How old are you?: 30”. New public answers appear inside their selected existing biodata section.

### Default questions and existing data

- **77 currently rendered questions** are included as the default schema, including gender-specific marriage questions.
- Old manually added custom questions in the existing MongoDB customquestions collection also appear in the new builder.
- Original built-in profile answers remain in their existing fields, such as age, address.district, personalInformation.height and marriageInformationWomen.*.
- Existing custom answers remain in users.customFields, keyed by the ORIGINAL question string. A stable legacyKey reference preserves answers even after the public/form label changes.
- New questions receive stable q_... IDs. Answers are saved under dynamicAnswers on each user's own user document.
- Deleting a question archives/hides it and preserves historic answers; they are not deleted.
- **Every non-authentication profile question** (including name, age, gender, marital status, height, education, and all pledge questions) can be renamed, retyped, moved, made optional, or removed from the form. There are no fixed mandatory profile questions.
- Removing a question archives it from forms and public biodata, preserving historical answers for restoring later.
- Changing the answer type of a built-in field to an incompatible data type preserves its original answer field in the database and stores the redesigned answer by stable question ID in the user's dynamicAnswers.
- Authentication credentials (password, email and phone number) are managed by the separate authentication system, not the profile question builder. Authentication, registration security, OTP and verified contact workflows are unchanged. The existing signup process still captures account name/gender for profile classification; removing their *profile-form question* does not delete account metadata.
- Admins can move any question between sections, reorder it, choose gender, or hide its answer from public biodata. Sections with no enabled questions automatically disappear from the member/admin step navigation.

### Privacy and display

Public biodata answers are filtered on the backend using the CURRENT saved question revision. If an admin disables a question or turns off "Show on public biodata", its previously saved answer is removed from the public API response and public details page immediately on the next request. This applies to built-in fields, pledges, moved/retyped questions, legacy custom questions and new questions. The original MongoDB user documents and answers are not changed when a question is hidden or archived.

Renaming a question only changes its form text; the separate public label controls the public detail row. Moving a question to another section relocates its public display. Renaming an answer choice updates the visible label while preserving the saved option value. Restoring a hidden/archived question immediately makes its old answer visible again if public visibility is turned back on.

The existing identity, verified contact and phone unlock rules remain active, regardless of the editor's public toggle. In particular, changing the visibility of a name, guardian contact or WhatsApp question **never bypasses paid identity unlock**. Private/archived identity questions are also hidden even after unlock. New custom public answer text is redacted for emails, phone-like numbers and known personal identifiers when the profile is locked. Legacy customFields are never rendered directly; they use the same public allowlist and question IDs as new answers.

The original biodata page design remains. Dynamic questions are rendered in its original section tables. Additional and pledge custom answers appear in their own section cards if shown publicly. The former separate additional-question builder is no longer necessary: the single builder handles those questions and preserves existing legacy records. Existing registration gender remains available internally to select male/female forms even if the gender *question* is disabled.

### Database and cache

- Question config: MongoDB profile_question_config, with revision and last editor.
- Audit history: MongoDB profile_question_audit.
- New answers: existing MongoDB users documents, under dynamicAnswers.
- Previous built-in and custom answers remain where they already were.
- The Next.js server caches the general member-form question catalog for **1,200 seconds (20 minutes)** and invalidates it when an admin saves a new revision.
- **Public biodata details do not rely on that 20-minute browser cache.** Each profile response already has to fetch the profile, and now contains the EXACT question schema revision used by the backend to filter its public fields. This avoids an extra question-config API request on the biodata page and prevents mismatched old labels/visibility on a fresh profile request.
- Admin read/save is never publicly cached. An already open biodata tab may need a refresh to show an administrator's later changes; new visitors receive the current revision.
- If the question API fails, the original 77-question baseline is used as fallback, with no data migration or reset.

### Validation

From backend:
npm run build
npx jest --runInBand question-config

From frontend:
npm run build
npm run test:question-builder

The frontend smoke test runs an isolated fake backend with real local Next.js and Chrome. It verifies that changing a question to private, archiving/deleting it, and restoring it immediately updates the public biodata page while the stored answer stays untouched. The backend question-config Jest suite also uses an isolated in-memory MongoDB server to verify old profile field retention, restored answers, historical custom questions, renamed labels, moved fields, pledge visibility, revision conflicts and compatibility with old input types. Neither test writes to real users or the production database.

### Deployment

Deploy/restart both the updated frontend and backend together and ensure BASE_URL/MongoDB are configured. No live deployment is performed as part of the local code changes.

The original default-question snapshots are retained in `frontend/lib/profile-question-defaults.json` and `backend/src/profile-questions/default-question-registry.ts`, because the application uses them as fallbacks. One-time generation helpers and an unused duplicate JSON snapshot were removed during cleanup. Do not overwrite these defaults automatically on production requests; administrators' changes remain stored separately in MongoDB.
