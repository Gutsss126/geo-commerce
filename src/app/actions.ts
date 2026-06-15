"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auditProduct, auditSite } from "@/lib/geo/analyzer";
import { collectProductPageEvidence, collectSitePageEvidence } from "@/lib/geo/page-evidence";
import { collectSitePageExperience } from "@/lib/geo/page-experience";
import {
  generateLlmsTxt,
  optimizeDescription,
  suggestProductFaqs,
} from "@/lib/geo/generators";
import { generateApiKey } from "@/lib/api-key";

export async function createSite(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const platform = String(formData.get("platform") ?? "wordpress");
  const locale = String(formData.get("locale") ?? "en-US");
  const brandVoice = String(formData.get("brandVoice") ?? "").trim() || null;
  const wpUrl = String(formData.get("wpUrl") ?? "").trim() || null;

  if (!name || !domain) throw new Error("站点名称与域名必填");

  const site = await prisma.site.create({
    data: {
      name,
      domain,
      platform,
      locale,
      brandVoice,
      wpUrl,
      apiKey: generateApiKey(),
    },
  });

  const [pageEvidence, pageExperience] = await Promise.all([
    collectSitePageEvidence(domain),
    collectSitePageExperience(domain),
  ]);
  const report = auditSite({ name, domain, brandVoice, productCount: 0, pageEvidence });
  report.pageExperience = pageExperience;
  await prisma.geoAudit.create({
    data: {
      siteId: site.id,
      type: "site",
      overallScore: report.overallScore,
      report: JSON.stringify(report),
    },
  });

  revalidatePath("/");
  revalidatePath("/sites");
}

export async function createProduct(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || slug;
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const price = formData.get("price") ? Number(formData.get("price")) : null;
  const url = String(formData.get("url") ?? "").trim() || null;

  if (!siteId || !title || !slug) throw new Error("缺少必填字段");

  const product = await prisma.product.create({
    data: { siteId, title, slug, sku, description, category, price, url },
  });

  const pageEvidence = await collectProductPageEvidence(url);
  const report = auditProduct({
    title,
    description,
    category,
    price,
    url,
    pageText: pageEvidence?.pageText,
    hasProductSchema: pageEvidence?.hasProductSchema,
    hasOfferSchema: pageEvidence?.hasOfferSchema,
    hasAvailability: pageEvidence?.hasAvailability,
    hasReviewSignal: pageEvidence?.hasReviewSignal,
  });
  await prisma.product.update({
    where: { id: product.id },
    data: { geoScore: report.overallScore, lastAuditAt: new Date() },
  });
  await prisma.geoAudit.create({
    data: {
      siteId,
      type: "product",
      targetUrl: url ?? `/products/${slug}`,
      overallScore: report.overallScore,
      report: JSON.stringify(report),
    },
  });

  revalidatePath("/products");
  revalidatePath("/audits");
}

export async function runProductAudit(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { site: true },
  });

  const pageEvidence = await collectProductPageEvidence(product.url);
  const report = auditProduct({
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.price,
    url: product.url,
    pageText: pageEvidence?.pageText,
    hasProductSchema: pageEvidence?.hasProductSchema,
    hasOfferSchema: pageEvidence?.hasOfferSchema,
    hasAvailability: pageEvidence?.hasAvailability,
    hasReviewSignal: pageEvidence?.hasReviewSignal,
  });

  await prisma.product.update({
    where: { id: productId },
    data: { geoScore: report.overallScore, lastAuditAt: new Date() },
  });
  await prisma.geoAudit.create({
    data: {
      siteId: product.siteId,
      type: "product",
      targetUrl: product.url ?? `/products/${product.slug}`,
      overallScore: report.overallScore,
      report: JSON.stringify(report),
    },
  });

  revalidatePath("/products");
  revalidatePath("/audits");
}

export async function runSiteAudit(siteId: string) {
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    include: { _count: { select: { products: true } } },
  });

  const [pageEvidence, pageExperience] = await Promise.all([
    collectSitePageEvidence(site.domain),
    collectSitePageExperience(site.domain),
  ]);
  const report = auditSite({
    name: site.name,
    domain: site.domain,
    brandVoice: site.brandVoice,
    productCount: site._count.products,
    pageEvidence,
  });
  report.pageExperience = pageExperience;

  await prisma.geoAudit.create({
    data: {
      siteId,
      type: "site",
      overallScore: report.overallScore,
      report: JSON.stringify(report),
    },
  });

  revalidatePath("/sites");
  revalidatePath("/audits");
}

export async function saveLlmsConfig(siteId: string, content: string) {
  await prisma.llmsConfig.upsert({
    where: { siteId },
    create: { siteId, content },
    update: { content },
  });
  revalidatePath("/tools");
}

export async function generateAndSaveLlms(siteId: string) {
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    include: { products: { take: 10, orderBy: { geoScore: "desc" } } },
  });

  const content = generateLlmsTxt({
    siteName: site.name,
    domain: site.domain,
    contactEmail: `hello@${site.domain}`,
    productUrls: site.products.map((p) => p.url ?? `/products/${p.slug}`),
    policies: [
      "https://" + site.domain + "/pages/shipping",
      "https://" + site.domain + "/pages/returns",
    ],
  });

  await saveLlmsConfig(siteId, content);
}

export async function optimizeProductDescription(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const optimized = optimizeDescription(product.title, product.description);
  await prisma.product.update({
    where: { id: productId },
    data: { description: optimized },
  });
  revalidatePath("/products");
  revalidatePath("/tools");
}

export async function addCitation(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const engine = String(formData.get("engine") ?? "ChatGPT");
  const query = String(formData.get("query") ?? "").trim();
  const snippet = String(formData.get("snippet") ?? "").trim() || null;
  const citedUrl = String(formData.get("citedUrl") ?? "").trim() || null;

  if (!siteId || !query) throw new Error("站点与查询词必填");

  await prisma.citation.create({
    data: { siteId, engine, query, snippet, citedUrl },
  });
  revalidatePath("/citations");
}

export async function getProductFaqSuggestions(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return suggestProductFaqs(product.title, product.category);
}

export async function regenerateSiteApiKey(siteId: string) {
  await prisma.site.update({
    where: { id: siteId },
    data: { apiKey: generateApiKey() },
  });
  revalidatePath("/integrations/wordpress");
  revalidatePath("/sites");
}
