export type GeoCheckResult = {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: "pass" | "warn" | "fail";
  message: string;
  recommendation: string;
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

export type GeoAuditReport = {
  version?: "2.0";
  overallScore: number;
  checks: GeoCheckResult[];
  sections?: GeoAuditSection[];
  actionItems?: GeoActionItem[];
  summary: string;
  generatedAt: string;
};

export type ProductGeoInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  url?: string | null;
};

export type SiteGeoInput = {
  name: string;
  domain: string;
  brandVoice?: string | null;
  productCount?: number;
};
