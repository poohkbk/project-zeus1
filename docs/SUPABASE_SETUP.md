# Supabase Setup

This project can run without Supabase. If Supabase is missing, public pages keep using the existing local fallback data.

## Environment Variables

Set these in Vercel Project Settings and local `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not add it to client code and do not commit `.env.local`.

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name is still supported, but new deployments should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Migrations

Apply migrations in this order:

1. `supabase/migrations/001_zeu_cms.sql`
2. `supabase/migrations/010_ai_guide_core.sql`
3. `supabase/migrations/020_content_foundation.sql`

The foundation migration adds:

- `categories`
- `consultations.privacy_agreed`
- `slug`, `content`, `published_at` columns for content tables
- updated-at triggers
- stricter public read policies
- public consultation insert policy requiring privacy agreement

## Seed

Run `supabase/seed.sql` after migrations to add starter public content and categories. The seed intentionally contains only public, non-sensitive sample content.

To seed the current public hardcoded content from the repository, run:

```bash
node scripts/seed-supabase.mjs
```

The script reads only public repository data and uses `SUPABASE_SERVICE_ROLE_KEY` from the environment.

## RLS

Public visitors can only:

- read published `cases`, `legal_guides`, `faqs`
- read active `categories`
- insert `consultations` when `privacy_agreed = true`

Public visitors cannot select, update, or delete consultations.

Content writes are not opened to public users. Server-side admin operations should use the service role key only on the server.

## Storage

See `supabase/STORAGE.md`.

Recommended buckets:

- `case-images`
- `guide-images`

Only public content images should be uploaded. Do not upload client documents, judgments, contracts, or identity documents to public buckets.

## Fallback

The website tries Supabase first for:

- 승소사례
- 법률가이드
- FAQ
- 상담신청 저장

If Supabase is unavailable or empty, public content pages keep using the existing local data.

## Admin TODO

This foundation does not finish Supabase-backed admin editing. Future work should connect the existing CMS screens to authenticated server actions after admin authentication and permission policy are finalized.
