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

async function firstAvailableText(domain: string, paths: string[]) {
  for (const path of paths) {
    const text = await fetchText(resolveSiteUrl(domain, path));
    if (text) return htmlToReadableText(text);
  }
  return "";
}

export async function collectSitePageEvidence(domain: string, landingPath = "/tiktok/"): Promise<SitePageEvidence> {
  const [homepageHtml, landingHtml, policyText, llmsTxt, robotsTxt, sitemapXml] = await Promise.all([
    fetchText(resolveSiteUrl(domain, "/")),
    fetchText(resolveSiteUrl(domain, landingPath)),
    firstAvailableText(domain, ["/shipping/", "/shipping-policy/", "/returns/", "/refund-policy/", "/pages/shipping", "/pages/returns", "/contact/", "/about/"]),
    fetchText(resolveSiteUrl(domain, "/llms.txt")),
    fetchText(resolveSiteUrl(domain, "/robots.txt")),
    fetchText(resolveSiteUrl(domain, "/sitemap.xml")),
  ]);

  const homepageSignals = homepageHtml ? extractJsonLdSignals(homepageHtml) : null;
  const landingSignals = landingHtml ? extractJsonLdSignals(landingHtml) : null;

  return {
    homepageText: homepageHtml ? htmlToReadableText(homepageHtml) : "",
    landingPageText: landingHtml ? htmlToReadableText(landingHtml) : "",
    policyText,
    llmsTxtFound: Boolean(llmsTxt),
    robotsTxtFound: Boolean(robotsTxt),
    sitemapFound: Boolean(sitemapXml),
    productSchemaCount: (homepageSignals?.productSchemaCount ?? 0) + (landingSignals?.productSchemaCount ?? 0),
    productPageCount: landingSignals?.hasProductSchema ? 1 : 0,
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
