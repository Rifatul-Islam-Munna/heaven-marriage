# Niqaha Visual Page Editor

## Open the editor

1. Log in as an administrator.
2. Open **Dashboard → ভিজ্যুয়াল পেজ এডিটর** or visit `/dashboard/visual-editor`.
3. Browse the automatically generated route list (currently 34 pages) and choose **Open visual editor**.
4. On the real site page, click a heading, text node, button label, placeholder, image alt text or accessibility label. Edit Arabic, বাংলা or English text. You can preview while typing.
5. Select **Save draft**. The draft is stored in MongoDB and only visible to admins in editing mode.
6. Click **Publish page** or **Publish shared** (for the navigation/footer) to make it live.
7. To undo an edit, select **Restore default** then **Publish**. A saved-text list in the dashboard can also restore an empty/hidden override.

Administrators see an **Edit this page** shortcut on desktop and a pencil icon on mobile. It opens the currently viewed page with `?visualEdit=1`.

For parameterized routes such as `/biodata/[id]` or `/policies/[kind]`, enter a *real, existing URL* (e.g. `/policies/privacy`) into the custom page-path field. Its overrides belong to that exact URL, not every user record. The editor never copies original DOM text or private data into the database automatically; only the text an administrator explicitly saves is stored.

## Current content is always the fallback

- Existing Next.js JSX components and styling are not replaced by the CMS.
- No edit = no database record and no override.
- When no published key exists, the renderer leaves the original page text untouched.
- When the backend is unreachable, the frontend serves an empty override map so the original website is displayed.
- The editor writes plain text/accessible attributes, never arbitrary HTML or executable code.
- Image uploads/replacement, rich layout changes, drag/drop sections and user profile data editing are not part of this text editor.
- DOM positions generate IDs. If you deploy structural changes to a component, a saved override may need to be re-selected; avoid substantially reordering markup without checking saved text.

## Persistence and caching

- NestJS module: `backend/src/visual-content`
- MongoDB collection: `visual_page_content` (unique key: `scope`)
- Audit log: `visual_content_audit`
- Scopes: each URL path and `@global` for navigation/footer
- Each scope stores independent `draft` and `published` snapshots
- Public reads: `GET /visual-content?path=/about` (published only)
- Admin endpoints are JWT- and admin-role-protected
- Next proxy: `frontend/app/api/visual-content/route.ts`
- **Server-side 20-minute cache:** `unstable_cache` for public published data, keyed by backend URL and page, `revalidate: 1200`
- **Publish invalidation:** `revalidateTag(..., { expire: 0 })` immediately expires the public Next cache after a successful publish
- The public Next route is intentionally not cached in visitors' browsers or CDN for 20 minutes; this keeps new publishes fresh. The *NestJS/MongoDB request* is what is cached for 20 minutes.
- Admin reads/writes bypass the public cache.
- If deploying several independent Next servers, configure a shared Next Data Cache for cross-server reuse; otherwise each instance may cache independently.

## Validate

From `backend`:

```sh
npm run build
npx jest --runInBand visual-content
```

From `frontend`:

```sh
npm run build
node scripts/smoke-visual-content.mjs
```

The smoke test spins up a **fake** backend on an ephemeral local port and launches Next on a separate ephemeral port. It checks repeat-visitor caching, draft privacy, publish invalidation, restoring fallback, and, when Chrome/Puppeteer are available, click-to-edit save/publish/reset in a real browser. It does **not** write to your live database.

## Changes to deployment

Deploy/restart both backend and frontend when updating this feature. Ensure `BASE_URL` points to the NestJS server and MongoDB is connected. The cache invalidation and role-check only work with the updated backend + Next route together.
