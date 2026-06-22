import type { GeoActionItem, GeoAuditReport, GeoCheckResult, GeoEvidenceItem } from "./types";

export function formatGeoScoreGap(check: Pick<GeoCheckResult, "score" | "maxScore" | "message">) {
  const gap = check.maxScore - check.score;
  if (gap <= 0) return null;
  return `还差 ${gap} 分：${check.message}`;
}

export type GeoAuditDelta = {
  status: "new" | "improved" | "declined" | "flat";
  scoreDelta: number;
  passDelta: number;
  warnDelta: number;
  failDelta: number;
  summary: string;
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
  if (!previous) {
    return {
      status: "new",
      scoreDelta: 0,
      passDelta: 0,
      warnDelta: 0,
      failDelta: 0,
      summary: "这是第一份可对比的 GEO Audit 报告。",
    };
  }

  const scoreDelta = current.overallScore - previous.overallScore;
  const passDelta = countStatus(current, "pass") - countStatus(previous, "pass");
  const warnDelta = countStatus(current, "warn") - countStatus(previous, "warn");
  const failDelta = countStatus(current, "fail") - countStatus(previous, "fail");
  const status = scoreDelta >= 3 ? "improved" : scoreDelta <= -3 ? "declined" : "flat";
  const summary =
    status === "improved"
      ? `比上次提升 ${scoreDelta} 分，通过项 ${signedNumber(passDelta)}，需处理项 ${signedNumber(failDelta)}。`
      : status === "declined"
        ? `比上次下降 ${Math.abs(scoreDelta)} 分，请优先查看新增的需处理项。`
        : `与上次基本持平，通过项 ${signedNumber(passDelta)}，需处理项 ${signedNumber(failDelta)}。`;

  return { status, scoreDelta, passDelta, warnDelta, failDelta, summary };
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
  target: string;
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

export function getGeoTaskCenterGroups({
  actionItems,
  scopeGaps,
  validationLoopItems,
  domain,
}: {
  actionItems: GeoActionItem[];
  scopeGaps: GeoScopeGap[];
  validationLoopItems: GeoValidationLoopItem[];
  domain?: string | null;
}): GeoTaskCenterGroup[] {
  const siteDomain = normalizeDomain(domain);
  const requiredTasks: GeoTaskCenterTask[] = scopeGaps.map((gap) => ({
    id: `scope-${gap.id}`,
    title: `Fix evidence gap: ${gap.label}`,
    priority: scopeSeverityToPriority(gap.severity),
    target: gap.label,
    goal: gap.reason,
    action: gap.nextStep,
    validation: "Rerun GEO Audit and confirm this evidence item changes to found.",
    copyBlock: null,
  }));

  const optimizationTasks: GeoTaskCenterTask[] = actionItems.slice(0, 5).map((item) => {
    const plan = getGeoOptimizationPlan({ id: item.id });
    return {
      id: item.id,
      title: item.title,
      priority: item.priority,
      target: item.target || siteDomain,
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
      title: `Validate: ${item.label}`,
      priority: item.status === "blocked" ? "high" : item.status === "watching" ? "medium" : "low",
      target: item.label,
      goal: item.signal,
      action: item.nextStep,
      validation: "Refresh the related data source, then compare the next GEO Audit with the previous report.",
      copyBlock: null,
    }));

  return [
    {
      id: "required",
      label: "Must fix first",
      summary: "Evidence and access issues that make the audit less trustworthy.",
      tasks: requiredTasks,
    },
    {
      id: "optimization",
      label: "Optimize next",
      summary: "Content, schema, and intent fixes that improve AI/search understanding.",
      tasks: optimizationTasks,
    },
    {
      id: "validation",
      label: "Watch results",
      summary: "Signals that prove whether the change is becoming visible or useful.",
      tasks: validationTasks,
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
