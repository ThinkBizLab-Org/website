# ThinkBiz Lab

ThinkBiz Lab is a Thai business intelligence content platform for SME owners, startup builders, investors, and aspiring entrepreneurs. The product combines a public business insight website with an admin CMS for GEO-ready articles, AI-assisted content generation, social publishing, and scheduled distribution.

Brand direction: **Smart & Friendly** — "ห้องทดลองความคิดธุรกิจ" that turns business ideas into practical insight people can use.

## Tech Stack

- Next.js 14 App Router
- React 18 + TypeScript
- Tailwind CSS
- Drizzle ORM
- Neon PostgreSQL
- NextAuth with Google OAuth
- Anthropic Claude for article generation
- Cloudflare R2 for media storage
- Optional integrations: LINE, Facebook, Instagram, TikTok, fal.ai, HeyGen, Google Drive Picker

## Project Structure

```txt
thinkbiz-app/
├── app/                    # Next.js routes, layouts, pages, API routes
│   ├── admin/              # Auth-protected CMS
│   ├── api/                # CRUD, AI, social, upload, cron endpoints
│   ├── articles/           # Public article listing and detail pages
│   ├── login/              # Custom NextAuth sign-in page
│   ├── privacy/            # Legal page
│   └── terms/              # Legal page
├── components/             # Shared UI and CMS components
├── lib/                    # DB, schema, auth, markdown, GEO scoring
├── public/                 # Favicons, icons, verification files, llms.txt
├── drizzle.config.ts       # Drizzle Kit configuration
└── vercel.json             # Cron and canonical host redirect
```

Related workspace folders:

- `../1. Brand Identity/` contains brand assets, logos, favicons, social media kit, and document templates.
- `../2. Website/` contains earlier static design options and `BRAND.md`.

## Key Features

- Public homepage with featured and latest published articles.
- Article index with DB-backed category, tag, search filtering, and pagination.
- Article detail pages with SEO metadata, Open Graph, Article schema, Breadcrumb schema, and FAQ schema.
- Related articles on article detail pages.
- Public category index at `/categories`.
- Admin dashboard protected by Google OAuth.
- Role-based admin access with `owner`, `admin`, `editor`, and `viewer` roles.
- Article CRUD with rich editor, cover upload, categories, tags, status, read time, and featured flag.
- GEO fields: AI summary question/answer, key points, FAQ, structured data, and GEO score.
- AI generation for Thai business articles, social captions, cover prompts, IG image prompts, and TikTok video prompts.
- Scheduled publishing through Vercel Cron.
- Optional broadcast/posting to LINE, Facebook, Instagram, and TikTok.
- Admin settings for analytics IDs, API keys, social tokens, timezone, cron toggle, and platform configuration.
- Audit log and publish-attempt history in `/admin/audit`.
- R2 Media Library in `/admin/media` for listing, opening, copying, and deleting production media objects.
- Admin user management in `/admin/users`.
- Draft/review preview links with one-hour signed tokens.
- Newsletter subscriber API wired to homepage forms.
- Health endpoint at `/api/health`.
- Lightweight operational monitoring webhook through `ERROR_WEBHOOK_URL`.
- Reviewed SQL migration runner and backup export scripts for production operations.
- Seed script for default categories and optional demo article.
- Unit tests for core helpers and CI for pull requests.

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Fill in at least these required values:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAILS="your@gmail.com"
ENCRYPTION_KEY="..."
PREVIEW_TOKEN_SECRET="..."
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="thinkbiz-media"
R2_PUBLIC_BASE_URL="https://media.thinkbizlab.com"
```

For local development, set the Google OAuth redirect URI to:

```txt
http://localhost:3000/api/auth/callback/google
```

Run the development server:

```bash
npm run dev
```

Open:

- Public site: http://localhost:3000
- Admin CMS: http://localhost:3000/admin

## Database

The schema lives in `lib/schema.ts` and currently includes:

- `articles`
- `categories`
- `settings`
- `subscribers`

Push schema changes to the database:

```bash
npm run db:push
```

Use `db:push` for local/dev only. For production, generate migration files and apply them through the reviewed deployment workflow:

Generate migrations:

```bash
npm run db:generate
```

Additive SQL migrations live in:

```txt
scripts/sql/001_p1_observability.sql
scripts/sql/002_p0_rbac_ops.sql
```

Preview pending migrations:

```bash
npm run migrations:run
```

Apply reviewed migrations after the PR is merged/deployed:

```bash
npm run migrations:run -- --write
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## Content Workflow

