import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatGeoScoreGap,
  formatGeoAuditDelta,
  getGeoExecutionTasks,
  getGeoTaskCenterGroups,
  getGeoAuditStatusSummary,
  getGeoReviewSteps,
  getGeoAuditScopeItems,
  getGeoScopeGaps,
  getGeoValidationLoopItems,
  getGeoCheckSourceLabel,
  getGeoFixWorkflow,
  getGeoOptimizationPlan,
  getGeoStrategyReadiness,
  getGeoEffectTrackingSummary,
  getGeoVerificationDecisionSummary,
} from "../src/lib/geo/display";

const geoAuditPageSource = readFileSync("src/app/geo-audit/page.tsx", "utf8");

for (const anchor of ["#geo-audit-result", "#geo-audit-tasks", "#geo-audit-review", "#geo-audit-details"]) {
  assert.ok(geoAuditPageSource.includes(`href: "${anchor}"`), `GEO audit page should link to ${anchor}`);
}

for (const sectionId of ["geo-audit-result", "geo-audit-tasks", "geo-audit-review", "geo-audit-details"]) {
  assert.ok(geoAuditPageSource.includes(`id="${sectionId}"`), `GEO audit page should expose ${sectionId}`);
}

assert.ok(
  geoAuditPageSource.includes("topTasks[0]"),
  "GEO audit task center should highlight the first task as the starting point"
);

assert.ok(
  geoAuditPageSource.includes("detailsSummaryItems"),
  "GEO audit details section should expose compact summary metrics"
);

assert.ok(
  geoAuditPageSource.includes("DetailGroupLabel"),
  "GEO audit details section should group expanded diagnostics for easier scanning"
);

assert.ok(
  geoAuditPageSource.includes("WorkspaceFlowCard"),
  "GEO audit first screen should explain the workflow: status, next task, and effect tracking"
);

assert.ok(
  geoAuditPageSource.includes("TaskReviewActions"),
  "GEO audit task cards should expose the next review action"
);

assert.ok(
  geoAuditPageSource.includes("QuickFocusBanner"),
  "GEO audit page should expose a compact current-focus entry point"
);

assert.ok(
  geoAuditPageSource.includes("geoAuditPrimaryNavItems") && geoAuditPageSource.includes("geoAuditDetailsNavItem"),
  "GEO audit navigation should separate the 3-step workbench flow from secondary details"
);

assert.ok(
  geoAuditPageSource.includes("AuditDeltaActionLinks"),
  "GEO audit status card should include action links to tasks and review"
);

assert.ok(
  geoAuditPageSource.includes("TaskDetailDisclosure"),
  "GEO audit task cards should keep secondary task details folded by default"
);

assert.ok(
  geoAuditPageSource.includes("VerificationDecisionCard"),
  "GEO audit page should summarize what can be verified now before showing detailed diagnostics"
);

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

const auditDelta = formatGeoAuditDelta(
  {
    overallScore: 82,
    checks: [
      { id: "a", name: "A", score: 10, maxScore: 10, status: "pass", message: "", recommendation: "" },
      { id: "b", name: "B", score: 6, maxScore: 10, status: "warn", message: "", recommendation: "" },
      { id: "c", name: "C", score: 3, maxScore: 10, status: "fail", message: "", recommendation: "" },
    ],
  },
  {
    overallScore: 74,
    checks: [
      { id: "a", name: "A", score: 8, maxScore: 10, status: "pass", message: "", recommendation: "" },
      { id: "b", name: "B", score: 4, maxScore: 10, status: "fail", message: "", recommendation: "" },
      { id: "c", name: "C", score: 3, maxScore: 10, status: "fail", message: "", recommendation: "" },
    ],
  }
);
assert.equal(auditDelta.scoreDelta, 8);
assert.equal(auditDelta.currentScore, 82);
assert.equal(auditDelta.previousScore, 74);
assert.equal(auditDelta.currentPassCount, 1);
assert.equal(auditDelta.previousPassCount, 1);
assert.equal(auditDelta.currentFailCount, 1);
assert.equal(auditDelta.previousFailCount, 2);
assert.equal(auditDelta.passDelta, 0);
assert.equal(auditDelta.warnDelta, 1);
assert.equal(auditDelta.failDelta, -1);
assert.equal(auditDelta.status, "improved");
assert.ok(auditDelta.summary.includes("提升 8 分"));

