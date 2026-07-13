# Supabase Storage Policy

Use two public image buckets for website content only.

- `case-images`: 승소사례 대표 이미지
- `guide-images`: 법률가이드 대표 이미지

Allowed file types:

- `image/jpeg`
- `image/png`
- `image/webp`

Recommended maximum file size:

- 5MB

Rules:

- Do not upload pleadings, judgments, identity documents, contracts, or 상담자가 제공한 개인자료 to public buckets.
- Use public buckets only for marketing/content images that can safely be shown on the website.
- Store private case documents outside public storage with separate access control if needed later.
- Keep image upload UI guidance in the article editor, not as a standalone admin menu.
