import type { SitePageEvidence } from "./types";

export type JsonLdSignals = {
  productSchemaCount: number;
  hasProductSchema: boolean;
  hasOfferSchema: boolean;
  hasAvailability: boolean;
  hasReviewSignal: boolean;
};

export type ProductPageEvidence = JsonLdSignals & {
  pageText: string;
};

export type ProductPageSampleSummary = {
  productSampleText: string;
  productSampleCount: number;
  productSampleSchemaCount: number;
  productSampleOfferCount: number;
  productSampleAvailabilityCount: number;
  productSampleReviewCount: number;
};

export type PolicyPageSummary = {
  policyText: string;
  policyPageCount: number;
  policyPageSources: string[];
};

export type SeoSignals = {
  title: string;
  metaDescription: string;
  canonical: string;
  internalLinkCount: number;
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveSiteUrl(domain: string, path: string) {
  const base = domain.startsWith("http://") || domain.startsWith("https://") ? domain : `https://${domain}`;
  const cleanBase = stripTrailingSlash(base);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function htmlToReadableText(html: string, limit = 6000) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i");
  return decodeHtmlAttribute(tag.match(pattern)?.[1] ?? "");
}

function sameSiteHref(href: string, pageUrl: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("/")) return true;
  try {
    return new URL(href, pageUrl).hostname === new URL(pageUrl).hostname;
  } catch {
    return false;
  }
}

export function extractSeoSignals(html: string, pageUrl: string): SeoSignals {
  const title = decodeHtmlAttribute(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ") ?? "");
  const metaDescriptionTag = Array.from(html.matchAll(/<meta\b[^>]*>/gi))
    .map((match) => match[0])
    .find((tag) => extractAttribute(tag, "name").toLowerCase() === "description");
  const canonicalTag = Array.from(html.matchAll(/<link\b[^>]*>/gi))
    .map((match) => match[0])
    .find((tag) => extractAttribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical"));
  const internalLinkCount = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)).filter((match) =>
    sameSiteHref(decodeHtmlAttribute(match[1]), pageUrl)
  ).length;

  return {
    title,
    metaDescription: metaDescriptionTag ? extractAttribute(metaDescriptionTag, "content") : "",
    canonical: canonicalTag ? extractAttribute(canonicalTag, "href") : "",
    internalLinkCount,
  };
}

function flattenJsonLd(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const graph = objectValue["@graph"];
    return [value, ...(Array.isArray(graph) ? graph.flatMap(flattenJsonLd) : [])];
  }
  return [];
}

function typeIncludes(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value.toLowerCase() === expected.toLowerCase();
  if (Array.isArray(value)) return value.some((item) => typeIncludes(item, expected));
  return false;
}

export function extractJsonLdSignals(html: string): JsonLdSignals {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const nodes: Array<Record<string, unknown>> = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      for (const node of flattenJsonLd(parsed)) {
        if (node && typeof node === "object") nodes.push(node as Record<string, unknown>);
      }
    } catch {
      // Ignore invalid embedded JSON-LD instead of failing the audit.
    }
  }

  const productNodes = nodes.filter((node) => typeIncludes(node["@type"], "Product"));
  const hasOfferSchema = productNodes.some((node) => {
    const offers = node.offers;
    if (Array.isArray(offers)) return offers.length > 0;
    return Boolean(offers && typeof offers === "object");
  });
  const hasAvailability = productNodes.some((node) => JSON.stringify(node.offers ?? "").toLowerCase().includes("availability"));
  const hasReviewSignal = productNodes.some((node) => Boolean(node.review || node.aggregateRating));

  return {
    productSchemaCount: productNodes.length,
    hasProductSchema: productNodes.length > 0,
    hasOfferSchema,
    hasAvailability,
    hasReviewSignal,
  };
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "GEO-Commerce-Audit/2.0",
        accept: "text/html,text/plain,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

const policyPaths = [
  "/shipping/",
  "/shipping-policy/",
  "/returns/",
  "/return-policy/",
  "/refund-policy/",
  "/pages/shipping",
  "/pages/returns",
  "/contact/",
  "/about/",
];

export function summarizePolicyPages(pages: Array<{ path: string; text?: string | null }>): PolicyPageSummary {
  const availablePages = pages
    .map((page) => ({ path: page.path, text: (page.text ?? "").trim() }))
    .filter((page) => page.text.length > 0);

  return {
    policyText: availablePages.map((page) => page.text).join("\n\n").slice(0, 6000),
    policyPageCount: availablePages.length,
    policyPageSources: availablePages.map((page) => page.path),
  };
}

