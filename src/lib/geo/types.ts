export type GeoCheckResult = {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: "pass" | "warn" | "fail";
  message: string;
  recommendation: string;
};

export type GeoAuditReport = {
  overallScore: number;
  checks: GeoCheckResult[];
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
