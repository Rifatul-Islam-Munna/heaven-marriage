# Niqaha staff roles and permissions

## Admin setup

1. Log in as Administrator.
2. Visit /dashboard/access (Dashboard sidebar: কর্মী ও রোল পারমিশন).
3. Choose an existing staff member, or search for a registered account by name, email, phone, or user ID.
4. Select SEO, Blog, Manager, or Normal user.
5. For Manager, check the precise dashboard sections permitted.
6. Click Save access. These settings are saved in MongoDB.

Roles:
- Admin: all pages, staff role administration, and all admin APIs.
- SEO: /dashboard/seo only. Cannot open Blog Studio or staff management.
- Blog: /dashboard/blog and /dashboard/blog/[id] only. Can upload blog images, but cannot enter the media library or advanced SEO Studio.
- Manager: only the admin sections checked by the administrator.
- User: normal member access only, no administrative pages.
- Existing legacy Editor role has no special dashboard permission.

Manager page choices:
- users: /dashboard, /dashboard/edit-profile/[id]
- faq: /dashboard/faq
- guidelines: /dashboard/guideline
- contact: /dashboard/contact
- visual-editor: /dashboard/visual-editor
- seo: /dashboard/seo
- blog: /dashboard/blog and article editors
- images: /dashboard/images
- pricing: /dashboard/pricing
- questions: /dashboard/user-question
- settings: /dashboard/settings
- upgrades: /dashboard/upgrades

Staff role administration is deliberately NOT an assignable manager permission.

## Security rules

- NestJS AuthGuard reads the current role and manager permissions from MongoDB on every authenticated request. Role changes and revocations apply to the next request, even with an old login token.
- NestJS RolesGuard enforces DashboardPermission metadata on admin controller methods. Page hiding is never the only security boundary.
- The Next.js Dashboard layout loads the authorized role and filters sidebar entries. Each dashboard section has its own server-rendered access gate, including nested article/profile editor pages.
- Only Admin can search for staff, assign roles and update manager page permissions. Administrator accounts cannot be demoted in this panel; a regular account cannot be promoted directly to administrator through the panel.
- Managers with Users permission can edit normal member accounts, but cannot manage other staff or administrator profiles through user management.
- SEO and Blog fixed roles have immutable single-section permissions; manager grants do not accidentally carry over when the role is changed.
- The shared image endpoint allows blog and visual editors to upload images, without granting access to unrelated media-management pages. Blog/visual staff are limited to image media.
- Public read-only question/FAQ/guideline/blog and SEO endpoints remain accessible to ordinary visitors; corresponding admin writes are protected.
- Original member accounts, biodata answers, SEO, and blog records remain in the database and are not deleted by assigning roles.
- Every staff assignment is recorded in the staff_access_audit collection.

## Files

Backend: backend/src/staff-access, backend/src/lib/auth.guard.ts, backend/src/lib/roles.guard.ts, backend/src/user/entities/user.entity.ts.

Frontend: frontend/app/dashboard/access, frontend/components/custom/dashboard/StaffAccessManager.tsx, frontend/lib/dashboard-session.ts, frontend/lib/dashboard-access.ts, frontend/app/api/staff-access/[...parts]/route.ts.

## Verification

Backend:
- cd backend
- npm run build
- npx jest --runInBand staff-access roles.guard.spec.ts question-config seo-settings blog.service.spec.ts

Frontend:
- cd frontend
- npm run build
- npm run test:staff
- npm run test:seo
- npm run test:blog
- npm run test:question-builder
- npm run test:visual-editor

The staff smoke test uses fake accounts and a mock backend, not production users.

## Deployment

Deploy/restart the updated NestJS backend and Next.js frontend together. Confirm MongoDB is connected and frontend BASE_URL points at the updated backend. Use existing member accounts to assign SEO, Blog, and Manager roles, and verify each with a separate non-admin login.