async function collectPolicyPages(domain: string) {
  const pages = await Promise.all(
    policyPaths.map(async (path) => {
      const html = await fetchText(resolveSiteUrl(domain, path));
      return { path, text: html ? htmlToReadableText(html) : "" };
    })
  );
  return summarizePolicyPages(pages);
}

export function summarizeProductPageSamples(samples: ProductPageEvidence[]): ProductPageSampleSummary {
  return {
    productSampleText: samples
      .map((sample) => sample.pageText)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000),
    productSampleCount: samples.length,
    productSampleSchemaCount: samples.reduce((sum, sample) => sum + sample.productSchemaCount, 0),
    productSampleOfferCount: samples.filter((sample) => sample.hasOfferSchema).length,
    productSampleAvailabilityCount: samples.filter((sample) => sample.hasAvailability).length,
    productSampleReviewCount: samples.filter((sample) => sample.hasReviewSignal).length,
  };
}

async function collectProductPageSamples(productUrls: string[]) {
  const uniqueUrls = Array.from(new Set(productUrls.filter((url) => url.startsWith("http")))).slice(0, 5);
  const samples = await Promise.all(uniqueUrls.map((url) => collectProductPageEvidence(url)));
  return summarizeProductPageSamples(samples.filter((sample): sample is ProductPageEvidence => Boolean(sample)));
}

export async function collectSitePageEvidence(domain: string, landingPath = "/tiktok/", productUrls: string[] = []): Promise<SitePageEvidence> {
  const [homepageHtml, landingHtml, policySummary, llmsTxt, robotsTxt, sitemapXml] = await Promise.all([
    fetchText(resolveSiteUrl(domain, "/")),
    fetchText(resolveSiteUrl(domain, landingPath)),
    collectPolicyPages(domain),
    fetchText(resolveSiteUrl(domain, "/llms.txt")),
    fetchText(resolveSiteUrl(domain, "/robots.txt")),
    fetchText(resolveSiteUrl(domain, "/sitemap.xml")),
  ]);

  const homepageSignals = homepageHtml ? extractJsonLdSignals(homepageHtml) : null;
  const landingSignals = landingHtml ? extractJsonLdSignals(landingHtml) : null;
  const homepageUrl = resolveSiteUrl(domain, "/");
  const landingUrl = resolveSiteUrl(domain, landingPath);
  const homepageSeo = homepageHtml ? extractSeoSignals(homepageHtml, homepageUrl) : null;
  const landingSeo = landingHtml ? extractSeoSignals(landingHtml, landingUrl) : null;
  const productSampleSummary = await collectProductPageSamples(productUrls);

  return {
    homepageText: homepageHtml ? htmlToReadableText(homepageHtml) : "",
    landingPageText: landingHtml ? htmlToReadableText(landingHtml) : "",
    homepageTitle: homepageSeo?.title ?? "",
    landingPageTitle: landingSeo?.title ?? "",
    homepageMetaDescription: homepageSeo?.metaDescription ?? "",
    landingPageMetaDescription: landingSeo?.metaDescription ?? "",
    homepageCanonical: homepageSeo?.canonical ?? "",
    landingPageCanonical: landingSeo?.canonical ?? "",
    homepageInternalLinkCount: homepageSeo?.internalLinkCount ?? 0,
    landingPageInternalLinkCount: landingSeo?.internalLinkCount ?? 0,
    policyText: policySummary.policyText,
    policyPageCount: policySummary.policyPageCount,
    policyPageSources: policySummary.policyPageSources,
    llmsTxtFound: Boolean(llmsTxt),
    robotsTxtFound: Boolean(robotsTxt),
    sitemapFound: Boolean(sitemapXml),
    productSchemaCount:
      (homepageSignals?.productSchemaCount ?? 0) +
      (landingSignals?.productSchemaCount ?? 0) +
      productSampleSummary.productSampleSchemaCount,
    productPageCount: (landingSignals?.hasProductSchema ? 1 : 0) + productSampleSummary.productSampleCount,
    ...productSampleSummary,
  };
}

export async function collectProductPageEvidence(url: string | null | undefined): Promise<ProductPageEvidence | null> {
  if (!url?.startsWith("http")) return null;
  const html = await fetchText(url);
  if (!html) return null;
  return {
    pageText: htmlToReadableText(html),
    ...extractJsonLdSignals(html),
  };
}
