const defaultLandingPath = "/tiktok/";

export type SiteConfigInput = {
  domain?: string | null;
  landingPath?: string | null;
  ga4MeasurementId?: string | null;
  ga4PropertyId?: string | null;
  ga4Status?: string | null;
};

export type SiteAuditConfig = {
  domain: string;
  landingPath: string;
  ga4MeasurementId: string | null;
  ga4PropertyId: string | null;
  ga4Status: "configured" | "partial" | "not_configured";
};

export function normalizeSiteDomain(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/g, "")
    .trim();
}

export function normalizeSiteLandingPath(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return defaultLandingPath;
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function normalizeOptionalSiteValue(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

export function getGa4ConfigStatus(input: SiteConfigInput): SiteAuditConfig["ga4Status"] {
  const measurementId = normalizeOptionalSiteValue(input.ga4MeasurementId);
  const propertyId = normalizeOptionalSiteValue(input.ga4PropertyId);
  if (measurementId && propertyId) return "configured";
  if (measurementId || propertyId) return "partial";
  return "not_configured";
}

export function resolveSiteAuditConfig(input: SiteConfigInput): SiteAuditConfig {
  return {
    domain: normalizeSiteDomain(input.domain),
    landingPath: normalizeSiteLandingPath(input.landingPath),
    ga4MeasurementId: normalizeOptionalSiteValue(input.ga4MeasurementId),
    ga4PropertyId: normalizeOptionalSiteValue(input.ga4PropertyId),
    ga4Status: getGa4ConfigStatus(input),
  };
}

export function getSiteConfigStatus(input: SiteConfigInput) {
  const config = resolveSiteAuditConfig(input);
  return {
    landingPage: config.landingPath ? "ready" : "missing",
    ga4Tracking: config.ga4MeasurementId ? "ready" : "missing",
    ga4Reporting: config.ga4PropertyId ? "ready" : "missing",
  } as const;
}
