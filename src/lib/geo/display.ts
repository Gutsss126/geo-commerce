import type { GeoActionItem, GeoAuditReport, GeoCheckResult, GeoEvidenceItem } from "./types";

export function formatGeoScoreGap(check: Pick<GeoCheckResult, "score" | "maxScore" | "message">) {
  const gap = check.maxScore - check.score;
  if (gap <= 0) return null;
  return `还差 ${gap} 分：${check.message}`;
}

export type GeoAuditDelta = {
  status: "new" | "improved" | "declined" | "flat";
  currentScore: number;
  previousScore: number | null;
  currentPassCount: number;
  previousPassCount: number | null;
  currentFailCount: number;
  previousFailCount: number | null;
  scoreDelta: number;
  passDelta: number;
  warnDelta: number;
  failDelta: number;
  summary: string;
};

export type GeoEffectTrackingSummary = {
  status: "new" | "improved" | "declined" | "flat";
  summary: string;
  scoreDelta: number;
  improvedChecks: GeoCheckResult[];
  newRiskChecks: GeoCheckResult[];
  behaviorSignal: {
    status: "not_connected" | "watching" | "verified";
    label: string;
    detail: string;
  };
  waitWindows: Array<{
    label: string;
    purpose: string;
    status: "now" | "wait" | "later";
  }>;
};

function countStatus(report: Pick<GeoAuditReport, "checks">, status: GeoCheckResult["status"]) {
  return report.checks.filter((check) => check.status === status).length;
}