const firstAuditDelta = formatGeoAuditDelta(
  {
    overallScore: 70,
    checks: [],
  },
  null
);
assert.equal(firstAuditDelta.status, "new");
assert.equal(firstAuditDelta.currentScore, 70);
assert.equal(firstAuditDelta.previousScore, null);
assert.equal(firstAuditDelta.summary, "这是第一份可对比的 GEO Audit 报告。");


const effectTracking = getGeoEffectTrackingSummary({
  current: {
    overallScore: 82,
    checks: [
      { id: "brand-entity", name: "Brand", score: 16, maxScore: 16, status: "pass", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4", score: 12, maxScore: 12, status: "pass", message: "", recommendation: "" },
      { id: "traffic", name: "Traffic", score: 4, maxScore: 8, status: "warn", message: "sessions pending", recommendation: "" },
      { id: "new-risk", name: "New Risk", score: 0, maxScore: 8, status: "fail", message: "", recommendation: "" },
    ],
  },
  previous: {
    overallScore: 74,
    checks: [
      { id: "brand-entity", name: "Brand", score: 8, maxScore: 16, status: "warn", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4", score: 4, maxScore: 12, status: "fail", message: "", recommendation: "" },
      { id: "traffic", name: "Traffic", score: 4, maxScore: 8, status: "warn", message: "", recommendation: "" },
      { id: "new-risk", name: "New Risk", score: 8, maxScore: 8, status: "pass", message: "", recommendation: "" },
    ],
  },
});
assert.equal(effectTracking.status, "improved");
assert.equal(effectTracking.scoreDelta, 8);
assert.deepEqual(
  effectTracking.improvedChecks.map((check) => check.id),
  ["brand-entity", "measurement-readiness"]
);
assert.deepEqual(
  effectTracking.newRiskChecks.map((check) => check.id),
  ["new-risk"]
);
assert.equal(effectTracking.behaviorSignal.status, "watching");
assert.ok(effectTracking.waitWindows.some((item) => item.label === "7 天"));

const firstEffectTracking = getGeoEffectTrackingSummary({
  current: { overallScore: 70, checks: [] },
  previous: null,
});
assert.equal(firstEffectTracking.status, "new");
assert.equal(firstEffectTracking.scoreDelta, 0);
assert.ok(firstEffectTracking.summary.includes("第一次"));

const executionTasks = getGeoExecutionTasks(
  [
    {
      id: "seo-title-description",
      priority: "high",
      title: "SEO Title",
      target: "fancrafti.com",
      why: "Missing title/meta",
      fix: "Add title/meta",
      validation: "Run audit again",
    },
    {
      id: "informational-intent",
      priority: "high",
      title: "FAQ Intent",
      target: "fancrafti.com",
      why: "Missing FAQ",
      fix: "Add FAQ",
      validation: "Check GA4",
    },
    {
      id: "unknown-check",
      priority: "medium",
      title: "Unknown",
      target: "fancrafti.com",
      why: "Unknown",
      fix: "Manual fix",
      validation: "Review",
    },
  ],
  "fancrafti.com"
);
assert.equal(executionTasks.length, 3);
assert.equal(executionTasks[0].stepLabel, "Task 1");
assert.equal(executionTasks[0].title, "SEO Title");
assert.ok(executionTasks[0].copyBlock?.includes("title"));
assert.ok(executionTasks[1].copyBlock?.includes("FAQ"));
assert.equal(executionTasks[2].copyBlock, null);

const taskCenterGroups = getGeoTaskCenterGroups({
  actionItems: [
    {
      id: "seo-title-description",
      priority: "high",
      title: "SEO Title",
      target: "fancrafti.com",
      why: "Missing title/meta",
      fix: "Add title/meta",
      validation: "Run audit again",
    },
    {
      id: "measurement-readiness",
      priority: "medium",
      title: "GA4 events",
      target: "fancrafti.com/tiktok",
      why: "Need behavior events",
      fix: "Add events",
      validation: "Refresh GA4",
    },
  ],
  scopeGaps: [
    {
      id: "crawl-files",
      label: "Crawl files",
      severity: "high",
      reason: "sitemap missing",
      nextStep: "Publish sitemap.xml",
    },
  ],
  validationLoopItems: [
    {
      id: "traffic",
      label: "Traffic validation",
      status: "watching",
      signal: "GA4 is connected",
      nextStep: "Compare sessions after 7 days",
    },
  ],
  currentReport: {
    checks: [
      { id: "seo-title-description", name: "SEO Title", score: 10, maxScore: 10, status: "pass", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4 events", score: 5, maxScore: 10, status: "warn", message: "", recommendation: "" },
    ],
  },
  previousReport: {
    checks: [
      { id: "seo-title-description", name: "SEO Title", score: 4, maxScore: 10, status: "fail", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4 events", score: 5, maxScore: 10, status: "warn", message: "", recommendation: "" },
    ],
  },
  domain: "fancrafti.com",
});
assert.deepEqual(
  taskCenterGroups.map((group) => group.id),
  ["required", "optimization", "validation"]
);
assert.equal(taskCenterGroups[0].tasks[0].id, "scope-crawl-files");
assert.equal(taskCenterGroups[1].tasks[0].id, "seo-title-description");
assert.equal(taskCenterGroups[2].tasks[0].id, "validation-traffic");
assert.equal(taskCenterGroups[1].tasks[0].status, "improved");
assert.equal(taskCenterGroups[1].tasks[1].status, "review");
assert.equal(taskCenterGroups[0].tasks[0].status, "todo");
assert.ok(taskCenterGroups.flatMap((group) => group.tasks).slice(0, 3).some((task) => task.title.includes("Crawl files")));
assert.equal(taskCenterGroups[0].tasks[0].source, "检查范围 / 证据缺口");
assert.ok(taskCenterGroups[1].tasks[0].source.includes("Page source"));
assert.ok(taskCenterGroups[1].tasks[0].impact.includes("搜索"));
assert.ok(taskCenterGroups[2].tasks[0].explanation.includes("验证层"));

const statusSummary = getGeoAuditStatusSummary({
  scopeItems: [
    { id: "homepage", label: "Homepage", source: "/", status: "found", detail: "ok" },
    { id: "landing-page", label: "Landing page", source: "/tiktok/", status: "found", detail: "ok" },
    { id: "crawl-files", label: "Crawl files", source: "/sitemap.xml", status: "missing", detail: "missing" },
  ],
  scopeGaps: taskCenterGroups[0].tasks.map((task) => ({
    id: "crawl-files",
    label: task.title,
    severity: task.priority === "high" ? "high" : "medium",
    reason: task.goal,
    nextStep: task.action,
  })),
  actionItems: [
    {
      id: "seo-title-description",
      priority: "high",
      title: "SEO Title",
      target: "fancrafti.com",
      why: "Missing title/meta",
      fix: "Add title/meta",
      validation: "Run audit again",
    },
  ],
  validationLoopItems: [
    {
      id: "technical",
      label: "Technical",
      status: "blocked",
      signal: "Evidence missing",
      nextStep: "Fix evidence",
    },
  ],
});
assert.equal(statusSummary.length, 4);
assert.equal(statusSummary[0].value, "2/3");
assert.equal(statusSummary[1].value, "1");
assert.equal(statusSummary[3].tone, "fail");

const reviewSteps = getGeoReviewSteps();
assert.equal(reviewSteps.length, 3);
assert.deepEqual(
  reviewSteps.map((step) => step.id),
  ["publish", "rerun", "compare"]
);
assert.ok(reviewSteps[1].action.includes("GEO Audit"));

const scopeItems = getGeoAuditScopeItems({
  domain: "fancrafti.com",
  landingPath: "/tiktok/",
  products: [
    {
      title: "Resin Lamp",
      url: "https://fancrafti.com/product/resin-lamp/",
      geoScore: 87,
    },
  ],
  report: {
    checks: [
      {
        id: "measurement-readiness",
        name: "GA4",
        score: 12,
        maxScore: 12,
        status: "pass",
        message: "",
        recommendation: "",
      },
    ],
    evidenceItems: [
      {
        id: "homepage",
        label: "Homepage",
        source: "https://fancrafti.com/",
        status: "found",
        detail: "Read homepage",
      },
      {
        id: "landing-page",
        label: "Landing page",
        source: "https://fancrafti.com/tiktok/",
        status: "found",
        detail: "Read landing page",
      },
      {
        id: "product-sample",
        label: "Product sample",
        source: "Top SKU",
        status: "found",
        detail: "Read 1 product sample",
      },
      {
        id: "policies",
        label: "Policies",
        source: "shipping / returns / contact / about",
        status: "found",
        detail: "Read policy pages",
      },
      {
        id: "crawl-files",
        label: "Crawl files",
        source: "robots.txt / sitemap.xml",
        status: "partial",
        detail: "robots found, sitemap missing",
      },
    ],
    pageExperience: {
      source: "pagespeed",
      status: "pass",
      passCount: 8,
      metricCount: 8,
      checkedAt: new Date().toISOString(),
      results: [],
    },
  },
});

assert.deepEqual(
  scopeItems.map((item) => item.id),
  ["homepage", "landing-page", "product-sample", "policy-pages", "crawl-files", "ga4", "page-experience"]
);
assert.equal(scopeItems[1].source, "https://fancrafti.com/tiktok/");
assert.equal(scopeItems[2].status, "found");
assert.ok(scopeItems[2].detail.includes("1 product"));
assert.equal(scopeItems[3].status, "found");
assert.equal(scopeItems[4].status, "partial");
assert.equal(scopeItems[5].status, "found");
assert.equal(scopeItems[6].status, "found");

assert.equal(getGeoCheckSourceLabel({ id: "measurement-readiness" }), "GA4 behavior data");
assert.equal(getGeoCheckSourceLabel({ id: "product-schema-readiness" }), "Product pages");
assert.equal(getGeoCheckSourceLabel({ id: "policy-clarity" }), "Policy pages");
assert.equal(getGeoCheckSourceLabel({ id: "offer-clarity" }), "Homepage and landing page");

const scopeGaps = getGeoScopeGaps([
  {
    id: "homepage",
    label: "Homepage",
    source: "https://fancrafti.com/",
    status: "found",
    detail: "Read homepage",
  },
  {
    id: "landing-page",
    label: "Landing page",
    source: "https://fancrafti.com/tiktok/",
    status: "missing",
    detail: "Landing page was not readable",
  },
  {
    id: "ga4",
    label: "GA4 behavior data",
    source: "GA4 Data API",
    status: "partial",
    detail: "Realtime works, historical report is empty",
  },
  {
    id: "policy-pages",
    label: "Policy pages",
    source: "shipping / returns / contact / about",
    status: "missing",
    detail: "No policies found",
  },
  {
    id: "product-sample",
    label: "Product sample",
    source: "No product pages selected",
    status: "not_checked",
    detail: "No products",
  },
]);

assert.deepEqual(
  scopeGaps.map((gap) => gap.id),
  ["landing-page", "ga4", "policy-pages", "product-sample"]
);
assert.equal(scopeGaps[0].severity, "high");
assert.ok(scopeGaps[0].nextStep.includes("landing page"));
assert.equal(scopeGaps[1].severity, "medium");
assert.equal(scopeGaps[2].severity, "high");
assert.equal(scopeGaps[3].severity, "low");

const validationLoop = getGeoValidationLoopItems({
  current: {
    overallScore: 82,
    checks: [
      { id: "brand-entity", name: "Brand", score: 16, maxScore: 16, status: "pass", message: "", recommendation: "" },
      { id: "offer-clarity", name: "Offer", score: 16, maxScore: 16, status: "pass", message: "", recommendation: "" },
      { id: "audience-fit", name: "Audience", score: 12, maxScore: 12, status: "pass", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4", score: 12, maxScore: 12, status: "pass", message: "", recommendation: "" },
      { id: "traffic", name: "Traffic", score: 8, maxScore: 8, status: "pass", message: "28 days sessions", recommendation: "" },
    ],
  },
  previous: {
    overallScore: 74,
    checks: [],
  },
  scopeGaps: [],
});

assert.deepEqual(
  validationLoop.map((item) => item.id),
  ["technical", "understanding", "traffic", "commerce"]
);
assert.equal(validationLoop[0].status, "verified");
assert.equal(validationLoop[1].status, "verified");
assert.equal(validationLoop[2].status, "verified");
assert.equal(validationLoop[3].status, "not_connected");
assert.ok(validationLoop[0].signal.includes("+8"));

const blockedValidationLoop = getGeoValidationLoopItems({
  current: {
    overallScore: 60,
    checks: [
      { id: "brand-entity", name: "Brand", score: 4, maxScore: 16, status: "fail", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4", score: 4, maxScore: 12, status: "fail", message: "", recommendation: "" },
    ],
  },
  previous: null,
  scopeGaps: [
    {
      id: "landing-page",
      label: "Landing page",
      severity: "high",
      reason: "Missing landing page",
      nextStep: "Fix landing page",
    },
  ],
});

assert.equal(blockedValidationLoop[0].status, "blocked");
assert.equal(blockedValidationLoop[1].status, "blocked");
assert.equal(blockedValidationLoop[2].status, "blocked");

const verificationDecision = getGeoVerificationDecisionSummary({
  current: {
    overallScore: 82,
    checks: [
      { id: "brand-entity", name: "Brand", score: 16, maxScore: 16, status: "pass", message: "", recommendation: "" },
      { id: "offer-clarity", name: "Offer", score: 16, maxScore: 16, status: "pass", message: "", recommendation: "" },
      { id: "audience-fit", name: "Audience", score: 12, maxScore: 12, status: "pass", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4", score: 12, maxScore: 12, status: "pass", message: "", recommendation: "" },
      { id: "traffic", name: "Traffic", score: 4, maxScore: 8, status: "warn", message: "sessions pending", recommendation: "" },
    ],
  },
  previous: {
    overallScore: 74,
    checks: [],
  },
  validationLoopItems: validationLoop,
  effectTracking,
});
assert.equal(verificationDecision.items.length, 5);
assert.deepEqual(
  verificationDecision.items.map((item) => item.id),
  ["basic", "understanding", "behavior", "commerce", "time"]
);
assert.equal(verificationDecision.items[0].status, "verified");
assert.equal(verificationDecision.items[2].status, "verified");
assert.equal(verificationDecision.items[3].status, "waiting");
assert.equal(verificationDecision.items[4].status, "watching");
assert.ok(verificationDecision.primaryAction.includes("GA4"));

const blockedVerificationDecision = getGeoVerificationDecisionSummary({
  current: {
    overallScore: 60,
    checks: [
      { id: "brand-entity", name: "Brand", score: 4, maxScore: 16, status: "fail", message: "", recommendation: "" },
      { id: "measurement-readiness", name: "GA4", score: 4, maxScore: 12, status: "fail", message: "", recommendation: "" },
    ],
  },
  previous: null,
  validationLoopItems: blockedValidationLoop,
  effectTracking: firstEffectTracking,
});
assert.equal(blockedVerificationDecision.items[0].status, "blocked");
assert.equal(blockedVerificationDecision.items[1].status, "blocked");
assert.equal(blockedVerificationDecision.items[2].status, "blocked");
assert.ok(blockedVerificationDecision.primaryAction.includes("GA4"));

console.log("GEO display tests passed");
