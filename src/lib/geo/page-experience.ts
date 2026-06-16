import type {
  PageExperienceCategory,
  PageExperienceReport,
  PageExperienceStatus,
  PageExperienceUrlResult,
} from "./types";
import { resolveSiteUrl } from "./page-evidence";

const PAGE_SPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PAGE_SPEED_TIMEOUT_MS = 8000;

type PageSpeedCategoryKey = "performance" | "accessibility" | "best-practices" | "seo";

const categoryLabels: Record<PageSpeedCategoryKey, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best Practices",
  seo: "SEO",
};

function statusFromScore(score: number | null): PageExperienceStatus {
  if (score === null) return "unavailable";
  if (score >= 90) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

function normalizeCategory(payload: unknown, key: PageSpeedCategoryKey): PageExperienceCategory {
  const category = payload && typeof payload === "object" ? (payload as Record<string, unknown>)[key] : null;
  const rawScore = category && typeof category === "object" ? (category as Record<string, unknown>).score : null;
  const score = typeof rawScore === "number" ? Math.round(rawScore * 100) : null;

  return {
    label: categoryLabels[key],
    score,
    status: statusFromScore(score),
  };
}

function overallStatus(categories: PageExperienceUrlResult["categories"]): PageExperienceStatus {
  const statuses = Object.values(categories).map((category) => category.status);
  if (statuses.every((status) => status === "unavailable")) return "unavailable";
  if (statuses.some((status) => status === "fail")) return "fail";
  if (statuses.some((status) => status === "warn")) return "warn";
  return "pass";
}

function extractTopRisks(audits: unknown) {
  if (!audits || typeof audits !== "object") return [];
  const auditMap = audits as Record<string, Record<string, unknown>>;
  const priorityIds = [
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "uses-optimized-images",
    "render-blocking-resources",
  ];

  return priorityIds
    .map((id) => auditMap[id])
    .filter((audit) => audit && typeof audit.score === "number" && audit.score < 0.9)
    .slice(0, 3)
    .map((audit) => {
      const title = typeof audit.title === "string" ? audit.title : "PageSpeed risk";
      const displayValue = typeof audit.displayValue === "string" ? `：${audit.displayValue}` : "";
      return `${title}${displayValue}`;
    });
}

function timeoutSignal(ms: number) {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

export function parsePageSpeedResult(url: string, payload: unknown): PageExperienceUrlResult {
  const lighthouse =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).lighthouseResult : null;
  const lighthouseObject = lighthouse && typeof lighthouse === "object" ? (lighthouse as Record<string, unknown>) : null;
  const categoriesPayload = lighthouseObject?.categories;
  const categories = {
    performance: normalizeCategory(categoriesPayload, "performance"),
    accessibility: normalizeCategory(categoriesPayload, "accessibility"),
    bestPractices: normalizeCategory(categoriesPayload, "best-practices"),
    seo: normalizeCategory(categoriesPayload, "seo"),
  };

  return {
    url,
    status: overallStatus(categories),
    fetchedAt:
      typeof lighthouseObject?.fetchTime === "string" ? lighthouseObject.fetchTime : new Date().toISOString(),
    categories,
    topRisks: extractTopRisks(lighthouseObject?.audits),
  };
}

export function summarizePageExperience(results: PageExperienceUrlResult[]): PageExperienceReport {
  const categories = results.flatMap((result) => Object.values(result.categories));
  const available = categories.filter((category) => category.status !== "unavailable");
  const passCount = available.filter((category) => category.status === "pass").length;
  const statuses = results.map((result) => result.status);

  return {
    source: "pagespeed",
    status:
      statuses.length === 0 || statuses.every((status) => status === "unavailable")
        ? "unavailable"
        : statuses.some((status) => status === "fail")
          ? "fail"
          : statuses.some((status) => status === "warn")
            ? "warn"
            : "pass",
    passCount,
    metricCount: available.length || categories.length,
    checkedAt: new Date().toISOString(),
    results,
  };
}

async function fetchPageSpeed(url: string): Promise<PageExperienceUrlResult> {
  const params = new URLSearchParams({
    url,
    strategy: "MOBILE",
  });
  for (const category of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) {
    params.append("category", category);
  }

  try {
    const response = await fetch(`${PAGE_SPEED_ENDPOINT}?${params.toString()}`, {
      headers: { accept: "application/json" },
      signal: timeoutSignal(PAGE_SPEED_TIMEOUT_MS),
      next: { revalidate: 1800 },
    });
    if (!response.ok) return parsePageSpeedResult(url, {});
    return parsePageSpeedResult(url, await response.json());
  } catch {
    return parsePageSpeedResult(url, {});
  }
}

export async function collectSitePageExperience(domain: string, landingPath = "/tiktok/") {
  const urls = [resolveSiteUrl(domain, "/"), resolveSiteUrl(domain, landingPath)];
  const results = await Promise.all(urls.map((url) => fetchPageSpeed(url)));
  return summarizePageExperience(results);
}
