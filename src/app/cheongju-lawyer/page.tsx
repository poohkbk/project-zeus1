import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LocalLandingPage } from "@/components/seo/LocalLandingPage";
import { getLocalSeoPage } from "@/data/local-seo-pages";
import { localSeoMetadata } from "@/lib/seo/metadata";

const pageData = getLocalSeoPage("cheongju-lawyer");

export const metadata: Metadata = pageData ? localSeoMetadata(pageData) : {};

export default function CheongjuLawyerPage() {
  if (!pageData) notFound();
  return <LocalLandingPage page={pageData} />;
}
