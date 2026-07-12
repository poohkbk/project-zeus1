# SEO Migration Checklist

## Current URL Inventory

Before deployment, export or crawl the current public URL list for `www.jwlaw.co.kr`.

Record:

- Current URL
- New URL
- Status: keep, redirect, remove
- Redirect type: 301 or 308
- Notes

## Redirect Rules

Use redirects only when the new page is the closest matching replacement. Do not redirect every deleted URL to the home page.

Recommended mapping examples:

- Old civil consultation pages -> `/cheongju-civil-lawyer` or `/practice/civil`
- Old criminal pages -> `/cheongju-criminal-lawyer` or `/practice/criminal`
- Old divorce pages -> `/cheongju-divorce-lawyer` or `/practice/divorce`
- Old inheritance pages -> `/cheongju-inheritance-lawyer` or `/practice/inheritance`

## Canonical

Use `https://www.jwlaw.co.kr` as the preferred origin.

Confirm that:

- HTTP redirects to HTTPS
- non-www redirects to www
- uppercase path variants are not separately indexed
- query-filtered URLs are not treated as separate landing pages

## 404 and 410

If there is no relevant replacement, return a normal 404 or 410. Avoid irrelevant redirects.

## After Deployment

1. Confirm `https://www.jwlaw.co.kr/robots.txt`.
2. Confirm `https://www.jwlaw.co.kr/sitemap.xml`.
3. Request indexing for the five local landing pages.
4. Check canonical URLs in Search Console.
5. Monitor 404 reports and add redirects only when appropriate.