1. Sign in with an allowed Google account at `/admin`.
2. Create an article from `/admin/articles/new`.
3. Add title, slug, excerpt, content, cover image, category, tags, and status.
4. Fill GEO fields: AI summary, key points, FAQ, and question-style headings.
5. Use the AI generator to draft article options and platform captions.
6. Save as `draft`, move to `review`, publish immediately, or schedule a publish time.
7. Use `/admin/calendar` to review scheduled content.
8. Use `Preview Draft` on an edit page to generate a temporary preview URL for draft/review content.

Article statuses:

- `draft`
- `review`
- `published`

## Media Storage

All new uploaded/generated media is stored in Cloudflare R2 through `/api/upload`.

R2 object structure:

```txt
articles/
├── covers/YYYY/MM/             # Manual article cover uploads
└── content-images/YYYY/MM/     # Rich editor inline images
generated/
├── covers/YYYY/MM/             # AI-generated article covers
└── instagram/YYYY/MM/          # AI-generated square IG images
social/
└── videos/YYYY/MM/             # Future social video uploads
uploads/
└── misc/YYYY/MM/               # Fallback uploads
```

Required R2 environment variables:

```env
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="thinkbiz-media"
R2_PUBLIC_BASE_URL="https://media.thinkbizlab.com"
```

`R2_PUBLIC_BASE_URL` must point to a public R2 custom domain or public bucket URL because article images, LINE, Facebook, Instagram, and Open Graph previews need externally accessible media URLs.

To scan existing article media URLs before migration:

```bash
npm run media:migrate-r2
```

To upload existing media into R2 and update article URLs in the database:

```bash
npm run media:migrate-r2 -- --write
```

The migration script checks `cover_image`, `ig_image`, and inline `<img src="...">` URLs in article HTML content. It skips URLs that already start with `R2_PUBLIC_BASE_URL`.

## Scheduled Publishing

`vercel.json` configures a cron job:

```json
{
  "path": "/api/cron/publish",
  "schedule": "0 1 * * *"
}
```

The cron endpoint publishes due draft articles and can also send configured LINE, Facebook, Instagram, and TikTok posts. Set `CRON_SECRET` in production to protect the endpoint.

Publish outcomes are recorded in `publish_attempts` and visible at `/admin/audit`. Admin changes such as article edits, settings updates, category changes, preview-token generation, and manual publish actions are recorded in `audit_logs`.

Set `ERROR_WEBHOOK_URL` to receive JSON operational alerts when critical jobs such as scheduled publishing fail.

## Admin Roles

Admin access starts from `ADMIN_EMAILS`. After applying `scripts/sql/002_p0_rbac_ops.sql`, use `/admin/users` to assign database-backed roles:

- `owner`: manage admin users and all production settings.
- `admin`: manage settings, credentials, media deletion, categories deletion, and integration tests.
- `editor`: create/edit articles, generate media, preview drafts, and publish/social-post content.
- `viewer`: read admin data without mutating content.

If the `admin_users` table is not available yet, the first email in `ADMIN_EMAILS` is treated as `owner` and other allowlisted emails are treated as `admin` so the migration does not lock out existing operators.

## Integrations

Some integrations can be configured through `/admin/settings`; others can also be supplied as environment variables.

Common keys and settings:

