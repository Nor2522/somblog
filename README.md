# SomBlog

A simple blog: static HTML/CSS/JS on the front end, Vercel Serverless
Functions as the API, and MongoDB as the database. One admin account can
create, edit, publish/unpublish, and delete posts from a dashboard;
everyone else just reads.

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
