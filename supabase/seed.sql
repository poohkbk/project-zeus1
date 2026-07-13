insert into public.categories (slug, label, description, sort_order, active)
values
  ('civil', '민사', '금전, 계약, 손해배상, 부동산 등 민사 사건', 10, true),
  ('criminal', '형사', '경찰 조사, 고소, 음주운전, 사기 등 형사 사건', 20, true),
  ('divorce', '이혼·가사', '이혼, 재산분할, 양육권, 상간 등 가사 사건', 30, true),
  ('inheritance', '상속', '상속포기, 한정승인, 유류분, 상속재산분할', 40, true),
  ('administrative', '행정', '영업정지, 면허취소, 행정처분 등 행정 사건', 50, true)
on conflict (slug) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = excluded.active;

insert into public.cases (
  title,
  page_address,
  slug,
  category,
  summary,
  body,
  status,
  tags,
  is_featured,
  show_on_home,
  show_on_category,
  show_on_practice,
  show_on_search,
  featured_order,
  published_at
)
values
  (
    '군인연금 재산분할 방어 사례',
    'military-pension-property-division',
    'military-pension-property-division',
    'divorce',
    '군인연금과 공동재산 형성 과정을 함께 검토해 재산분할 쟁점을 정리한 사례입니다.',
    '공개 가능한 범위에서 재구성한 승소사례 요약입니다.',
    'published',
    array['divorce', 'property-division', 'pension', 'military-pension'],
    true,
    true,
    true,
    true,
    true,
    1,
    '2024-05-20T00:00:00+09:00'
  ),
  (
    '계약분쟁 손해배상 대응 사례',
    'contract-damages-dispute',
    'contract-damages-dispute',
    'civil',
    '계약 해지와 손해배상 범위를 중심으로 증거를 정리한 사례입니다.',
    '공개 가능한 범위에서 재구성한 승소사례 요약입니다.',
    'published',
    array['civil', 'contract', 'damages'],
    true,
    true,
    true,
    true,
    true,
    2,
    '2024-05-18T00:00:00+09:00'
  )
on conflict (page_address) do update
set title = excluded.title,
    slug = excluded.slug,
    category = excluded.category,
    summary = excluded.summary,
    body = excluded.body,
    status = excluded.status,
    tags = excluded.tags,
    is_featured = excluded.is_featured,
    show_on_home = excluded.show_on_home,
    show_on_category = excluded.show_on_category,
    show_on_practice = excluded.show_on_practice,
    show_on_search = excluded.show_on_search,
    featured_order = excluded.featured_order,
    published_at = excluded.published_at;

insert into public.legal_guides (
  title,
  page_address,
  slug,
  category,
  summary,
  body,
  status,
  tags,
  is_featured,
  show_on_home,
  show_on_search,
  published_at
)
values
  (
    '차용증 없이 빌려준 돈도 받을 수 있을까요?',
    'debt-without-promissory-note',
    'debt-without-promissory-note',
    'civil',
    '계좌이체 내역, 문자, 통화 기록 등으로 대여 사실을 입증하는 방법을 정리합니다.',
    '공개 법률가이드 요약입니다.',
    'published',
    array['civil', 'debt'],
    true,
    true,
    true,
    '2024-05-20T00:00:00+09:00'
  ),
  (
    '경찰 출석요구를 받았다면 먼저 확인할 것',
    'police-summons-first-step',
    'police-summons-first-step',
    'criminal',
    '조사 일정, 혐의 내용, 보유 자료를 확인하고 진술 방향을 신중히 정해야 합니다.',
    '공개 법률가이드 요약입니다.',
    'published',
    array['criminal', 'police-investigation'],
    true,
    true,
    true,
    '2024-05-16T00:00:00+09:00'
  )
on conflict (page_address) do update
set title = excluded.title,
    slug = excluded.slug,
    category = excluded.category,
    summary = excluded.summary,
    body = excluded.body,
    status = excluded.status,
    tags = excluded.tags,
    is_featured = excluded.is_featured,
    show_on_home = excluded.show_on_home,
    show_on_search = excluded.show_on_search,
    published_at = excluded.published_at;

insert into public.faqs (question, answer, category, status, tags, show_on_search, sort_order, published_at)
values
  (
    '상담 전에 어떤 자료를 준비하면 좋나요?',
    '계약서, 문자, 계좌이체 내역, 법원 또는 수사기관에서 받은 서류 등 사건을 확인할 수 있는 자료를 준비하시면 좋습니다.',
    'common',
    'published',
    array['consultation'],
    true,
    10,
    '2024-05-20T00:00:00+09:00'
  ),
  (
    '긴급한 사건은 어떻게 상담해야 하나요?',
    '오늘 조사, 구속, 압수수색, 접근금지, 행정처분 기한처럼 시간이 촉박한 사안은 전화상담을 먼저 이용해 주세요.',
    'common',
    'published',
    array['urgent'],
    true,
    20,
    '2024-05-20T00:00:00+09:00'
  );
