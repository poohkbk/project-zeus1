import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/types/database";

export const fallbackCategories: CategoryRow[] = [
  {
    id: "civil",
    slug: "civil",
    label: "민사",
    description: "금전, 계약, 손해배상, 부동산 등 민사 사건",
    sort_order: 10,
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "criminal",
    slug: "criminal",
    label: "형사",
    description: "경찰 조사, 고소, 음주운전, 사기 등 형사 사건",
    sort_order: 20,
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "divorce",
    slug: "divorce",
    label: "이혼·가사",
    description: "이혼, 재산분할, 양육권, 상간 등 가사 사건",
    sort_order: 30,
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "inheritance",
    slug: "inheritance",
    label: "상속",
    description: "상속포기, 한정승인, 유류분, 상속재산분할",
    sort_order: 40,
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "administrative",
    slug: "administrative",
    label: "행정",
    description: "영업정지, 면허취소, 행정처분 등 행정 사건",
    sort_order: 50,
    active: true,
    created_at: "",
    updated_at: "",
  },
];

export async function getActiveCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  if (!supabase) return fallbackCategories;

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return fallbackCategories;
  return data as CategoryRow[];
}
