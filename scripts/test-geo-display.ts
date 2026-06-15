import assert from "node:assert/strict";
import {
  formatGeoScoreGap,
  getGeoFixWorkflow,
  getGeoOptimizationPlan,
  getGeoStrategyReadiness,
} from "../src/lib/geo/display";

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
assert.ok(ga4Plan?.events?.some((event) => event.name === "shop_bundle_click"));
assert.ok(ga4Plan?.code?.includes("shop_bundle_click"));

const audiencePlan = getGeoOptimizationPlan({ id: "audience-fit" });
assert.equal(audiencePlan?.title, "目标用户和场景优化方案");
assert.ok(audiencePlan?.template?.includes("适合"));
assert.ok(audiencePlan?.validation.some((item) => item.includes("重新运行 GEO Audit")));

const policyPlan = getGeoOptimizationPlan({ id: "policy-clarity" });
assert.equal(policyPlan?.title, "配送/退货/信任信息优化方案");
assert.ok(policyPlan?.steps.some((step) => step.includes("Shipping")));

const llmsPlan = getGeoOptimizationPlan({ id: "llms-txt" });
assert.equal(llmsPlan?.title, "llms.txt 与 AI 爬虫说明优化方案");
assert.ok(llmsPlan?.template?.includes("# FanCrafti"));

const productSchemaPlan = getGeoOptimizationPlan({ id: "product-schema-readiness" });
assert.equal(productSchemaPlan?.title, "Product Schema 优化方案");
assert.ok(productSchemaPlan?.template?.includes('"@type": "Product"'));

const requiredPlanIds = [
  "brand-entity",
  "offer-clarity",
  "catalog-coverage",
  "title-clarity",
  "taxonomy",
  "factual-density",
  "price-trust",
  "commercial-intent",
  "informational-intent",
  "long-tail-intent",
  "seo-title-description",
  "canonical-url",
  "internal-link-entry",
  "external-search-data",
];

for (const id of requiredPlanIds) {
  const plan = getGeoOptimizationPlan({ id });
  assert.ok(plan, `${id} should have a fix plan`);
  assert.ok(plan.steps.length >= 2, `${id} should include concrete steps`);
  assert.ok(plan.validation.length >= 1, `${id} should include validation guidance`);
}

assert.ok(getGeoOptimizationPlan({ id: "title-clarity" })?.template?.includes("Handmade"));
assert.ok(getGeoOptimizationPlan({ id: "price-trust" })?.template?.includes("Shipping"));
assert.ok(getGeoOptimizationPlan({ id: "commercial-intent" })?.template?.includes("Shop"));
assert.ok(getGeoOptimizationPlan({ id: "informational-intent" })?.template?.includes("FAQ"));
assert.ok(getGeoOptimizationPlan({ id: "long-tail-intent" })?.template?.includes("anime fan"));
assert.ok(getGeoOptimizationPlan({ id: "seo-title-description" })?.template?.includes("title"));
assert.ok(getGeoOptimizationPlan({ id: "canonical-url" })?.template?.includes("canonical"));
assert.ok(getGeoOptimizationPlan({ id: "internal-link-entry" })?.template?.includes("Shop"));
assert.ok(getGeoOptimizationPlan({ id: "external-search-data" })?.steps.some((step) => step.includes("Search Console")));

assert.equal(getGeoOptimizationPlan({ id: "unknown-check" }), null);

const ga4Workflow = getGeoFixWorkflow({ id: "measurement-readiness" }, "fancrafti.com");
assert.deepEqual(ga4Workflow.statuses, ["未开始", "处理中", "已完成，待复查"]);
assert.ok(ga4Workflow.actions.some((action) => action.href === "/diagnostics/ga4"));
assert.ok(ga4Workflow.actions.some((action) => action.kind === "audit"));

const llmsWorkflow = getGeoFixWorkflow({ id: "llms-txt" }, "fancrafti.com");
assert.ok(llmsWorkflow.actions.some((action) => action.href === "https://fancrafti.com/llms.txt"));

const contentWorkflow = getGeoFixWorkflow({ id: "audience-fit" }, "fancrafti.com");
assert.ok(contentWorkflow.reviewHint.includes("重新运行 GEO Audit"));

const strategyReadiness = getGeoStrategyReadiness();
assert.equal(strategyReadiness.length, 3);
assert.deepEqual(
  strategyReadiness.map((item) => item.status),
  ["verified", "needs_work", "external_required"]
);
assert.ok(strategyReadiness[0].items.some((item) => item.includes("页面证据")));
assert.ok(strategyReadiness[1].items.some((item) => item.includes("title")));
assert.ok(strategyReadiness[2].items.some((item) => item.includes("Search Console")));

console.log("GEO display tests passed");
