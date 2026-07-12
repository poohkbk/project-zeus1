# SEO Architecture

Official site URL: `https://www.jwlaw.co.kr`

## Local Landing Pages

| URL | Title | H1 | Intent | Index |
| --- | --- | --- | --- | --- |
| `/cheongju-lawyer` | 청주변호사 \| 민사·형사·이혼·상속 법률상담 \| 법률사무소 제우 | 청주에서 법률상담이 필요하신가요? | 청주 지역의 종합 법률상담 탐색 | index, follow |
| `/cheongju-civil-lawyer` | 청주민사변호사 \| 대여금·계약·손해배상·부동산 \| 법률사무소 제우 | 청주 민사소송, 증거와 집행 가능성까지 검토해야 합니다 | 민사소송 상담 탐색 | index, follow |
| `/cheongju-criminal-lawyer` | 청주형사변호사 \| 경찰조사·고소·구속·형사재판 \| 법률사무소 제우 | 청주 형사사건, 초기 대응이 중요합니다 | 형사사건 초기 대응 | index, follow |
| `/cheongju-divorce-lawyer` | 청주이혼변호사 \| 재산분할·위자료·양육권·상간소송 \| 법률사무소 제우 | 청주 이혼소송, 이혼 이후의 생활까지 고려해야 합니다 | 이혼·가사 상담 | index, follow |
| `/cheongju-inheritance-lawyer` | 청주상속변호사 \| 상속재산분할·유류분·상속포기·한정승인 \| 법률사무소 제우 | 청주 상속분쟁, 상속관계와 기한부터 확인해야 합니다 | 상속분쟁 상담 | index, follow |

## Canonical Policy

All indexable pages use `https://www.jwlaw.co.kr` as the canonical origin. Local landing pages use self-canonical URLs.

Query-filtered URLs such as `/cases?category=...` should not become separate landing pages. Create a separate index page only when there is enough unique content, related cases, related guides, and FAQ.

## Internal Links

Local landing pages link to:

- Matching practice pages such as `/practice/civil`
- Related case pages selected by tags
- Related legal guides selected by tags
- `/consultation`
- `/about/lawyer`

Anchor text should describe the destination, such as `청주 민사소송 상담 안내`, not generic text such as `자세히 보기`.

## Structured Data

Implemented JSON-LD types:

- `LegalService`
- `WebSite`
- `WebPage`
- `BreadcrumbList`
- `FAQPage`

Structured data must match visible page content. Do not add hidden FAQ, fake reviews, unverified awards, prices, or guaranteed-result language.

## Sitemap Inclusion

Included:

- Home
- Five local landing pages
- Practice list and detail pages
- Public cases marked for search visibility
- Legal guide list
- FAQ
- Consultation and policy pages
- Lawyer profile and location pages

Excluded:

- `/admin`
- `/api`
- Preview or search routes
- Draft, private, trash, scheduled future content
