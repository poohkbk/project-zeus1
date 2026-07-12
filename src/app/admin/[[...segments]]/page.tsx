import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ConsultationsPage } from "@/components/admin/ConsultationsPage";
import { ContentEditorPage } from "@/components/admin/ContentEditorPage";
import { ContentListPage } from "@/components/admin/ContentListPage";
import {
  AdminUsersPage,
  ProfilePage,
  SiteSettingsPage,
  TaxonomyPage,
  TrashPage,
} from "@/components/admin/AdminUtilityPages";
import type { CmsContentType } from "@/types/cms";

type AdminPageProps = {
  params: Promise<{
    segments?: string[];
  }>;
};

function getContentType(segment?: string): CmsContentType | undefined {
  if (segment === "cases") return "case";
  if (segment === "guides") return "guide";
  if (segment === "faqs") return "faq";
  return undefined;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { segments = [] } = await params;
  const [section, actionOrId, finalSegment] = segments;
  const type = getContentType(section);

  if (!section) return <AdminDashboard />;
  if (section === "login") return <AdminLogin />;
  if (section === "consultations") return <ConsultationsPage />;
  if (section === "taxonomy") return <TaxonomyPage />;
  if (section === "media") redirect("/admin");
  if (section === "trash") return <TrashPage />;
  if (section === "profile") return <ProfilePage />;
  if (section === "settings" && actionOrId === "admins") return <AdminUsersPage />;
  if (section === "settings" && actionOrId === "site") return <SiteSettingsPage />;

  if (type && actionOrId === "new") return <ContentEditorPage type={type} />;
  if (type && actionOrId && finalSegment === "edit") {
    return <ContentEditorPage type={type} id={actionOrId} />;
  }
  if (type) return <ContentListPage type={type} />;

  return <AdminDashboard />;
}