function signedNumber(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function formatGeoAuditDelta(
  current: Pick<GeoAuditReport, "overallScore" | "checks">,
  previous: Pick<GeoAuditReport, "overallScore" | "checks"> | null | undefined
): GeoAuditDelta {
  const currentPassCount = countStatus(current, "pass");
  const currentFailCount = countStatus(current, "fail");

  if (!previous) {
    return {
      status: "new",
      currentScore: current.overallScore,
      previousScore: null,
      currentPassCount,
      previousPassCount: null,
      currentFailCount,
      previousFailCount: null,
      scoreDelta: 0,
      passDelta: 0,
      warnDelta: 0,
      failDelta: 0,
      summary: "这是第一份可对比的 GEO Audit 报告。",
    };
  }

  const scoreDelta = current.overallScore - previous.overallScore;
  const previousPassCount = countStatus(previous, "pass");
  const previousFailCount = countStatus(previous, "fail");
  const passDelta = currentPassCount - previousPassCount;
  const warnDelta = countStatus(current, "warn") - countStatus(previous, "warn");
  const failDelta = currentFailCount - previousFailCount;
  const status = scoreDelta >= 3 ? "improved" : scoreDelta <= -3 ? "declined" : "flat";
  const summary =
    status === "improved"
      ? `比上次提升 ${scoreDelta} 分，通过项 ${signedNumber(passDelta)}，需处理项 ${signedNumber(failDelta)}。`
      : status === "declined"
        ? `比上次下降 ${Math.abs(scoreDelta)} 分，请优先查看新增的需处理项。`
        : `与上次基本持平，通过项 ${signedNumber(passDelta)}，需处理项 ${signedNumber(failDelta)}。`;

  return {
    status,
    currentScore: current.overallScore,
    previousScore: previous.overallScore,
    currentPassCount,
    previousPassCount,
    currentFailCount,
    previousFailCount,
    scoreDelta,
    passDelta,
    warnDelta,
    failDelta,
    summary,
  };
}

export type GeoOptimizationPlan = {
  title: string;
  summary: string;
  why: string;
  steps: string[];
  validation: string[];
  template?: string;
  events?: Array<{ name: string; purpose: string; placement: string }>;
  code?: string;
};

export type GeoExecutionTask = {
  stepLabel: string;
  title: string;
  priority: GeoActionItem["priority"];
  target: string;
  goal: string;
  action: string;
  copyBlock: string | null;
  validation: string;
};

export type GeoTaskCenterTask = {
  id: string;
  title: string;
  priority: GeoActionItem["priority"];
  status: "todo" | "review" | "improved";
  target: string;
  source: string;
  impact: string;
  explanation: string;
  goal: string;
  action: string;
  validation: string;
  copyBlock: string | null;
};

export type GeoTaskCenterGroup = {
  id: "required" | "optimization" | "validation";
  label: string;
  summary: string;
  tasks: GeoTaskCenterTask[];
};

export type GeoTaskCompletionChecklistItem = {
  id: "publish" | "verify" | "rerun";
  label: string;
  detail: string;
};

export type GeoAuditStageGate = {
  id: "diagnose" | "fix" | "verify" | "observe";
  label: string;
  status: "done" | "current" | "waiting" | "blocked";
  detail: string;
};

export type GeoAuditConclusion = {
  tone: "setup" | "risk" | "action" | "observe";
  headline: string;
  risk: string;
  nextAction: string;
  notReady: string;
};

export type GeoCheckGroupSummaryItem = {
  id: "access" | "understanding" | "trust" | "verification";
  label: string;
  purpose: string;
  total: number;
  passed: number;
  attention: number;
  status: "pass" | "warn" | "fail";
  topIssues: string[];
};

export type GeoAuditFaqItem = {
  id: "score-vs-effect" | "ga4-no-signal" | "time-window" | "what-to-fix" | "why-groups";
  question: string;
  answer: string;
  tone: "info" | "warn" | "action";
};

export type GeoAuditStatusSummaryItem = {
  id: "coverage" | "required" | "actions" | "validation";
  label: string;
  value: string;
  tone: "pass" | "warn" | "fail" | "info";
  detail: string;
};

export type GeoReviewStep = {
  id: "publish" | "rerun" | "compare";
  label: string;
  action: string;
  check: string;
};

export type GeoAuditScopeProduct = {
  title: string;
  url?: string | null;
  geoScore?: number | null;
};

export type GeoAuditScopeItem = {
  id:
    | "homepage"
    | "landing-page"
    | "product-sample"
    | "policy-pages"
    | "crawl-files"
    | "ga4"
    | "page-experience";
  label: string;
  source: string;
  status: GeoEvidenceItem["status"];
  detail: string;
};

export type GeoScopeGap = {
  id: GeoAuditScopeItem["id"];
  label: string;
  severity: "high" | "medium" | "low";
  reason: string;
  nextStep: string;
};

export type GeoValidationLoopItem = {
  id: "technical" | "understanding" | "traffic" | "commerce";
  label: string;
  status: "verified" | "watching" | "blocked" | "not_connected";
  signal: string;
  nextStep: string;
};

export type GeoVerificationDecisionStatus = "verified" | "watching" | "waiting" | "blocked";

export type GeoVerificationDecisionItem = {
  id: "basic" | "understanding" | "behavior" | "commerce" | "time";
  label: string;
  status: GeoVerificationDecisionStatus;
  signal: string;
  nextStep: string;
};

export type GeoVerificationDecisionSummary = {
  headline: string;
  summary: string;
  primaryAction: string;
  items: GeoVerificationDecisionItem[];
};

export type GeoTodayActionPlan = {
  mode: "audit" | "verify" | "fix" | "watch";
  title: string;
  summary: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  steps: Array<{
    label: string;
    detail: string;
  }>;
};

function normalizePath(path?: string | null) {
  const raw = (path || "/tiktok/").trim();
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function findEvidenceStatus(
  evidenceItems: GeoEvidenceItem[] | undefined,
  id: string
): GeoEvidenceItem["status"] {
  return evidenceItems?.find((item) => item.id === id)?.status ?? "not_checked";
}

function checkStatusToEvidenceStatus(
  status?: GeoCheckResult["status"]
): GeoEvidenceItem["status"] {
  if (status === "pass") return "found";
  if (status === "warn") return "partial";
  if (status === "fail") return "missing";
  return "not_checked";
}

export function getGeoAuditScopeItems({
  domain,
  landingPath,
  products,
  report,
}: {
  domain?: string | null;
  landingPath?: string | null;
  products?: GeoAuditScopeProduct[];
  report?: Pick<GeoAuditReport, "checks" | "evidenceItems" | "pageExperience"> | null;
}): GeoAuditScopeItem[] {
  const siteDomain = normalizeDomain(domain);
  const path = normalizePath(landingPath);
  const productCount = products?.length ?? 0;
  const productSampleEvidence = report?.evidenceItems?.find((item) => item.id === "product-sample");
  const policyEvidence = report?.evidenceItems?.find((item) => item.id === "policies");
  const crawlFilesEvidence = report?.evidenceItems?.find((item) => item.id === "crawl-files");
  const ga4Check = report?.checks.find((check) => check.id === "measurement-readiness");
  const pageExperienceStatus = report?.pageExperience?.status;

  return [
    {
      id: "homepage",
      label: "Homepage",
      source: `https://${siteDomain}/`,
      status: findEvidenceStatus(report?.evidenceItems, "homepage"),
      detail: "Brand, core offer, navigation, and trust signals.",
    },
    {
      id: "landing-page",
      label: "Landing page",
      source: `https://${siteDomain}${path}`,
      status: findEvidenceStatus(report?.evidenceItems, "landing-page"),
      detail: "Campaign promise, user scenario, CTA, and conversion intent.",
    },
    {
      id: "product-sample",
      label: "Product sample",
      source: productSampleEvidence?.source ?? (productCount > 0 ? "Top or latest product pages" : "No product pages selected"),
      status: productSampleEvidence?.status ?? (productCount > 0 ? "partial" : "not_checked"),
      detail:
        productSampleEvidence?.detail ??
        (productCount > 0
          ? `${productCount} product page${productCount > 1 ? "s" : ""} available; rerun audit to read product-page evidence.`
          : "Connect or add products to include product-page evidence."),
    },
    {
      id: "policy-pages",
      label: "Policy pages",
      source: policyEvidence?.source ?? "shipping / returns / contact / about",
      status: policyEvidence?.status ?? "not_checked",
      detail: policyEvidence?.detail ?? "Shipping, returns, contact, and brand trust pages have not been checked yet.",
    },
    {
      id: "crawl-files",
      label: "Crawl files",
      source: crawlFilesEvidence?.source ?? `https://${siteDomain}/robots.txt and /sitemap.xml`,
      status: crawlFilesEvidence?.status ?? "not_checked",
      detail: crawlFilesEvidence?.detail ?? "robots.txt and sitemap.xml help search systems discover crawlable pages.",
    },
    {
      id: "ga4",
      label: "GA4 behavior data",
      source: "GA4 Data API and realtime diagnostics",
      status: checkStatusToEvidenceStatus(ga4Check?.status),
      detail: "Page views, clicks, add-to-cart, checkout, and conversion loop signals.",
    },
    {
      id: "page-experience",
      label: "Page experience",
      source: "Google PageSpeed Insights",
      status: pageExperienceStatus && pageExperienceStatus !== "unavailable" ? "found" : "not_checked",
      detail: "Performance, accessibility, best practices, and SEO basics.",
    },
  ];
}

export function getGeoCheckSourceLabel(check: Pick<GeoCheckResult, "id">) {
  const sourceById: Record<string, string> = {
    "brand-entity": "Homepage and site identity",
    "offer-clarity": "Homepage and landing page",
    "audience-fit": "Landing page",
    "long-tail-intent": "Landing page and FAQ",
    "title-clarity": "Homepage and landing page",
    taxonomy: "Site navigation",
    "catalog-coverage": "Product catalog",
    "product-schema-readiness": "Product pages",
    "price-trust": "Product pages",
    "factual-density": "Product pages",
    "canonical-url": "Page source",
    "internal-link-entry": "Homepage and landing page",
    "commercial-intent": "Landing page",
    "informational-intent": "FAQ and content blocks",
    "qa-structure": "FAQ and page content",
    "comparison-intent": "Landing page and product copy",
    "buyer-proof": "Reviews and trust signals",
    "policy-clarity": "Policy pages",
    "measurement-readiness": "GA4 behavior data",
    "llms-txt": "llms.txt",
    "seo-title-description": "Page source",
    "external-search-data": "Search Console",
  };

  return sourceById[check.id] ?? "Audit evidence";
}

function getGeoCheckGroupId(checkId: string): GeoCheckGroupSummaryItem["id"] {
  const accessIds = new Set([
    "canonical-url",
    "internal-link-entry",
    "llms-txt",
    "seo-title-description",
    "external-search-data",
  ]);
  const trustIds = new Set([
    "policy-clarity",
    "price-trust",
    "buyer-proof",
    "product-schema-readiness",
  ]);
  const verificationIds = new Set([
    "measurement-readiness",
    "traffic",
    "conversion",
    "commerce",
  ]);

  if (accessIds.has(checkId)) return "access";
  if (trustIds.has(checkId)) return "trust";
  if (verificationIds.has(checkId) || checkId.includes("ga4") || checkId.includes("traffic")) return "verification";
  return "understanding";
}

export function getGeoCheckGroupSummary(checks: GeoCheckResult[]): GeoCheckGroupSummaryItem[] {
  const definitions: Array<Pick<GeoCheckGroupSummaryItem, "id" | "label" | "purpose">> = [
    {
      id: "access",
      label: "网站能不能被读到",
      purpose: "确认搜索和 AI 能发现重要页面、标准链接、站点文件和基础 SEO 信息。",
    },
    {
      id: "understanding",
      label: "AI 能不能理解",
      purpose: "确认品牌、商品、受众、场景、FAQ 和购买意图是否表达清楚。",
    },
    {
      id: "trust",
      label: "信任信息是否完整",
      purpose: "确认价格、配送、退货、评价、商品结构化信息是否足够支撑购买判断。",
    },
    {
      id: "verification",
      label: "效果能不能验证",
      purpose: "确认 GA4、点击、加购、结账或后续搜索数据能支持效果判断。",
    },
  ];

  return definitions.map((definition) => {
    const groupChecks = checks.filter((check) => getGeoCheckGroupId(check.id) === definition.id);
    const passed = groupChecks.filter((check) => check.status === "pass").length;
    const attentionChecks = groupChecks.filter((check) => check.status !== "pass");
    const attention = attentionChecks.length;
    const status: GeoCheckGroupSummaryItem["status"] =
      groupChecks.length === 0 ? "warn" : attention === 0 ? "pass" : attention >= passed ? "fail" : "warn";

    return {
      ...definition,
      total: groupChecks.length,
      passed,
      attention,
      status,
      topIssues: attentionChecks.slice(0, 2).map((check) => check.name),
    };
  });
}

export function getGeoScopeGaps(scopeItems: GeoAuditScopeItem[]): GeoScopeGap[] {
  const nextSteps: Record<GeoAuditScopeItem["id"], string> = {
    homepage: "Make sure the homepage is public and rerun GEO Audit.",
    "landing-page": "Open the landing page in an incognito window, confirm it loads, then rerun GEO Audit.",
    "product-sample": "Sync or add representative product pages so the audit can inspect product facts and schema.",
    "policy-pages": "Publish or link Shipping, Returns, Contact, and About pages, then rerun GEO Audit.",
    "crawl-files": "Confirm robots.txt and sitemap.xml are public and include the important pages.",
    ga4: "Confirm GA4 Property ID, OAuth access, and conversion events, then refresh diagnostics.",
    "page-experience": "Rerun GEO Audit after the public pages are reachable by PageSpeed.",
  };

  return scopeItems
    .filter((item) => item.status !== "found")
    .map((item) => ({
      id: item.id,
      label: item.label,
      severity:
        item.status === "missing"
          ? "high"
          : item.status === "partial"
            ? "medium"
            : "low",
      reason: item.detail,
      nextStep: nextSteps[item.id],
    }));
}

function findCheck(
  report: Pick<GeoAuditReport, "checks"> | null | undefined,
  id: string
) {
  return report?.checks.find((check) => check.id === id) ?? null;
}

function allChecksPass(
  report: Pick<GeoAuditReport, "checks"> | null | undefined,
  ids: string[]
) {
  return ids.every((id) => findCheck(report, id)?.status === "pass");
}

function anyCheckFails(
  report: Pick<GeoAuditReport, "checks"> | null | undefined,
  ids: string[]
) {
  return ids.some((id) => findCheck(report, id)?.status === "fail");
}

export function getGeoEffectTrackingSummary({
  current,
  previous,
}: {
  current: Pick<GeoAuditReport, "overallScore" | "checks"> | null | undefined;
  previous?: Pick<GeoAuditReport, "overallScore" | "checks"> | null;
}): GeoEffectTrackingSummary {
  if (!current) {
    return {
      status: "new",
      summary: "还没有可追踪的 GEO Audit 结果。先运行一次审计，再用后续报告判断变化。",
      scoreDelta: 0,
      improvedChecks: [],
      newRiskChecks: [],
      behaviorSignal: {
        status: "not_connected",
        label: "等待首次审计",
        detail: "当前只能先建立基线，还不能判断优化效果。",
      },
      waitWindows: [
        { label: "现在", purpose: "先生成第一份 GEO Audit 基线", status: "now" },
        { label: "7 天", purpose: "有第二次审计和 GA4 数据后再比较访问/点击信号", status: "wait" },
        { label: "28 天", purpose: "数据稳定后再判断趋势", status: "later" },
      ],
    };
  }

  const scoreDelta = previous ? current.overallScore - previous.overallScore : 0;
  const status: GeoEffectTrackingSummary["status"] = !previous
    ? "new"
    : scoreDelta >= 3
      ? "improved"
      : scoreDelta <= -3
        ? "declined"
        : "flat";

  const improvedChecks = previous
    ? current.checks.filter((check) => check.status === "pass" && findCheck(previous, check.id)?.status !== "pass")
    : [];
  const newRiskChecks = previous
    ? current.checks.filter((check) => check.status === "fail" && findCheck(previous, check.id)?.status !== "fail")
    : [];

  const measurementCheck = findCheck(current, "measurement-readiness");
  const trafficCheck = findCheck(current, "traffic");
  const behaviorSignal: GeoEffectTrackingSummary["behaviorSignal"] =
    measurementCheck?.status !== "pass"
      ? {
          status: "not_connected",
          label: "行为数据不足",
          detail: "当前只能判断页面和审计分数，不能证明真实访问、点击或转化效果。",
        }
      : trafficCheck?.status === "pass"
        ? {
            status: "verified",
            label: "已有行为信号",
            detail: "GA4 已连接且有流量信号，可以继续观察点击、加购和结账事件。",
          }
        : {
            status: "watching",
            label: "等待行为数据",
            detail: "GA4 已连接，但仍需要 7/14/28 天窗口观察访问和关键事件变化。",
          };

  const summary =
    status === "new"
      ? "这是第一次可追踪审计，先把它当作基线；下一次审计后再判断变化。"
      : status === "improved"
        ? `本次分数 ${signedNumber(scoreDelta)}，已有 ${improvedChecks.length} 个检查项改善；仍需确认行为数据是否支持。`
        : status === "declined"
          ? `本次分数 ${signedNumber(scoreDelta)}，出现 ${newRiskChecks.length} 个新增风险；先处理风险再判断效果。`
          : `本次分数基本持平，已有 ${improvedChecks.length} 个改善项、${newRiskChecks.length} 个新增风险；继续按任务复查。`;

  return {
    status,
    summary,
    scoreDelta,
    improvedChecks,
    newRiskChecks,
    behaviorSignal,
    waitWindows: [
      { label: "现在", purpose: "确认页面内容、Schema、FAQ、站点文件是否被检测到", status: "now" },
      { label: "7 天", purpose: "观察访问、停留和主要点击是否出现信号", status: "wait" },
      { label: "14 天", purpose: "观察加购、结账等更深行为是否有变化", status: "wait" },
      { label: "28 天", purpose: "再判断业务趋势，避免被短期流量波动误导", status: "later" },
    ],
  };
}

export function getGeoValidationLoopItems({
  current,
  previous,
  scopeGaps,
}: {
  current: Pick<GeoAuditReport, "overallScore" | "checks"> | null | undefined;
  previous?: Pick<GeoAuditReport, "overallScore" | "checks"> | null;
  scopeGaps?: GeoScopeGap[];
}): GeoValidationLoopItem[] {
  const highScopeGap = (scopeGaps ?? []).some((gap) => gap.severity === "high");
  const scoreDelta = current && previous ? current.overallScore - previous.overallScore : null;
  const deltaSignal = scoreDelta === null ? "No previous audit yet" : `Score change ${signedNumber(scoreDelta)}`;
  const understandingChecks = ["brand-entity", "offer-clarity", "audience-fit"];
  const measurementCheck = findCheck(current, "measurement-readiness");
  const trafficCheck = findCheck(current, "traffic");

  return [
    {
      id: "technical",
      label: "基础有效",
      status: highScopeGap ? "blocked" : current ? "verified" : "watching",
      signal: highScopeGap ? "Key evidence is missing" : deltaSignal,
      nextStep: highScopeGap
        ? "Fix high-priority evidence gaps before judging optimization impact."
        : "Keep sitemap, robots, canonical, schema, and page access stable.",
    },
    {
      id: "understanding",
      label: "理解有效",
      status: anyCheckFails(current, understandingChecks)
        ? "blocked"
        : allChecksPass(current, understandingChecks)
          ? "verified"
          : "watching",
      signal: allChecksPass(current, understandingChecks)
        ? "Brand, offer, and audience checks pass"
        : "Some entity or intent checks still need work",
      nextStep: "Ask AI/search-style questions and compare whether the brand, offer, and target user are described correctly.",
    },
    {
      id: "traffic",
      label: "流量有效",
      status:
        measurementCheck?.status === "fail"
          ? "blocked"
          : trafficCheck?.status === "pass"
            ? "verified"
            : measurementCheck?.status === "pass"
              ? "watching"
              : "not_connected",
      signal:
        trafficCheck?.status === "pass"
          ? trafficCheck.message
          : measurementCheck?.status === "pass"
            ? "GA4 is connected; wait for 7/14/28-day comparison"
            : "GA4 or Search Console evidence is not ready",
      nextStep: "Compare Search Console impressions/clicks and GA4 sessions after each optimization window.",
    },
    {
      id: "commerce",
      label: "商业有效",
      status: "not_connected",
      signal: "Orders, checkout, and purchase attribution are not connected yet",
      nextStep: "Connect add_to_cart, checkout, purchase, or WooCommerce order data before claiming revenue impact.",
    },
  ];
}

function verificationStatusFromLoop(
  item: GeoValidationLoopItem | undefined
): GeoVerificationDecisionStatus {
  if (!item) return "waiting";
  if (item.status === "verified") return "verified";
  if (item.status === "blocked") return "blocked";
  if (item.status === "watching") return "watching";
  return "waiting";
}

export function getGeoVerificationDecisionSummary({
  current,
  previous,
  validationLoopItems,
  effectTracking,
}: {
  current: Pick<GeoAuditReport, "overallScore" | "checks"> | null | undefined;
  previous?: Pick<GeoAuditReport, "overallScore" | "checks"> | null;
  validationLoopItems: GeoValidationLoopItem[];
  effectTracking: GeoEffectTrackingSummary;
}): GeoVerificationDecisionSummary {
  const loopById = new Map(validationLoopItems.map((item) => [item.id, item]));
  const technical = loopById.get("technical");
  const understanding = loopById.get("understanding");
  const traffic = loopById.get("traffic");
  const commerce = loopById.get("commerce");
  const measurementCheck = findCheck(current, "measurement-readiness");
  const trafficCheck = findCheck(current, "traffic");
  const scoreDelta = current && previous ? current.overallScore - previous.overallScore : null;

  const behaviorStatus: GeoVerificationDecisionStatus =
    measurementCheck?.status === "fail" || traffic?.status === "blocked"
      ? "blocked"
      : effectTracking.behaviorSignal.status === "verified" || traffic?.status === "verified" || trafficCheck?.status === "pass"
        ? "verified"
        : measurementCheck?.status === "pass"
          ? "watching"
          : "waiting";

  const commerceStatus: GeoVerificationDecisionStatus =
    commerce?.status === "blocked"
      ? "blocked"
      : commerce?.status === "verified"
        ? "verified"
        : "waiting";

  const timeStatus: GeoVerificationDecisionStatus =
    !current ? "waiting" : previous ? "watching" : "waiting";

  const items: GeoVerificationDecisionItem[] = [
    {
      id: "basic",
      label: "基础有效",
      status: verificationStatusFromLoop(technical),
      signal: technical?.signal ?? "等待首次 GEO Audit",
      nextStep: technical?.nextStep ?? "先运行一次 GEO Audit，建立可对比基线。",
    },
    {
      id: "understanding",
      label: "理解有效",
      status: verificationStatusFromLoop(understanding),
      signal: understanding?.signal ?? "等待品牌、商品和受众检查",
      nextStep: understanding?.nextStep ?? "确认品牌、商品、受众和购买理由能被清晰读取。",
    },
    {
      id: "behavior",
      label: "行为有效",
      status: behaviorStatus,
      signal: effectTracking.behaviorSignal.label,
      nextStep:
        behaviorStatus === "blocked"
          ? "先打开 GA4 诊断，确认页面浏览、点击、加购和结账事件能被读取。"
          : behaviorStatus === "verified"
            ? "继续用 GA4 对比页面浏览、点击和加购趋势。"
            : "等待 GA4 累积 7/14/28 天数据后再判断趋势。",
    },
    {
      id: "commerce",
      label: "商业有效",
      status: commerceStatus,
      signal: commerce?.signal ?? "订单、结账和购买归因还未接入",
      nextStep: commerce?.nextStep ?? "接入 add_to_cart、checkout、purchase 或订单数据后再判断收入影响。",
    },
    {
      id: "time",
      label: "时间有效",
      status: timeStatus,
      signal: scoreDelta === null ? "还没有上一份报告可对比" : `Score change ${signedNumber(scoreDelta)}`,
      nextStep: previous
        ? "按 7/14/28 天窗口继续对比 Audit、GA4 和后续 Search Console 信号。"
        : "先保存当前报告作为基线，下次审计后再看变化。",
    },
  ];

  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const verifiedCount = items.filter((item) => item.status === "verified").length;
  const waitingCount = items.filter((item) => item.status === "waiting").length;

  const headline = blockedCount
    ? "先补齐验证入口"
    : verifiedCount >= 3 && waitingCount <= 1
      ? "可以开始观察效果"
      : "先建立验证基线";

  const primaryAction = blockedCount
    ? "先检查 GA4 诊断与高优先级缺口，再重新运行 GEO Audit。"
    : behaviorStatus === "verified"
      ? "继续用 GA4 观察页面浏览、点击、加购和结账事件。"
      : previous
        ? "等待 GA4 与下一次审计对比，不急着判断最终效果。"
        : "先保存本次结果作为基线，下一轮再对比变化。";

  return {
    headline,
    summary: `${verifiedCount}/5 个验证层已成立，${blockedCount} 个阻塞，${waitingCount} 个等待数据。`,
    primaryAction,
    items,
  };
}

export function getGeoTodayActionPlan({
  hasReport,
  featuredTask,
  verificationDecision,
}: {
  hasReport: boolean;
  featuredTask: GeoTaskCenterTask | null | undefined;
  verificationDecision: GeoVerificationDecisionSummary;
}): GeoTodayActionPlan {
  const blockedItem =
    verificationDecision.items.find((item) => item.id === "behavior" && item.status === "blocked") ??
    verificationDecision.items.find((item) => item.status === "blocked");

  if (!hasReport) {
    return {
      mode: "audit",
      title: "先生成第一份诊断",
      summary: "没有基线时，任何优化都无法判断是否真的有效。",
      primaryLabel: "运行 GEO Audit",
      primaryHref: "#geo-audit-result",
      secondaryLabel: "查看检查范围",
      secondaryHref: "#geo-audit-details",
      steps: [
        { label: "生成基线", detail: "先获得当前分数、问题和证据范围。" },
        { label: "只选一项", detail: "从任务中心选择最高优先级任务。" },
        { label: "复查变化", detail: "发布后重新审计，再看分数和 GA4 信号。" },
      ],
    };
  }

  if (blockedItem) {
    const isBehaviorBlocked = blockedItem.id === "behavior";
    return {
      mode: "verify",
      title: "先打通验证入口",
      summary: isBehaviorBlocked
        ? "GA4 或行为事件还没完全打通，先别急着判断优化效果。"
        : `${blockedItem.label} 还阻塞，先补齐这个验证层。`,
      primaryLabel: isBehaviorBlocked ? "查看 GA4 诊断" : "查看详细诊断",
      primaryHref: isBehaviorBlocked ? "/diagnostics/ga4" : "#geo-audit-details",
      secondaryLabel: "查看复查步骤",
      secondaryHref: "#geo-audit-review",
      steps: [
        { label: "确认阻塞", detail: blockedItem.signal },
        { label: "处理入口", detail: blockedItem.nextStep },
        { label: "重新验证", detail: "刷新诊断或重新运行 GEO Audit。" },
      ],
    };
  }

  if (featuredTask) {
    return {
      mode: "fix",
      title: "今天只处理一个任务",
      summary: featuredTask.title,
      primaryLabel: "打开任务中心",
      primaryHref: "#geo-audit-tasks",
      secondaryLabel: "查看验证判断",
      secondaryHref: "#geo-audit-review",
      steps: [
        { label: "处理任务", detail: featuredTask.action },
        { label: "发布修改", detail: "确认线上页面已经看到新内容。" },
        { label: "复查结果", detail: featuredTask.validation },
      ],
    };
  }

  return {
    mode: "watch",
    title: "保持观察，不要过度修改",
    summary: verificationDecision.primaryAction,
    primaryLabel: "查看验证判断",
    primaryHref: "#geo-audit-review",
    secondaryLabel: "查看详细诊断",
    secondaryHref: "#geo-audit-details",
    steps: [
      { label: "保持稳定", detail: "不要为了分数频繁改动已经稳定的页面。" },
      { label: "等待窗口", detail: "按 7/14/28 天观察 GA4 和后续搜索信号。" },
      { label: "再做复查", detail: "下一次审计再判断是否需要继续优化。" },
    ],
  };
}

export function getGeoExecutionTasks(
  actionItems: GeoActionItem[],
  domain?: string | null
): GeoExecutionTask[] {
  const siteDomain = normalizeDomain(domain);
  return actionItems.slice(0, 3).map((item, index) => {
    const plan = getGeoOptimizationPlan({ id: item.id });
    const copyBlock = plan?.template ?? plan?.code ?? null;
    return {
      stepLabel: `Task ${index + 1}`,
      title: item.title,
      priority: item.priority,
      target: item.target || siteDomain,
      goal: item.why,
      action: plan ? plan.steps[0] ?? item.fix : item.fix,
      copyBlock,
      validation: item.validation,
    };
  });
}

function scopeSeverityToPriority(severity: GeoScopeGap["severity"]): GeoActionItem["priority"] {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function getGeoTaskImpact(id: string) {
  const impactById: Record<string, string> = {
    "brand-entity": "影响 AI 是否能把品牌、官网和商品识别为同一个实体。",
    "offer-clarity": "影响用户和 AI 是否能快速理解你卖什么、适合谁、为什么值得买。",
    "audience-fit": "影响页面是否能匹配真实购买场景和目标用户。",
    "long-tail-intent": "影响长尾搜索和 AI 问答场景中是否容易被推荐。",
    "product-schema-readiness": "影响商品价格、库存、评价和可购买性是否能被机器读取。",
    "price-trust": "影响用户购买信任，也影响 AI 判断商品信息是否完整。",
    "policy-clarity": "影响配送、退货和信任信息是否足够清楚。",
    "measurement-readiness": "影响优化后是否能用 GA4 验证访问、点击、加购和结账行为。",
    "llms-txt": "影响 AI 爬虫是否能快速理解站点结构和优先页面。",
    "seo-title-description": "影响搜索结果和 AI 摘要能否提取清晰页面主题。",
    "canonical-url": "影响搜索系统是否能判断哪个页面是标准版本。",
    "internal-link-entry": "影响搜索和 AI 是否能从站内入口发现重点页面。",
    "external-search-data": "影响是否能用真实搜索曝光和点击验证优化效果。",
  };

  return impactById[id] ?? "影响 AI、搜索或用户是否能稳定理解并验证这个页面。";
}

function getGeoTaskExplanation(id: string) {
  const explanationById: Record<string, string> = {
    "measurement-readiness": "这个问题来自行为验证闭环：页面可能能被看到，但还需要确认用户动作能被记录。",
    "product-schema-readiness": "这个问题来自商品机器可读性：商品页需要让系统读懂价格、库存、评价和购买状态。",
    "policy-clarity": "这个问题来自信任信息：配送、退货、联系和品牌说明会影响购买信心。",
    "llms-txt": "这个问题来自 AI 爬虫说明：它帮助 AI 更快知道应该优先读取哪些页面。",
    "seo-title-description": "这个问题来自页面源码：标题和描述是搜索与 AI 摘要最先读取的信号。",
    "canonical-url": "这个问题来自页面源码：标准链接能减少重复页面造成的判断混乱。",
    "internal-link-entry": "这个问题来自站内路径：重点页面需要能从首页或导航自然进入。",
  };

  return explanationById[id] ?? "这个任务来自本次 GEO Audit 的证据与评分结果，优先处理可以提升诊断可信度。";
}

export function getGeoTaskCenterGroups({
  actionItems,
  scopeGaps,
  validationLoopItems,
  currentReport,
  previousReport,
  domain,
}: {
  actionItems: GeoActionItem[];
  scopeGaps: GeoScopeGap[];
  validationLoopItems: GeoValidationLoopItem[];
  currentReport?: Pick<GeoAuditReport, "checks"> | null;
  previousReport?: Pick<GeoAuditReport, "checks"> | null;
  domain?: string | null;
}): GeoTaskCenterGroup[] {
  const siteDomain = normalizeDomain(domain);
  const getTaskStatus = (id: string): GeoTaskCenterTask["status"] => {
    const current = findCheck(currentReport, id);
    const previous = findCheck(previousReport, id);

    if (current?.status === "pass" && previous?.status !== "pass") return "improved";
    if (current?.status === "fail") return "todo";
    return "review";
  };

  const requiredTasks: GeoTaskCenterTask[] = scopeGaps.map((gap) => ({
    id: `scope-${gap.id}`,
    title: `补齐检查证据：${gap.label}`,
    priority: scopeSeverityToPriority(gap.severity),
    status: "todo",
    target: gap.label,
    source: "检查范围 / 证据缺口",
    impact: "影响本次诊断是否可信；证据不足时，不宜直接判断优化效果。",
    explanation: "这个任务来自检查范围缺口，先补齐证据，再看分数更稳。",
    goal: gap.reason,
    action: gap.nextStep,
    validation: "重新运行 GEO Audit，确认这个证据项变成已发现。",
    copyBlock: null,
  }));

  const optimizationTasks: GeoTaskCenterTask[] = actionItems.slice(0, 5).map((item) => {
    const plan = getGeoOptimizationPlan({ id: item.id });
    return {
      id: item.id,
      title: item.title,
      priority: item.priority,
      status: getTaskStatus(item.id),
      target: item.target || siteDomain,
      source: getGeoCheckSourceLabel({ id: item.id }),
      impact: getGeoTaskImpact(item.id),
      explanation: getGeoTaskExplanation(item.id),
      goal: item.why,
      action: plan?.steps[0] ?? item.fix,
      validation: item.validation,
      copyBlock: plan?.template ?? plan?.code ?? null,
    };
  });

  const validationTasks: GeoTaskCenterTask[] = validationLoopItems
    .filter((item) => item.status !== "verified")
    .map((item) => ({
      id: `validation-${item.id}`,
      title: `验证效果：${item.label}`,
      priority: item.status === "blocked" ? "high" : item.status === "watching" ? "medium" : "low",
      status: item.status === "blocked" ? "todo" : "review",
      target: item.label,
      source: "GEO 验证闭环",
      impact: "影响你能否判断优化是真的有效，而不只是页面分数变好。",
      explanation: "这个任务来自验证层状态，用来确认优化是否变成可见的数据变化。",
      goal: item.signal,
      action: item.nextStep,
      validation: "刷新相关数据源，再对比下一次 GEO Audit 和上一次报告。",
      copyBlock: null,
    }));

  return [
    {
      id: "required",
      label: "必须先修",
      summary: "先处理会影响检查可信度的证据和访问问题。",
      tasks: requiredTasks,
    },
    {
      id: "optimization",
      label: "继续优化",
      summary: "再处理内容、Schema 和用户意图，让 AI 与搜索更容易理解。",
      tasks: optimizationTasks,
    },
    {
      id: "validation",
      label: "观察结果",
      summary: "最后看数据变化，判断优化是否真的变得可见、可用。",
      tasks: validationTasks,
    },
  ];
}

export function getGeoTaskCompletionChecklist(task: Pick<GeoTaskCenterTask, "id" | "action" | "validation">): GeoTaskCompletionChecklistItem[] {
  const needsGa4 = task.id.includes("measurement") || task.id.includes("ga4") || task.id.includes("traffic");

  return [
    {
      id: "publish",
      label: "已完成修改",
      detail: task.action,
    },
    {
      id: "verify",
      label: needsGa4 ? "GA4 已看到信号" : "页面已重新检查",
      detail: needsGa4
        ? "打开 GA4 诊断，确认 page_view、点击、加购或结账事件已经出现。"
        : "重新运行 GEO Audit，确认这个问题不再出现在高优先级任务里。",
    },
    {
      id: "rerun",
      label: "已复查结果",
      detail: task.validation,
    },
  ];
}

export function getGeoAuditStageGates({
  hasReport,
  taskGroups,
  verificationDecision,
}: {
  hasReport: boolean;
  taskGroups: GeoTaskCenterGroup[];
  verificationDecision: GeoVerificationDecisionSummary;
}): GeoAuditStageGate[] {
  const tasks = taskGroups.flatMap((group) => group.tasks);
  const openTaskCount = tasks.filter((task) => task.status !== "improved").length;
  const blockedVerification = verificationDecision.items.find((item) => item.status === "blocked");
  const behaviorLayer = verificationDecision.items.find((item) => item.id === "behavior");
  const commerceLayer = verificationDecision.items.find((item) => item.id === "commerce");
  const canObserve = behaviorLayer?.status === "verified" && commerceLayer?.status !== "blocked";

  if (!hasReport) {
    return [
      { id: "diagnose", label: "诊断", status: "current", detail: "先运行 GEO Audit，建立第一份基线。" },
      { id: "fix", label: "修复", status: "waiting", detail: "等诊断生成后再选择最高优先级任务。" },
      { id: "verify", label: "验证", status: "waiting", detail: "等页面和 GA4 证据可读后再验证。" },
      { id: "observe", label: "观察", status: "waiting", detail: "等有 7/14/28 天数据后再看趋势。" },
    ];
  }

  return [
    {
      id: "diagnose",
      label: "诊断",
      status: "done",
      detail: "已有 GEO Audit 基线，可以继续执行任务。",
    },
    {
      id: "fix",
      label: "修复",
      status: openTaskCount > 0 ? "current" : "done",
      detail:
        openTaskCount > 0
          ? `当前还有 ${openTaskCount} 个任务需要处理，先做最高优先级。`
          : "当前没有明显待处理任务，保持页面稳定。",
    },
    {
      id: "verify",
      label: "验证",
      status: blockedVerification ? "blocked" : "current",
      detail: blockedVerification
        ? `验证被 ${blockedVerification.label} 阻塞，优先检查 GA4 或证据入口。`
        : verificationDecision.primaryAction,
    },
    {
      id: "observe",
      label: "观察",
      status: canObserve && openTaskCount === 0 ? "current" : "waiting",
      detail: canObserve
        ? "行为信号已可读，按 7/14/28 天窗口观察趋势。"
        : "等任务和验证入口稳定后，再进入趋势观察。",
    },
  ];
}

export function getGeoAuditConclusion({
  currentScore,
  taskGroups,
  stageGates,
  verificationDecision,
}: {
  currentScore: number | null | undefined;
  taskGroups: GeoTaskCenterGroup[];
  stageGates: GeoAuditStageGate[];
  verificationDecision: GeoVerificationDecisionSummary;
}): GeoAuditConclusion {
  const tasks = taskGroups.flatMap((group) => group.tasks);
  const featuredTask = tasks[0] ?? null;
  const blockedGate = stageGates.find((gate) => gate.status === "blocked");
  const blockedVerification = verificationDecision.items.find((item) => item.status === "blocked");
  const observeGate = stageGates.find((gate) => gate.id === "observe");

  if (currentScore === null || currentScore === undefined) {
    return {
      tone: "setup",
      headline: "还没有可判断的 GEO 基线",
      risk: "当前最大风险不是分数低，而是还没有第一份可对比报告。",
      nextAction: "先运行 GEO Audit，生成基线后再决定优化顺序。",
      notReady: "现在不能判断优化效果，因为还没有审计、GA4 和时间窗口对比。",
    };
  }

  if (blockedGate || blockedVerification) {
    const blockedLabel = blockedVerification?.label ?? blockedGate?.label ?? "验证入口";
    return {
      tone: "risk",
      headline: `当前分数 ${currentScore}，但验证入口还没完全打通`,
      risk: `${blockedLabel} 正在阻塞判断，优先检查 GA4、页面证据或高优先级缺口。`,
      nextAction: verificationDecision.primaryAction,
      notReady: "现在不能判断 GEO 优化是否真的有效，只能判断页面和配置是否更完整。",
    };
  }

  if (featuredTask) {
    return {
      tone: "action",
      headline: `当前分数 ${currentScore}，下一步先处理一个任务`,
      risk: `最大风险是任务过多导致执行分散，先不要同时改很多地方。`,
      nextAction: `优先处理：${featuredTask.title}`,
      notReady: "最终效果需要 7/14/28 天数据窗口，短期分数变化不能直接等同于增长。",
    };
  }

  return {
    tone: "observe",
    headline: `当前分数 ${currentScore}，进入观察阶段`,
    risk: "当前没有明显高优先级任务，过度修改反而可能破坏稳定信号。",
    nextAction: observeGate?.detail ?? verificationDecision.primaryAction,
    notReady: "继续等待 7/14/28 天 GA4 和搜索数据，再判断趋势。",
  };
}

export function getGeoAuditFaqItems({
  conclusion,
  verificationDecision,
  hasPreviousReport,
}: {
  conclusion: GeoAuditConclusion;
  verificationDecision: GeoVerificationDecisionSummary;
  hasPreviousReport: boolean;
}): GeoAuditFaqItem[] {
  const behaviorLayer = verificationDecision.items.find((item) => item.id === "behavior");
  const items: GeoAuditFaqItem[] = [
    {
      id: "score-vs-effect",
      question: "分数变好就代表 GEO 有效果吗？",
      answer: "不一定。分数只能说明页面、证据和配置更完整；真正效果还要看 GA4 行为、后续搜索曝光、点击和转化是否同步改善。",
      tone: "info",
    },
    {
      id: "time-window",
      question: "为什么一直提示 7/14/28 天？",
      answer: "GEO/SEO 不是实时排名按钮。7/14/28 天用于过滤短期波动，避免把一次访问、缓存或广告流量误判为长期优化效果。",
      tone: hasPreviousReport ? "info" : "warn",
    },
    {
      id: "what-to-fix",
      question: "我应该先改哪个问题？",
      answer: conclusion.nextAction,
      tone: "action",
    },
    {
      id: "why-groups",
      question: "为什么把检查项分成 4 类？",
      answer: "因为用户真正关心的是能不能被读到、AI 能不能理解、信任信息是否完整、效果能不能验证，而不是每个技术检查项的名字。",
      tone: "info",
    },
  ];

  if (behaviorLayer?.status === "blocked" || behaviorLayer?.status === "waiting") {
    items.splice(1, 0, {
      id: "ga4-no-signal",
      question: "为什么 GA4 或 GEO 后台暂时没反应？",
      answer: "先确认 GA4 Measurement ID、Property 权限、OAuth、page_view 和关键事件是否都正常。DebugView 或 GA4 实时数据出现后，GEO 才能继续判断行为层。",
      tone: "warn",
    });
  }

  return items;
}

export function getGeoAuditStatusSummary({
  scopeItems,
  scopeGaps,
  actionItems,
  validationLoopItems,
}: {
  scopeItems: GeoAuditScopeItem[];
  scopeGaps: GeoScopeGap[];
  actionItems: GeoActionItem[];
  validationLoopItems: GeoValidationLoopItem[];
}): GeoAuditStatusSummaryItem[] {
  const foundScopeCount = scopeItems.filter((item) => item.status === "found").length;
  const highGapCount = scopeGaps.filter((gap) => gap.severity === "high").length;
  const highActionCount = actionItems.filter((item) => item.priority === "high").length;
  const blockedValidationCount = validationLoopItems.filter((item) => item.status === "blocked").length;

  return [
    {
      id: "coverage",
      label: "检查覆盖",
      value: `${foundScopeCount}/${scopeItems.length}`,
      tone:
        foundScopeCount === scopeItems.length
          ? "pass"
          : foundScopeCount >= Math.ceil(scopeItems.length / 2)
            ? "warn"
            : "fail",
      detail: "已确认读取到的页面、文件和数据源数量。",
    },
    {
      id: "required",
      label: "硬缺口",
      value: String(highGapCount),
      tone: highGapCount > 0 ? "fail" : scopeGaps.length > 0 ? "warn" : "pass",
      detail: "优先处理会影响诊断可信度的问题。",
    },
    {
      id: "actions",
      label: "高优先任务",
      value: String(highActionCount),
      tone: highActionCount > 0 ? "warn" : "pass",
      detail: "当前建议中最应该先执行的优化动作。",
    },
    {
      id: "validation",
      label: "验证阻塞",
      value: String(blockedValidationCount),
      tone: blockedValidationCount > 0 ? "fail" : "pass",
      detail: "验证闭环中仍然卡住的层级。",
    },
  ];
}

export function getGeoReviewSteps(): GeoReviewStep[] {
  return [
    {
      id: "publish",
      label: "1. 发布修改",
      action: "先把页面内容、Schema、GA4 事件或站点文件发布到线上。",
      check: "用无痕窗口打开目标页面，确认用户看到的是新版本。",
    },
    {
      id: "rerun",
      label: "2. 重新检查",
      action: "回到 GEO Audit，重新运行 GEO Audit 生成新报告。",
      check: "优先看检查覆盖、硬缺口和任务中心是否发生变化。",
    },
    {
      id: "compare",
      label: "3. 对比变化",
      action: "对比本次 vs 上次，再结合 GA4 或后续 Search Console 数据观察效果。",
      check: "如果分数没变，先看证据是否读到；证据已读到再判断内容是否需要继续改。",
    },
  ];
}

export type GeoFixWorkflowAction = {
  kind: "audit" | "link";
  label: string;
  helper: string;
  href?: string;
  external?: boolean;
};

export type GeoFixWorkflow = {
  statuses: ["未开始", "处理中", "已完成，待复查"];
  reviewHint: string;
  actions: GeoFixWorkflowAction[];
};

export type GeoStrategyReadiness = {
  status: "verified" | "needs_work" | "external_required";
  title: string;
  summary: string;
  items: string[];
};

export function getGeoStrategyReadiness(): GeoStrategyReadiness[] {
  return [
    {
      status: "verified",
      title: "GEO 已验证",
      summary: "当前版本已经覆盖 AI/搜索理解独立站所需的基础证据。",
      items: ["页面证据", "品牌实体", "商品机器可读性", "FAQ/信任信息", "llms.txt", "GA4 行为验证闭环"],
    },
    {
      status: "needs_work",
      title: "SEO 基础待补",
      summary: "这些属于 SEO 与 GEO 的共同基础，应该作为下一轮轻量检测补齐。",
      items: ["title 与 meta description", "canonical", "robots.txt / sitemap.xml", "内链入口", "结构化数据完整度"],
    },
    {
      status: "external_required",
      title: "需要外部数据",
      summary: "这些指标必须接入真实搜索或性能数据后再判断，不能用页面文本硬猜。",
      items: ["Search Console 曝光和点击", "关键词排名", "Core Web Vitals", "索引覆盖状态", "搜索结果 CTR"],
    },
  ];
}

function normalizeDomain(domain?: string | null) {
  return (domain || "fancrafti.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getGeoFixWorkflow(check: Pick<GeoCheckResult, "id">, domain?: string | null): GeoFixWorkflow {
  const siteDomain = normalizeDomain(domain);
  const baseActions: GeoFixWorkflowAction[] = [
    {
      kind: "audit",
      label: "重新运行 GEO Audit",
      helper: "修改发布后复查证据和分数是否变化。",
    },
  ];

  const workflows: Record<string, Omit<GeoFixWorkflow, "statuses">> = {
    "measurement-readiness": {
      reviewHint: "完成事件代码后，先看 GA4 诊断页是否出现实时事件，再重新运行 GEO Audit。",
      actions: [
        {
          kind: "link",
          label: "查看 GA4 诊断",
          helper: "确认 page_view、点击、加购和结账事件是否进入面板。",
          href: "/diagnostics/ga4",
        },
        ...baseActions,
      ],
    },
    "llms-txt": {
      reviewHint: "发布 llms.txt 后，先确认文件可打开，再重新运行 GEO Audit。",
      actions: [
        {
          kind: "link",
          label: "打开 llms.txt",
          helper: "确认站点根目录文件已经发布。",
          href: `https://${siteDomain}/llms.txt`,
          external: true,
        },
        ...baseActions,
      ],
    },
    "product-schema-readiness": {
      reviewHint: "发布 Schema 后，先检查商品页源码或结构化数据测试，再重新运行 GEO Audit。",
      actions: [
        {
          kind: "link",
          label: "打开首页检查",
          helper: "从首页进入重点商品页，确认商品页已更新。",
          href: `https://${siteDomain}/`,
          external: true,
        },
        ...baseActions,
      ],
    },
  };

  const fallback: Omit<GeoFixWorkflow, "statuses"> = {
    reviewHint: "完成页面内容修改后，重新运行 GEO Audit，确认证据、缺口和分数是否变化。",
    actions: [
      {
        kind: "link",
        label: "打开落地页",
        helper: "确认用户看到的页面已经发布新内容。",
        href: `https://${siteDomain}/tiktok/`,
        external: true,
      },
      ...baseActions,
    ],
  };

  return {
    statuses: ["未开始", "处理中", "已完成，待复查"],
    ...(workflows[check.id] ?? fallback),
  };
}

export function getGeoOptimizationPlan(check: Pick<GeoCheckResult, "id">): GeoOptimizationPlan | null {
  const plans: Record<string, GeoOptimizationPlan> = {
    "brand-entity": {
      title: "品牌实体清晰度优化方案",
      summary: "让品牌名、域名和站内介绍保持一致，方便 AI 把它识别为同一个实体。",
      why: "AI 需要确认页面背后是谁、官网在哪里、是否和商品页/落地页属于同一个品牌。",
      steps: [
        "确认首页、页脚、About 页面使用同一个品牌名。",
        "确认域名、社媒名称、客服邮箱的品牌拼写一致。",
        "在首页或 About 页面加入一句简短品牌介绍。",
      ],
      validation: [
        "重新运行 GEO Audit，确认品牌实体清晰度提升。",
        "检查首页、/tiktok/、About 页是否都能看到同一个品牌名。",
      ],
      template:
        "FanCrafti is an independent studio creating handmade resin LED lamps for gifts, bedroom desks, gaming rooms, and collectors.",
    },
    "offer-clarity": {
      title: "核心销售主张优化方案",
      summary: "用一句话讲清楚卖什么、适合谁、为什么值得买。",
      why: "如果首页和落地页只有氛围词，AI 很难把站点匹配到具体购买意图。",
      steps: [
        "在首页首屏加入一条清晰主张。",
        "在 /tiktok/ 落地页重复同一核心主张，并突出当前活动。",
        "避免只写 unique、beautiful 这类抽象词，补充品类和场景。",
      ],
      validation: [
        "重新运行 GEO Audit，确认核心销售主张分数提升。",
        "检查 GA4 中主按钮点击是否改善。",
      ],
      template:
        "Handmade resin LED lamps for anime fans, gamers, collectors, and cozy bedroom desks. Pick any 3 styles and save on your first bundle.",
    },
    "audience-fit": {
      title: "目标用户和场景优化方案",
      summary: "把抽象卖点改成具体使用场景，让 AI 能判断应该推荐给谁。",
      why: "AI 推荐时需要把商品匹配到具体需求，例如送礼、卧室桌面、游戏房、收藏展示。只写好看或独特不够。",
      steps: [
        "在首页首屏加入 1 句目标用户说明。",
        "在 /tiktok/ 落地页加入 3 个使用场景标签。",
        "在 Top 商品描述里重复这些场景词，但不要堆关键词。",
      ],
      validation: [
        "重新运行 GEO Audit，确认目标用户和场景分数提升。",
        "用 GA4 查看 /tiktok/ 的停留和点击是否改善。",
      ],
      template:
        "适合送给 anime fans、gamers、collector desk owners，也适合 bedroom desk、gaming room 和 cozy home decor 场景。",
    },
    "commercial-intent": {
      title: "商业意图优化方案",
      summary: "让页面明确表达可购买、优惠、套装和下单路径。",
      why: "AI 推荐和搜索匹配都需要判断页面是否满足购买意图。只有氛围描述而没有 shop、bundle、save、price 等信号，容易被判断为信息页而不是购买页。",
      steps: [
        "在首屏按钮和标题附近加入 Shop、Bundle、Save、Price 等购买信号。",
        "把当前优惠或套装规则写清楚，例如 Pick Any 3 & Save。",
        "让主按钮指向明确商品集合或购买路径。",
      ],
      validation: [
        "重新运行 GEO Audit，确认商业意图覆盖提升。",
        "在 GA4 中观察 shop_bundle_click、top_sellers_click 和 add_to_cart 是否改善。",
      ],
      template:
        "Shop the FanCrafti bundle: Pick any 3 handmade resin LED lamps and save on your first order.",
    },
    "informational-intent": {
      title: "信息/FAQ 意图优化方案",
      summary: "补充购买前问题，让页面既能卖，也能回答用户疑虑。",
      why: "用户和 AI 都会问配送、退货、材质、尺寸、是否适合送礼等问题。页面能回答这些问题，才更容易被引用和推荐。",
      steps: [
        "在落地页或商品页加入简短 FAQ。",
        "覆盖 shipping、returns、materials、gift suitability、size、power source。",
        "把答案写成自然语言，不要只堆关键词。",
      ],
      validation: [
        "重新运行 GEO Audit，确认信息/FAQ 意图覆盖提升。",
        "观察 GA4 user_engagement 和商品页点击是否改善。",
      ],
      template:
        "FAQ: Is it suitable as a gift? Yes. Each handmade resin lamp is designed for anime fans, gamers, collectors, and bedroom desk decor. Shipping and returns are available.",
    },
    "long-tail-intent": {
      title: "长尾场景意图优化方案",
      summary: "把商品从泛泛的 lamp 拆成具体人群和场景。",
      why: "AI 推荐更依赖具体上下文，例如 anime fan gift、gaming room decor、bedroom desk lamp。长尾场景越清晰，越容易匹配到真实买家。",
      steps: [
        "在首页、/tiktok/ 和 Top SKU 中加入 3-5 个场景短语。",
        "优先覆盖 anime fan、gaming room、bedroom desk、collector shelf、gift buyer。",
        "让这些场景出现在标题、副标题、商品卡片和 FAQ 中。",
      ],
      validation: [
        "重新运行 GEO Audit，确认长尾场景意图提升。",
        "观察 /tiktok/ 页面点击和商品页继续浏览是否改善。",
      ],
      template:
        "Made for anime fan gifts, gaming room decor, bedroom desk lighting, collector shelves, and cozy handmade home decor.",
    },
    "seo-title-description": {
      title: "SEO 标题与描述优化方案",
      summary: "让首页和落地页在搜索结果、AI 摘要和浏览器标签里都能被清楚理解。",
      why: "title 和 meta description 是搜索系统理解页面主题的基础入口。缺少它们时，即使页面内容不错，也容易被错误摘要或低质量展示。",
      steps: [
        "给首页和 /tiktok/ 分别设置唯一 title，不要所有页面共用一个标题。",
        "meta description 控制在一句自然语言里，说明品牌、品类、目标用户和当前优惠。",
        "标题和描述要和页面真实内容一致，避免只堆关键词。",
      ],
      validation: [
        "重新运行 GEO Audit，确认 SEO 标题与描述检测通过。",
        "打开页面源码或浏览器检查 title 与 description 是否已经更新。",
      ],
      template:
        "Homepage title: FanCrafti Handmade Resin LED Lamps for Gifts and Desk Decor\nHomepage description: Shop handmade resin LED lamps for anime fans, gamers, bedrooms, collector shelves, and unique gift ideas.\n\n/tiktok/ title: TikTok Favorites - Pick Any 3 FanCrafti Resin Lamps & Save\n/tiktok/ description: Pick any 3 handmade resin LED lamps and save on FanCrafti TikTok favorites for gifts, gaming rooms, and bedroom desks.",
    },
    "canonical-url": {
      title: "Canonical 规范链接优化方案",
      summary: "告诉搜索系统哪个 URL 是页面的标准版本。",
      why: "电商页面常见重复参数、活动链接和尾斜杠差异。canonical 能帮助搜索系统把权重和理解集中到一个标准 URL。",
      steps: [
        "确认首页 canonical 指向 https://fancrafti.com/。",
        "确认 /tiktok/ canonical 指向 https://fancrafti.com/tiktok/。",
        "避免 canonical 指向错误域名、预览链接或带追踪参数的 URL。",
      ],
      validation: [
        "重新运行 GEO Audit，确认 Canonical 规范链接通过。",
        "打开页面源码，搜索 rel=\"canonical\"。",
      ],
      template:
        '<link rel="canonical" href="https://fancrafti.com/tiktok/" />',
    },
    "internal-link-entry": {
      title: "站内链接入口优化方案",
      summary: "让首页和落地页能自然通向商品、FAQ、配送退货和品牌信任页面。",
      why: "AI 和搜索系统不只看一个页面，还会通过站内链接理解网站结构。落地页如果没有清晰入口，用户和爬虫都会断在首屏。",
      steps: [
        "在 /tiktok/ 加入 Shop Bundle、See Top Sellers、FAQ、Shipping/Returns 的入口。",
        "首页加入到 /tiktok/、Shop、重点商品集合和 About/Contact 的自然链接。",
        "链接文字要表达目的，不要只写 click here。",
      ],
      validation: [
        "重新运行 GEO Audit，确认站内链接入口检测提升。",
        "手动打开 /tiktok/，确认用户能一键进入 Shop、Top Sellers、FAQ 或政策页。",
      ],
      template:
        "Recommended links: Shop Bundle, See Top Sellers, Shipping & Returns, FAQ, About FanCrafti, Contact Support.",
    },
    "external-search-data": {
      title: "外部搜索数据接入方案",
      summary: "把 SEO 判断从页面证据升级到真实曝光、点击、排名和性能。",
      why: "页面文本只能判断基础是否合格，不能证明搜索表现。关键词排名、CTR、索引覆盖和 Core Web Vitals 必须接外部数据。",
      steps: [
        "下一版接入 Google Search Console，读取页面曝光、点击、CTR 和查询词。",
        "再接入 PageSpeed 或 CrUX，读取 Core Web Vitals。",
        "把 SEO 建议和 GA4 行为一起看，避免只为分数优化页面。",
      ],
      validation: [
        "接入后确认工具能显示 Search Console 数据更新时间。",
        "优先观察 /tiktok/ 和 Top SKU 的曝光、点击、CTR、平均排名变化。",
      ],
    },
    "policy-clarity": {
      title: "配送/退货/信任信息优化方案",
      summary: "把购买前最担心的问题放到 AI 和用户都能读到的位置。",
      why: "如果配送、退货、联系和安全支付不清晰，AI 很难把站点判断为可信购买结果。",
      steps: [
        "确认站点有 Shipping、Returns、Contact、About 页面。",
        "在商品页或落地页底部加入简短的配送和退货摘要。",
        "把客服邮箱、损坏处理、退款周期写成明确句子。",
      ],
      validation: [
        "重新运行 GEO Audit，确认配送/退货/信任信息不再是高优先级问题。",
        "检查 GA4 中从落地页到商品页的继续浏览是否提升。",
      ],
      template:
        "Shipping: Orders are processed within 3-7 business days. Returns: Contact us within 30 days if your item arrives damaged or incorrect. Support: support@example.com.",
    },
    "llms-txt": {
      title: "llms.txt 与 AI 爬虫说明优化方案",
      summary: "给 AI 爬虫一份简洁站点说明，告诉它哪些页面最重要。",
      why: "llms.txt 不能保证被所有 AI 使用，但它是低成本的站点说明文件，能让核心页面、品牌、产品目录更容易被理解。",
      steps: [
        "在站点根目录创建 /llms.txt。",
        "写清品牌、主站、产品目录、核心落地页和联系方式。",
        "发布后用浏览器打开 https://你的域名/llms.txt 确认可访问。",
      ],
      validation: [
        "重新运行 GEO Audit，确认 llms.txt 检测通过。",
        "确认 robots.txt 和 sitemap.xml 也能访问。",
      ],
      template:
        "# FanCrafti\n\nFanCrafti sells handmade resin LED lamps for gifts, bedroom desks, gaming rooms, and collectors.\n\nImportant pages:\n- https://fancrafti.com/\n- https://fancrafti.com/tiktok/\n- https://fancrafti.com/shop/\n\nContact: support@fancrafti.com",
    },
    "product-schema-readiness": {
      title: "Product Schema 优化方案",
      summary: "让商品页具备机器可读的名称、图片、价格、库存和链接。",
      why: "Product Schema 是搜索系统和 AI 理解商品实体的重要信号，尤其影响价格、库存、评价和可购买性判断。",
      steps: [
        "确认商品页输出 Product JSON-LD。",
        "至少包含 name、image、description、offers.price、availability、url。",
        "如果有评价，加入 aggregateRating 或 review。",
      ],
      validation: [
        "重新运行 GEO Audit，确认 Product Schema 准备度提升。",
        "用 Google Rich Results Test 或页面源码确认 JSON-LD 存在。",
      ],
      template:
        '{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "FanCrafti Handmade Resin LED Lamp",\n  "image": "https://fancrafti.com/path-to-image.jpg",\n  "description": "Handmade resin LED lamp for bedroom desks and gifts.",\n  "offers": {\n    "@type": "Offer",\n    "priceCurrency": "USD",\n    "price": "39.99",\n    "availability": "https://schema.org/InStock",\n    "url": "https://fancrafti.com/products/example"\n  }\n}',
    },
    "catalog-coverage": {
      title: "商品目录覆盖优化方案",
      summary: "优先让 Top SKU 被同步、可访问、可解析，而不是一次性追求全站完美。",
      why: "AI 需要足够商品实体和内部链接，才能理解你的产品范围并做推荐。",
      steps: [
        "优先同步并优化 Top 20 个最想推广的商品。",
        "确保这些商品有标题、类目、价格、图片、URL 和描述。",
        "在首页、/tiktok/、集合页里链接到这些重点商品。",
      ],
      validation: [
        "重新运行 GEO Audit，确认商品目录覆盖提升。",
        "检查低分商品列表是否减少。",
      ],
      template:
        "Top SKU checklist: title, category, price, product URL, main image, 120+ word description, Product Schema, FAQ, shipping/return note.",
    },
    "title-clarity": {
      title: "商品标题优化方案",
      summary: "让标题直接说清品牌、品类、核心卖点和使用场景。",
      why: "商品标题是 AI 理解商品实体的第一入口，太短或太抽象会降低可推荐性。",
      steps: [
        "标题控制在 28-90 个字符左右。",
        "包含品牌、品类、材质/风格、使用场景。",
        "避免只写 Lamp、Gift、Cute 这类过短标题。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认商品标题分数提升。",
        "检查商品页标题在搜索结果和页面 H1 中一致。",
      ],
      template:
        "FanCrafti Handmade Resin LED Ocean Lamp for Bedroom Desk Gift",
    },
    "taxonomy": {
      title: "商品类目优化方案",
      summary: "给商品设置清晰类目，帮助 AI 判断它属于哪类购买需求。",
      why: "没有类目时，AI 只能依赖标题和描述猜测商品类型，容易把商品放错推荐场景。",
      steps: [
        "为每个商品设置稳定类目，例如 Handmade Resin LED Lamps。",
        "集合页和面包屑中使用同一类目名称。",
        "避免同类商品使用多个近似但不同的类目名。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认商品类目分数提升。",
        "检查低分商品中缺少类目的数量是否减少。",
      ],
      template:
        "Recommended categories: Handmade Resin LED Lamps, Gift Lamps, Desk Decor, Gaming Room Decor, Anime Gifts.",
    },
    "factual-density": {
      title: "商品事实密度优化方案",
      summary: "补充材质、尺寸、供电、包装、适用场景等可验证事实。",
      why: "AI 摘要更依赖事实而不是形容词。事实越清楚，越容易被准确引用和推荐。",
      steps: [
        "每个商品描述至少加入 5 个事实点。",
        "覆盖材质、尺寸、供电方式、包装、适用场景、手工差异。",
        "用短段落或列表展示，避免一整段堆满形容词。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认商品事实密度提升。",
        "检查页面证据里是否出现 resin、wood、USB、size、handmade 等词。",
      ],
      template:
        "Material: resin and wood base. Power: USB LED light. Use: bedroom desk, gaming room, collector shelf. Note: each handmade resin pattern is unique.",
    },
    "price-trust": {
      title: "价格与购买信号优化方案",
      summary: "让价格、库存、配送和退货信息稳定出现在商品页。",
      why: "AI 和用户都需要确认商品是否可购买，以及购买风险是否清楚。",
      steps: [
        "确认商品页显示价格、库存状态和购买按钮。",
        "在价格附近加入简短 Shipping、Returns 或 Secure checkout 信息。",
        "确保 Product Schema 中 offers.price 和 availability 正确。",
      ],
      validation: [
        "重新运行商品 GEO Audit，确认价格与购买信号提升。",
        "检查 GA4 add_to_cart 和 checkout_click 是否能被记录。",
      ],
      template:
        "Price includes the handmade lamp only. Shipping is calculated at checkout. Returns are accepted within 30 days for damaged or incorrect items.",
    },
    "qa-structure": {
      title: "购买疑问 FAQ 优化方案",
      summary: "把用户买之前会问的问题直接写出来，降低 AI 摘要的不确定性。",
      why: "FAQ 能帮助 AI 回答配送、材质、尺寸、是否适合送礼等具体问题，也能减少用户犹豫。",
      steps: [
        "在落地页或商品页加入 3-5 个 FAQ。",
        "优先覆盖是否手工、尺寸、供电方式、配送、退货、是否适合送礼。",
        "问题和答案都用自然语言，不要只堆关键词。",
      ],
      validation: [
        "重新运行 GEO Audit，确认购买疑问覆盖提升。",
        "观察 GA4 user_engagement 和商品点击是否改善。",
      ],
      template:
        "Q: Is each lamp handmade?\nA: Yes. Each resin lamp is handmade, so small pattern differences are normal.\n\nQ: Is it suitable as a gift?\nA: Yes. It is designed for bedroom desks, gaming rooms, collectors, and handmade gift buyers.",
    },
    "comparison-intent": {
      title: "对比与替代意图优化方案",
      summary: "说明为什么买这个，而不是普通灯或其他装饰品。",
      why: "AI 推荐通常发生在比较场景里。没有差异化描述时，页面很难成为推荐答案。",
      steps: [
        "在商品页加入一段 Compared with ordinary lamps 的说明。",
        "突出 handmade、unique resin pattern、gift-ready、desk decor 等差异。",
        "避免攻击竞品，只讲选择理由。",
      ],
      validation: [
        "重新运行 GEO Audit，确认对比与替代意图提升。",
        "观察商品页点击和加购是否改善。",
      ],
      template:
        "Compared with ordinary desk lamps, each FanCrafti resin lamp is handmade with a unique glowing scene, making it both a functional light and a collectible desk decor piece.",
    },
    "buyer-proof": {
      title: "信任证据优化方案",
      summary: "补充能证明商品真实可信的评价、制作过程和品牌信息。",
      why: "AI 和用户都需要可信信号。没有评价、实拍、制作过程或品牌故事时，推荐风险会更高。",
      steps: [
        "在商品页加入买家评价或真实使用场景。",
        "补充 handmade 制作过程、实拍图或工作室介绍。",
        "如果有评分，尽量用结构化数据输出 aggregateRating。",
      ],
      validation: [
        "重新运行 GEO Audit，确认信任证据提升。",
        "观察 add_to_cart 和 checkout_click 是否改善。",
      ],
      template:
        "Each lamp is handmade by the FanCrafti studio. Product photos show real lighting effects, and customer feedback is used to improve packaging, brightness, and desk display experience.",
    },
    "measurement-readiness": {
      title: "GA4 事件优化方案",
      summary: "把 GEO 建议和用户行为接起来，先追踪落地页核心点击，再扩展到加购和结账。",
      why: "GEO 优化不是只看分数，还要确认修改后用户是否真的点击、加购或结账。",
      events: [
        { name: "page_view", purpose: "确认页面被访问", placement: "/tiktok/ 页面加载后自动触发" },
        { name: "shop_bundle_click", purpose: "确认主按钮是否吸引点击", placement: "Shop Bundle 按钮" },
        { name: "top_sellers_click", purpose: "确认用户是否继续浏览商品", placement: "See Top Sellers 按钮" },
        { name: "add_to_cart", purpose: "确认商品页是否产生购买意图", placement: "商品页加购按钮" },
        { name: "checkout_click", purpose: "确认购物车是否进入结账", placement: "购物车或 Checkout 按钮" },
      ],
      steps: [
        "先在 /tiktok/ 页面确认 page_view、shop_bundle_click、top_sellers_click 能进入 GA4 实时报告。",
        "再把 add_to_cart 和 checkout_click 接到 WooCommerce 商品页和购物车按钮。",
        "修改 GEO 内容后，对比 24-72 小时内点击、加购和结账事件是否提升。",
      ],
      validation: [
        "打开 GA4 实时概览，确认事件能出现。",
        "回到 GEO 的 GA4 诊断页面，确认实时反馈和事件分析有数据。",
      ],
      code: `<script>
  window.fancraftiTrack = function(eventName, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, {
      page_path: "/tiktok/",
      page_location: "https://fancrafti.com/tiktok/",
      ...params
    });
  };

  document.addEventListener("click", function(event) {
    var target = event.target.closest("a, button");
    if (!target) return;
    var text = (target.textContent || "").trim().toLowerCase();
    var href = target.getAttribute("href") || "";

    if (text.includes("shop bundle")) {
      window.fancraftiTrack("shop_bundle_click", { link_url: href });
    }

    if (text.includes("top sellers")) {
      window.fancraftiTrack("top_sellers_click", { link_url: href });
    }

    if (text.includes("add to cart")) {
      window.fancraftiTrack("add_to_cart", { link_url: href });
    }

    if (text.includes("checkout")) {
      window.fancraftiTrack("checkout_click", { link_url: href });
    }
  });
</script>`,
    },
  };

  return plans[check.id] ?? null;
}
