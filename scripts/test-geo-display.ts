import assert from "node:assert/strict";
import { formatGeoScoreGap, getGeoOptimizationPlan } from "../src/lib/geo/display";

assert.equal(
  formatGeoScoreGap({
    score: 10,
    maxScore: 12,
    message: "需要把 GEO 建议与 GA4 页面浏览、点击、加购和结账事件连接",
  }),
  "还差 2 分：需要把 GEO 建议与 GA4 页面浏览、点击、加购和结账事件连接"
);

assert.equal(
  formatGeoScoreGap({
    score: 16,
    maxScore: 16,
    message: "品牌和域名清晰",
  }),
  null
);

const ga4Plan = getGeoOptimizationPlan({
  id: "measurement-readiness",
});

assert.equal(ga4Plan?.title, "GA4 事件优化方案");
assert.ok(ga4Plan?.events.some((event) => event.name === "shop_bundle_click"));
assert.ok(ga4Plan?.code.includes("shop_bundle_click"));

assert.equal(
  getGeoOptimizationPlan({
    id: "brand-entity",
  }),
  null
);

console.log("GEO display tests passed");