- `ANTHROPIC_API_KEY` or `anthropic_api_key` setting for AI article generation.
- `LINE_CHANNEL_ACCESS_TOKEN`, `line_channel_secret`, `line_admin_user_ids`, and `line_register_keyword`.
- `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`, `fb_page_access_token`, and `fb_page_id`.
- `IG_USER_ID` or `ig_user_id`.
- TikTok OAuth tokens stored in `settings`.
- `fal_api_key` for image/video generation.
- `heygen_api_key`, `heygen_avatar_id`, `heygen_avatar_look_id`, and `heygen_voice_id`.
- `ga_measurement_id`, `fb_pixel_id`, and `tiktok_pixel_id` for analytics and pixels.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_BASE_URL` for media storage.

Keep production secrets out of source control.

Secrets saved through `/admin/settings` are encrypted when `ENCRYPTION_KEY` is configured. Existing plaintext secrets remain readable for backward compatibility, but should be migrated after setting `ENCRYPTION_KEY`:

```bash
npm run secrets:encrypt
npm run secrets:encrypt -- --write
```

## SEO And GEO

The app is designed for both search engines and AI answer engines:

- `app/sitemap.ts` emits static and published article routes.
- `app/robots.ts` allows common AI crawlers while blocking `/admin` and `/api`.
- Article pages emit structured data for Article, Breadcrumb, and FAQ.
- `lib/geo-score.ts` scores content based on summary, key points, FAQ, question headings, stats, tags, excerpt length, and content length.
- `public/llms.txt` is available for AI-oriented site discovery.

## Useful Scripts

```bash
npm run dev        # Start local dev server
npm run build      # Build production app
npm run start      # Start production build
npm run lint       # Run Next lint
npm run db:push    # Push Drizzle schema to DB
npm run db:studio  # Open Drizzle Studio
npm run db:generate # Generate Drizzle migrations
npm run seed       # Seed default categories
npm run test       # Run unit tests
npm run typecheck  # Run TypeScript checks
npm run media:migrate-r2 # Dry-run existing media migration to R2
npm run secrets:encrypt # Dry-run settings secret encryption
npm run migrations:run # Dry-run reviewed SQL migrations
npm run backup:export # Export DB tables and optional R2 manifest
```

Seed an optional demo article:

```bash
npm run seed -- --demo-article
```

Health check:

```bash
curl http://localhost:3000/api/health
```

The health endpoint verifies database connectivity and required production environment variables without exposing secret values.

Create a production backup export:

```bash
npm run backup:export -- --out=backups/pre-deploy-YYYYMMDD
```

The export includes JSON snapshots of content/admin tables and an R2 object manifest when R2 credentials are configured. The local `backups/` directory is gitignored.

## CI

Pull requests run `.github/workflows/ci.yml`:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Deployment is intentionally not triggered directly from local commands; production deployment should happen through the reviewed PR workflow.

## Deployment

The app is intended for Vercel.

Production notes:

- Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `ENCRYPTION_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- Set R2 media storage variables before using uploads or AI image generation.
- Set optional API/social/analytics secrets as needed.
- Configure Google OAuth redirect URI for the deployed domain:

```txt
https://www.thinkbizlab.com/api/auth/callback/google
```

- `vercel.json` redirects `thinkbizlab.com` to `www.thinkbizlab.com`.
- Vercel Cron calls `/api/cron/publish` daily at 01:00 UTC.

## Brand Reference

The primary brand guide is in:

```txt
../2. Website/BRAND.md
```

Core brand values:

- Vision: เป็นคลังความรู้ธุรกิจที่ดีที่สุด ที่ทุกคนเข้าถึงได้และต่อยอดได้จริง
- Mission: ทดลอง วิเคราะห์ และแชร์ Insight ธุรกิจที่นำไปใช้ได้จริง เพื่อให้ทุกคนคิดแบบนักธุรกิจ
- Tone: Smart & Friendly
- Primary colors: `#7C3AED`, `#1E1B4B`, `#A78BFA`
- Fonts: Prompt for headings, Sarabun for body text
