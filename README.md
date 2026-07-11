# SomBlog

A simple blog: static HTML/CSS/JS on the front end, Vercel Serverless
Functions as the API, and MongoDB as the database. One admin account can
create, edit, publish/unpublish, and delete posts from a dashboard;
everyone else just reads.

## UI update (v4) - three targeted fixes

Three specific things, nothing else touched:

1. **Mobile nav** - the header nav (Home / About Us / Articles / Contact Us
   / Admin) now collapses into a hamburger menu below 720px width, since
   most visitors will be on phones. Tap the ☰ icon to open it; it closes
   on outside tap or after picking a link.
2. **Card polish** - post cards got more breathing room (bigger padding,
   bigger gaps between cards, a taller/proportional image area using
   `aspect-ratio` instead of a fixed height, a subtle lift-on-hover), and
   the search/heading spacing above the grid was opened up too.
3. **Rating widget + WhatsApp**, on the post page only - readers can rate
   a post 1-5 stars. On submit it shows a thank-you popup ("Aad ayaad noo
   dhiirrigelisay!") with a prompt to share their thoughts on WhatsApp
   (Yes opens `wa.me` with a pre-filled message; Not now just closes it).
   Each browser can only rate a given post once (tracked in
   `localStorage`, separate from the theme preference key). This needed
   two small, contained backend additions:
   - New posts now start with `ratingSum: 0, ratingCount: 0`.
   - New public endpoint `POST /api/posts/:id/rate` (no login required,
     rejects anything outside a 1-5 whole number, 404s on drafts) that
     increments those two fields and returns the new average.
   The WhatsApp number is a placeholder (`000000000`, same one already
   used on the Contact page) - one spot to update: `config.whatsappNumber`
   in `js/utils.js`.

## UI update (v3) - matching the reference structure

The front end was rebuilt to actually match the reference site's page
structure (not just its homepage look):

- **New pages**: `about.html`, `articles.html` (the full searchable,
  paginated post listing - home only shows a small "recent posts" preview
  now), and `contact-us.html` (placeholder WhatsApp/email cards). Every
  page shares the same header nav: Home, About Us, Articles, Contact Us,
  Admin.
- **About/Contact content is placeholder text**, not real personal
  data - `hello@somblog.example` and a dummy WhatsApp link. Replace these
  with real details whenever you're ready.
- **All internal paths are now relative** (`css/style.css`, `js/main.js`,
  `about.html`, ...) instead of root-absolute (`/css/style.css`). This is
  what broke the previous version when opened through a local preview
  server (like VS Code's Live Server) whose root wasn't the project
  folder itself - relative paths work regardless of how deep the site is
  served from, on Vercel or anywhere else.
- Shared card rendering was consolidated into `js/utils.js`
  (`renderPostCard`) so the homepage, articles page, and related-posts
  section all render identical cards from one place instead of three
  slightly-different copies.

## UI update (v2)

The front end was redesigned around a card-based layout, inspired by a
reference blog the user shared:

- **Light/dark mode** - toggle button in the header, saved in
  `localStorage`, and respected on every page (including the admin
  dashboard). No flash of the wrong theme on load.
- **Homepage hero carousel** - auto-rotating slides for the latest posts,
  with dot navigation.
- **Category pills + search**, restyled as rounded pills.
- **Card grid with "Load more"** - posts load in pages of 6 instead of all
  at once (`GET /api/posts` now accepts optional `?limit=` and `?skip=`
  and returns a `total` count; existing callers without those params, like
  the admin dashboard, are unaffected).
- **Reading time** - computed server-side from the word count whenever a
  post is created or edited (`readingMinutes` field), shown on cards and
  the post page.
- **Post page** - category badge, cover image, a share button
  (native share sheet on mobile, copy-link fallback on desktop), and a
  "related posts" section (same category).
- One Google Font (Plus Jakarta Sans) is now loaded for the whole site.

While making these changes, an in-memory test harness caught a real edge
case: sorting posts by `createdAt` alone isn't guaranteed stable when two
posts share the exact same millisecond timestamp, which could skip or
repeat a post across "Load more" pages. The fix was to add `_id` as a
secondary sort key, which is unique and always increasing.

No new environment variables were needed for any of this.

## Project structure

```
index.html            Public homepage (post list, search, category filter)
post.html              Public single-post page
admin/login.html       Admin sign-in
admin/dashboard.html   Admin dashboard (CRUD)
css/style.css          All styles
js/main.js             Homepage logic
js/post.js             Single post logic
js/login.js            Login logic
js/dashboard.js        Dashboard CRUD logic
api/auth/login.js      POST - verify admin credentials, set session cookie
api/auth/logout.js     POST - clear session cookie
api/auth/me.js         GET  - check if the current session is a valid admin
api/posts/index.js     GET (list, public/admin) + POST (create, admin only)
api/posts/[id].js      GET/PUT/DELETE a single post, by id or slug
api/categories.js      GET - distinct categories, for the filter dropdown
lib/mongodb.js         MongoDB connection (cached for serverless reuse)
lib/auth.js            JWT + cookie helpers
lib/slug.js            Turns a title into a URL slug
scripts/setup-db.js            Creates the required MongoDB indexes
scripts/generate-admin-hash.js Generates a bcrypt hash for your admin password
```

No frontend framework or build step — the browser loads the `.html`/`.css`/`.js`
files directly, and calls the `/api/...` endpoints with `fetch`.

## How auth works

There's a single admin account, defined entirely by environment variables
(no "users" collection). On login, the server checks the username/password
against `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`, then sets an `HttpOnly`
session cookie containing a signed JWT. The browser sends that cookie
automatically on every request, so the dashboard and the API always know
whether the current visitor is the admin. The cookie can't be read by
JavaScript, which protects it from theft via any script that ended up
running on the page (XSS-style attacks) — a plain `localStorage` token
wouldn't have that protection.

## 1. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `MONGODB_URI` — your MongoDB connection string (see step 2).
- `MONGODB_DB` — database name, defaults to `somblog`.
- `ADMIN_USERNAME` — whatever you want your admin login to be.
- `ADMIN_PASSWORD_HASH` — generate with:
  ```bash
  npm run generate-hash "your-real-password"
  ```
  Copy the printed hash into `.env`. Never put the plain password itself
  in an environment variable.
- `JWT_SECRET` — any long random string, e.g. `openssl rand -hex 32`.

Then create the database indexes once:

```bash
npm run setup-db
```

Run it locally with the Vercel CLI (this emulates the `/api` functions the
same way Vercel does in production):

```bash
npm install -g vercel
vercel dev
```

## 2. MongoDB

1. Create a free cluster at MongoDB Atlas (or use any MongoDB instance).
2. Create a database user and get the connection string — it looks like
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`.
3. In Atlas, under Network Access, allow access from anywhere (`0.0.0.0/0`)
   so Vercel's serverless functions (which don't have a fixed IP) can connect.
4. Put that string in `MONGODB_URI`.

## 3. Deploy to Vercel

1. Push this project to a GitHub repository.
2. On vercel.com, "Add New Project" → import that repository. Vercel will
   detect the `/api` folder automatically as serverless functions and serve
   everything else as static files — no extra config needed.
3. **Before the first deploy finishes**, add your environment variables:
   Project → **Settings → Environment Variables**. Add each of these
   (for the "Production", "Preview", and "Development" environments):
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - `JWT_SECRET`
4. Deploy (or redeploy, if it already deployed once before you added the
   variables — env var changes only apply to new deployments).
5. Run `npm run setup-db` once from your machine (with `.env` pointed at the
   same `MONGODB_URI`) to create the indexes on the live database.
6. Visit `your-site.vercel.app/admin/login.html` and sign in.

## Notes on the content editor

Post content is stored and shown as plain text: a blank line between two
blocks of text becomes a new paragraph. This was a deliberate simplicity
trade-off — no rich-text editor, no HTML input, so there's nothing to
break and no risk of a stray tag messing up the page. If you later want
bold text, links, or images inside the post body, the natural upgrade is
a small Markdown renderer in `js/post.js`.
