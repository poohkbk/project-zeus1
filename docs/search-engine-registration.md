# Search Engine Registration

## Environment Variables

Set these only when verification values are issued:

```env
GOOGLE_SITE_VERIFICATION=
NAVER_SITE_VERIFICATION=
```

Empty values are not rendered.

## Google Search Console

1. Add property for `https://www.jwlaw.co.kr`.
2. Verify ownership using the meta tag or HTML file method.
3. Submit `https://www.jwlaw.co.kr/sitemap.xml`.
4. Inspect these URLs:
   - `/`
   - `/cheongju-lawyer`
   - `/cheongju-civil-lawyer`
   - `/cheongju-criminal-lawyer`
   - `/cheongju-divorce-lawyer`
   - `/cheongju-inheritance-lawyer`
5. Check canonical and mobile usability.

## Naver Search Advisor

1. Register `https://www.jwlaw.co.kr`.
2. Verify ownership.
3. Submit `https://www.jwlaw.co.kr/sitemap.xml`.
4. Check `robots.txt`.
5. Request collection for core pages.

## Deployment Checks

- `site:www.jwlaw.co.kr` search after indexing
- `robots.txt` response
- `sitemap.xml` response
- HTTPS and www redirects
- No admin or API URLs indexed
