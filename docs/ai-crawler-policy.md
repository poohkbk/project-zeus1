# AI Crawler Policy

## Current Policy

The site separates search-result exposure from model-training collection.

Allowed for search exposure:

- `OAI-SearchBot`
- `Claude-SearchBot`
- `Claude-User`
- `Googlebot`
- `Yeti`
- General crawlers for public pages

Disallowed for model-training collection:

- `GPTBot`
- `ClaudeBot`

## Important Notes

Robots rules are crawler instructions. They do not replace firewall, WAF, or server-side access controls.

Some user-triggered agents may not behave like autonomous crawlers. Do not assume `robots.txt` alone blocks every AI-related request.

## Private Areas

The following are disallowed:

- `/admin/`
- `/api/admin/`
- `/preview/`
- `/search`

Do not expose consultation submissions, administrator pages, private drafts, or temporary preview URLs to AI search or ordinary search engines.

## Future Changes

If policy changes, update:

- `src/app/robots.ts`
- this document
- deployment notes for Cloudflare or hosting-level crawler controls
