export type GeoCheckResult = {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: "pass" | "warn" | "fail";
  message: string;
  recommendation: string;
  evidence?: string;
};

export type GeoAuditSection = {
  id: "site-understanding" | "commerce-readability" | "ai-recommendation-readiness" | "measurement-loop";
  title: string;
  score: number;
  maxScore: number;
  summary: string;
  checkIds: string[];
};

export type GeoActionItem = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  target: string;
  why: string;
  fix: string;
  validation: string;
};

export type GeoEvidenceItem = {
  id: string;
  label: string;
  status: "found" | "missing" | "partial" | "not_checked";
  source: string;
  detail: string;
};

export type GeoAuditReport = {
  version?: "2.0";
  overallScore: number;
  checks: GeoCheckResult[];
  sections?: GeoAuditSection[];
  actionItems?: GeoActionItem[];
  evidenceItems?: GeoEvidenceItem[];
  pageExperience?: PageExperienceReport;
  summary: string;
  generatedAt: string;
};

export type PageExperienceStatus = "pass" | "warn" | "fail" | "unavailable";

export type PageExperienceCategory = {
  label: string;
  score: number | null;
  status: PageExperienceStatus;
};

export type PageExperienceUrlResult = {
  url: string;
  status: PageExperienceStatus;
  fetchedAt: string;
  categories: {
    performance: PageExperienceCategory;
    accessibility: PageExperienceCategory;
    bestPractices: PageExperienceCategory;
    seo: PageExperienceCategory;
  };
  topRisks: string[];
};

export type PageExperienceReport = {
  source: "pagespeed";
  status: PageExperienceStatus;
  passCount: number;
  metricCount: number;
  checkedAt: string;
  results: PageExperienceUrlResult[];
};

export type ProductGeoInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  url?: string | null;
  pageText?: string | null;
  jsonLdTypes?: string[];
  hasProductSchema?: boolean;
  hasOfferSchema?: boolean;
  hasAvailability?: boolean;
  hasReviewSignal?: boolean;
};

export type SiteGeoInput = {
  name: string;
  domain: string;
  brandVoice?: string | null;
  productCount?: number;
  pageEvidence?: SitePageEvidence | null;
};

export type SitePageEvidence = {
  homepageText?: string | null;
  landingPageText?: string | null;
  homepageTitle?: string | null;
  landingPageTitle?: string | null;
  homepageMetaDescription?: string | null;
  landingPageMetaDescription?: string | null;
  homepageCanonical?: string | null;
  landingPageCanonical?: string | null;
  homepageInternalLinkCount?: number;
  landingPageInternalLinkCount?: number;
  policyText?: string | null;
  llmsTxtFound?: boolean;
  sitemapFound?: boolean;
  robotsTxtFound?: boolean;
  productSchemaCount?: number;
  productPageCount?: number;
};
