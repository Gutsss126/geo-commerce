import type { GeoCheckResult } from "./types";

export function formatGeoScoreGap(check: Pick<GeoCheckResult, "score" | "maxScore" | "message">) {
  const gap = check.maxScore - check.score;
  if (gap <= 0) return null;
  return `还差 ${gap} 分：${check.message}`;
}
