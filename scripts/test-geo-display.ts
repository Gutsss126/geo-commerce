import assert from "node:assert/strict";
import { formatGeoScoreGap } from "../src/lib/geo/display";

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

console.log("GEO display tests passed");
