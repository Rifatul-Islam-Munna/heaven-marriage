# Niqaha Blog Studio — Admin Guide

## Public website
- Blog listing: /blog
- Article URL: /blog/<slug>
- RSS feed: /blog/feed.xml
- Dynamic XML sitemap: /sitemap.xml (includes published, indexable blog articles)
- Blog link appears in desktop/mobile navbar and website footer.

The blog uses the existing website's rose-and-cream design. It supports searchable article cards, category filters, featured stories, pagination, date/author/reading time, article image captions, related articles and an article table of contents.

## Create and publish an article
1. Sign in with a real **admin** account.
2. From the admin sidebar open **ব্লগ ও আর্টিকেল ম্যানেজার** at /dashboard/blog.
3. Click **New article**. A private draft is created; nothing becomes publicly visible.
4. Enter the **title** and choose a short and meaningful **URL slug** (click **From title** to generate it).
5. Add an informative excerpt/description, author name, category and comma-separated tags.
6. Upload an attractive cover picture, and write meaningful **alt text** explaining what appears in the picture.
7. Use the rich editor for H2–H4 headings, bold/italic/underline, bullet/numbered lists, blockquotes, code blocks, links and inline images. Image alt text is required; captions are optional.
8. Configure **SEO title** and **SEO description** if these should differ from the article title/excerpt. You can also flag a post as featured or noindex.
9. Click **Save draft**.
10. Click **Publish article**. The public article, listings, RSS and XML sitemap become up to date after cache invalidation.

You can change already-published articles by editing a new draft and clicking Save, then Publish update. Visitors continue seeing the previous published article until Publish update.

Do not change a published URL slug: published slugs are locked to protect existing links and indexing.

## Images
- Uploads use the existing admin-only image service and MinIO storage, via /api/blog/upload.
- JPEG, PNG, WebP or AVIF up to **8 MB**. When browser support permits, oversized pictures are converted/resized to optimized WebP (maximum 1800 px wide/high) before upload.
- Add article images by clicking **Insert image** in the editor, selecting a file or entering an image URL, then entering alt text and an optional caption.
- Configure the deployed MinIO endpoint with a publicly accessible HTTPS URL. The image service returns URLs based on MINIO_URL; localhost or HTTP image URLs will not work for production visitors.
- Blog image upload rejects other file types (video, PDF, SVG and executable content).

## SEO and indexing
- Server-generated, indexable pages with unique title/description/canonical, article-specific Open Graph and Twitter images, publish/update dates, author and descriptive image alt text.
- BlogPosting + BreadcrumbList schema.org JSON-LD on each article and Blog schema on the index.
- Article H2–H4 headings and table of contents help readers navigate meaningful sections.
- RSS feed, XML sitemap with last-modified dates, internal related-post links and fast loading image sizes.
- **Draft, archived and unpublished articles never appear publicly, in the sitemap, or in RSS**.
- A noindex article remains readable publicly but is omitted from XML sitemaps and marked noindex.
- Advanced per-article SEO overrides can be configured at /dashboard/seo after publication. Template /blog/[slug] settings apply to blog articles unless a more specific URL override exists. Percent-encoded Bangla slugs are supported.
- Search-engine ranking or rich-result display is never guaranteed: publish accurate, original, helpful content and check Google Search Console.

## Archive and recovery
- **Unpublish** hides the live article without removing the stored draft or published snapshot.
- **Archive** removes the article publicly without permanent data loss.
- Archived posts remain in the admin list. Open an archived post and click **Restore as draft** to make it editable again. You must publish to make it public again.

## Technical design
- Backend: backend/src/blog/blog.module.ts, blog.service.ts, blog.controller.ts.
- MongoDB: blog_posts (draft/published snapshots, slug unique index, revision), blog_audit (admin history).
- Only authenticated administrators can create, edit, publish, unpublish, restore and archive articles. The shared role guard enforces both controller-level and method-level permissions.
- Public endpoints return only published content; admin endpoints reject unsigned requests.
- Rich text is stored as validated Tiptap JSON. Server rendering uses controlled React nodes, not arbitrary HTML from the editor. HTML/script/event handlers, unsafe links and unsupported embeds are rejected.
- Public API data is cached for 20 minutes per request (list/category/article/sitemap); publish/unpublish/archive invalidates cache immediately. Browser responses do not need to query MongoDB on every visit.
- Original website pages and user profiles remain unchanged.

## Verification
Backend:
- cd backend
- npm run build
- npx jest --runInBand blog.service.spec.ts roles.guard.spec.ts question-config seo-settings

Frontend:
- cd frontend
- npm run build
- npm run test:blog
- npm run test:seo
- npm run test:question-builder
- npm run test:visual-editor

Smoke tests use a temporary mock backend and local Next.js/Chrome and never modify real posts, user information or production databases.

## Deploy
Deploy/restart NestJS and Next.js together; ensure BASE_URL, MongoDB, MinIO and the public HTTPS image host are configured on the server. Use view-source, Google Rich Results Test, /sitemap.xml, /blog/feed.xml and Google Search Console after publishing your first real article.
