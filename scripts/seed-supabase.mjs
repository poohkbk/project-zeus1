import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

function normalizeUrl(value) {
  return value?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function loadTsModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const loadedModule = { exports: {} };
  const context = {
    module: loadedModule,
    exports: loadedModule.exports,
    require,
    __dirname: path.dirname(filename),
    __filename: filename,
  };
  vm.runInNewContext(output, context, { filename });
  return loadedModule.exports;
}

function publicCaseToRow(caseItem) {
  const visibility = caseItem.visibility ?? {};
  return {
    title: caseItem.title,
    page_address: caseItem.slug,
    slug: caseItem.slug,
    category: caseItem.category,
    summary: caseItem.excerpt || caseItem.summary || "",
    body: caseItem.summary || "",
    status: visibility.published === false ? "draft" : "published",
    tags: caseItem.tags ?? [],
    hero_image_url: caseItem.heroImage ?? null,
    hero_image_alt: caseItem.title,
    is_featured: Boolean(visibility.isFeatured),
    show_on_home: Boolean(visibility.showOnHome),
    show_on_category: Boolean(visibility.showOnCategory),
    show_on_practice: Boolean(visibility.showOnPractice),
    show_on_search: Boolean(visibility.showOnSearch),
    featured_order: visibility.featuredOrder ?? null,
    featured_start_at: visibility.featuredStartAt ?? null,
    featured_end_at: visibility.featuredEndAt ?? null,
    published_at: visibility.publishedAt ?? null,
    content: caseItem,
  };
}

function guideToRow(guide) {
  return {
    title: guide.title,
    page_address: guide.slug,
    slug: guide.slug,
    category: guide.category,
    summary: guide.excerpt,
    body: guide.excerpt,
    status: "published",
    tags: guide.tags ?? [],
    hero_image_url: null,
    hero_image_alt: guide.title,
    is_featured: Boolean(guide.featured),
    show_on_home: Boolean(guide.featured),
    show_on_search: true,
    published_at: guide.publishedAt ?? null,
    content: guide,
  };
}

function faqToRows(page) {
  return page.faqs.map((faq, index) => ({
    question: faq.question,
    answer: faq.answer,
    category: page.practiceSlug ?? page.slug,
    status: page.index ? "published" : "draft",
    tags: page.relatedTags ?? [],
    is_featured: index === 0,
    show_on_home: false,
    show_on_search: true,
    sort_order: index + 1,
    published_at: page.publishedAt,
  }));
}

async function upsertChunk(supabase, table, rows, onConflict) {
  const chunkSize = 50;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} seed failed: ${error.message}`);
  }
}

async function main() {
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { caseContents } = loadTsModule("src/data/cases.ts");
  const { legalGuideContents } = loadTsModule("src/data/legal-guides.ts");
  const { localSeoPages } = loadTsModule("src/data/local-seo-pages.ts");

  await upsertChunk(supabase, "cases", caseContents.map(publicCaseToRow), "page_address");
  await upsertChunk(supabase, "legal_guides", legalGuideContents.map(guideToRow), "page_address");
  await upsertChunk(supabase, "faqs", localSeoPages.flatMap(faqToRows), "question");

  console.log("Supabase public seed completed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
