# Niqaha — Admin SEO Manager

## How to change SEO for any existing page

1. Sign in as an administrator.
2. Open **Dashboard → অ্যাডভান্সড SEO ম্যানেজার** (URL: /dashboard/seo).
3. Choose a page from the route list or type a specific URL, such as /policies/privacy.
4. Use the Search Basics, Social Cards, Indexing & Sitemap, and Structured Data tabs.
5. Click **Save draft**. Your draft is in MongoDB but not visible to visitors.
6. Click **Publish** to update the server-generated metadata and sitemap.
7. To remove all overrides, click **Restore original defaults**, then Save and Publish.

The Visual Page Editor also links directly to the SEO editor for the selected URL.

## SEO fields

**Basic:** SEO title, meta description, optional keywords and author, canonical URL.

**Social:** Open Graph title/description/image/alt/type/locale for Facebook, Messenger and LinkedIn; X/Twitter cards, images, titles, descriptions, site/creator handles.

**Technical:** noindex/nofollow, nosnippet, noimageindex, noarchive, snippet and image preview limits; sitemap inclusion, priority and update frequency.

**Structured:** schema.org JSON-LD, and hreflang links for real translated equivalents.

**Global:** site name, default social image, Google and Bing verification tokens, global JSON-LD.

## Protection of private routes

Authentication, OTP, dashboard, personal profile, payments, and personal biodata details remain **noindex** and excluded from the sitemap. Admins may customize their titles, but never make those routes indexable.

Public pages such as /, /about, /contact, /pricing, /faq, /guidelines, /premium, /biodata (the public browse page), and approved policy pages are eligible for indexing.

Editing /policies/[kind] sets shared policy template metadata; editing /policies/privacy overrides only privacy. A saved but unpublished exact-page draft never overrides the currently published template.

## Storage, caching and fallback

- MongoDB: seo_page_settings (separate draft/published metadata) and seo_settings_audit (audit history).
- Backend: backend/src/seo-settings.
- Admin UI: frontend/components/custom/dashboard/SeoManager.tsx.
- Admin proxy: frontend/app/api/seo-settings/route.ts, protected by JWT/admin-role checks.
- Live metadata: frontend/lib/seo-settings-server.ts.
- Sitemap: frontend/app/sitemap.ts.
- JSON-LD renderer: frontend/components/custom/seo/SeoStructuredData.tsx.
- 20-minute **server-side** published-settings cache. After publishing, cached metadata and sitemap are invalidated.
- Admin queries are never publicly cached.
- Missing settings or unavailable backend: the original coded SEO remains the fallback.
- Existing page design, customer information and user profile answers are never modified by the SEO editor.

The route catalog automatically finds existing Next app pages when the project builds. A newly added route needs a metadata wrapper for server-side integration; all current routes have been integrated. Multiple separate Next servers need shared cache support for cross-instance invalidation.

## Search-engine accuracy

Keep titles and descriptions distinct and truthful. Google may rewrite snippet text. Meta keywords rarely help Google Search. Canonical URLs should indicate the preferred public page. Share images should be publicly accessible, ideally about 1200 x 630 pixels. Structured data should accurately describe content visible to users. Rich snippets and higher rankings are not guaranteed.

After deploying, use Google Search Console, Rich Results Test, view-source, /robots.txt, and /sitemap.xml to check the production website.

## Verification commands

Backend:
- cd backend
- npm run build
- npx jest --runInBand seo-settings question-config

Frontend:
- cd frontend
- npm run build
- npm run test:seo
- npm run test:question-builder
- npm run test:visual-editor

The automated SEO browser test uses an isolated mock backend and a separate local Next server; it never writes to the production MongoDB database.

## Deployment

Deploy/restart the updated frontend and backend together, ensuring frontend BASE_URL points at the correct NestJS backend and MongoDB is running. The local code changes alone do not deploy this feature.
