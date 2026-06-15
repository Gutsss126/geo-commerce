import type {
  GeoActionItem,
  GeoAuditReport,
  GeoAuditSection,
  GeoCheckResult,
  GeoEvidenceItem,
  ProductGeoInput,
  SiteGeoInput,
  SitePageEvidence,
} from "./types";

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function check(
  id: string,
  name: string,
  score: number,
  maxScore: number,
  message: string,
  recommendation: string,
  evidence?: string
): GeoCheckResult {
  const ratio = score / maxScore;
  const status = ratio >= 0.8 ? "pass" : ratio >= 0.5 ? "warn" : "fail";
  return { id, name, score, maxScore, status, message, recommendation, evidence };
}

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function scoreFromChecks(checks: GeoCheckResult[]) {
  const total = checks.reduce((sum, item) => sum + item.score, 0);
  const max = checks.reduce((sum, item) => sum + item.maxScore, 0);
  return clamp(Math.round((total / max) * 100));
}

function buildSections(checks: GeoCheckResult[]): GeoAuditSection[] {
  const sectionDefs: Array<Pick<GeoAuditSection, "id" | "title" | "checkIds">> = [
    {
      id: "site-understanding",
      title: "网站理解度",
      checkIds: ["brand-entity", "offer-clarity", "audience-fit", "long-tail-intent", "title-clarity", "taxonomy"],
    },
    {
      id: "commerce-readability",
      title: "商品机器可读性",
      checkIds: ["catalog-coverage", "product-schema-readiness", "price-trust", "factual-density", "canonical-url", "internal-link-entry"],
    },
    {
      id: "ai-recommendation-readiness",
      title: "AI 推荐准备度",
      checkIds: ["commercial-intent", "informational-intent", "qa-structure", "comparison-intent", "buyer-proof", "policy-clarity"],
    },
    {
      id: "measurement-loop",
      title: "数据验证闭环",
      checkIds: ["measurement-readiness", "llms-txt", "seo-title-description", "external-search-data"],
    },
  ];

  return sectionDefs.map((section) => {
    const sectionChecks = checks.filter((item) => section.checkIds.includes(item.id));
    const score = sectionChecks.reduce((sum, item) => sum + item.score, 0);
    const maxScore = sectionChecks.reduce((sum, item) => sum + item.maxScore, 0) || 1;
    const failed = sectionChecks.filter((item) => item.status === "fail").length;
    const warned = sectionChecks.filter((item) => item.status === "warn").length;
    const summary =
      failed > 0
        ? `${failed} 个关键缺口需要优先处理`
        : warned > 0
          ? `${warned} 个项目可以继续增强`
          : "基础信号清晰，可以进入下一轮优化";
    return { ...section, score, maxScore, summary };
  });
}

function buildActionItems(checks: GeoCheckResult[], target: string): GeoActionItem[] {
  return checks
    .filter((item) => item.status !== "pass")
    .sort((a, b) => {
      const severity = { fail: 0, warn: 1, pass: 2 };
      return severity[a.status] - severity[b.status] || b.maxScore - a.maxScore;
    })
    .slice(0, 5)
    .map((item, index) => ({
      id: item.id,
      priority: index < 2 || item.status === "fail" ? "high" : index < 4 ? "medium" : "low",
      title: item.name,
      target,
      why: item.message,
      fix: item.recommendation,
      validation:
        item.id === "measurement-readiness"
          ? "发布后在 GA4 与 GEO 实时反馈里确认访问、点击、加购事件。"
          : "发布后重新运行 GEO Audit，并观察 GA4 页面浏览、点击和加购是否改善。",
    }));
}

function buildSummary(score: number, checks: GeoCheckResult[]) {
  const fails = checks.filter((item) => item.status === "fail").length;
  const warns = checks.filter((item) => item.status === "warn").length;
  if (score >= 80) return `GEO Audit 2.0：基础清晰（${score} 分），剩余 ${warns} 项可继续精修。`;
  if (score >= 60) return `GEO Audit 2.0：具备基础（${score} 分），建议优先处理 ${fails} 个阻碍 AI 理解的问题。`;
  return `GEO Audit 2.0：风险较高（${score} 分），AI/搜索系统可能无法准确理解或推荐该页面。`;
}

function previewEvidence(value: string, fallback: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function evidenceStatus(found: boolean, partial = false): GeoEvidenceItem["status"] {
  if (found) return "found";
  return partial ? "partial" : "missing";
}

function buildSiteEvidenceItems(domain: string, evidence?: SitePageEvidence | null): GeoEvidenceItem[] {
  if (!evidence) {
    return [
      {
        id: "site-pages",
        label: "真实页面抓取",
        status: "not_checked",
        source: domain,
        detail: "本次报告未包含真实页面证据。",
      },
    ];
  }

  return [
    {
      id: "homepage",
      label: "首页内容",
      status: evidenceStatus(Boolean(evidence.homepageText)),
      source: `https://${domain}/`,
      detail: evidence.homepageText ? `已读取约 ${evidence.homepageText.length} 个字符` : "未读取到首页正文",
    },
    {
      id: "landing-page",
      label: "/tiktok/ 落地页",
      status: evidenceStatus(Boolean(evidence.landingPageText)),
      source: `https://${domain}/tiktok/`,
      detail: evidence.landingPageText ? `已读取约 ${evidence.landingPageText.length} 个字符` : "未读取到落地页正文",
    },
    {
      id: "policies",
      label: "配送/退货/联系页面",
      status: evidenceStatus(Boolean(evidence.policyText)),
      source: "shipping / returns / contact / about",
      detail: evidence.policyText ? "发现政策或联系相关内容" : "未在常见路径发现政策内容",
    },
    {
      id: "llms",
      label: "llms.txt",
      status: evidenceStatus(Boolean(evidence.llmsTxtFound)),
      source: `https://${domain}/llms.txt`,
      detail: evidence.llmsTxtFound ? "已发现 llms.txt" : "未发现 llms.txt",
    },
    {
      id: "crawl-files",
      label: "robots.txt / sitemap.xml",
      status: evidenceStatus(Boolean(evidence.robotsTxtFound && evidence.sitemapFound), Boolean(evidence.robotsTxtFound || evidence.sitemapFound)),
      source: `https://${domain}/robots.txt · /sitemap.xml`,
      detail: `robots.txt ${evidence.robotsTxtFound ? "已发现" : "未发现"}，sitemap.xml ${evidence.sitemapFound ? "已发现" : "未发现"}`,
    },
    {
      id: "product-schema",
      label: "Product Schema",
      status: evidenceStatus((evidence.productSchemaCount ?? 0) > 0),
      source: "首页 / 落地页 / 商品页",
      detail: `检测到 ${evidence.productSchemaCount ?? 0} 个 Product JSON-LD 信号`,
    },
    {
      id: "seo-title-meta",
      label: "SEO 标题/描述",
      status: evidenceStatus(
        Boolean(evidence.homepageTitle && evidence.landingPageTitle && evidence.homepageMetaDescription && evidence.landingPageMetaDescription),
        Boolean(evidence.homepageTitle || evidence.landingPageTitle || evidence.homepageMetaDescription || evidence.landingPageMetaDescription)
      ),
      source: "首页 / /tiktok/",
      detail: `首页 title ${evidence.homepageTitle ? "已发现" : "未发现"}，落地页 title ${evidence.landingPageTitle ? "已发现" : "未发现"}，meta description ${
        evidence.homepageMetaDescription || evidence.landingPageMetaDescription ? "已发现" : "未发现"
      }`,
    },
    {
      id: "seo-canonical",
      label: "Canonical",
      status: evidenceStatus(Boolean(evidence.homepageCanonical && evidence.landingPageCanonical), Boolean(evidence.homepageCanonical || evidence.landingPageCanonical)),
      source: "首页 / /tiktok/",
      detail: `首页 canonical ${evidence.homepageCanonical ? "已发现" : "未发现"}，落地页 canonical ${evidence.landingPageCanonical ? "已发现" : "未发现"}`,
    },
    {
      id: "internal-links",
      label: "站内链接入口",
      status: evidenceStatus((evidence.homepageInternalLinkCount ?? 0) + (evidence.landingPageInternalLinkCount ?? 0) >= 6, (evidence.homepageInternalLinkCount ?? 0) > 0 || (evidence.landingPageInternalLinkCount ?? 0) > 0),
      source: "首页 / /tiktok/",
      detail: `首页发现 ${evidence.homepageInternalLinkCount ?? 0} 个站内链接，落地页发现 ${evidence.landingPageInternalLinkCount ?? 0} 个站内链接`,
    },
  ];
}

function buildReport(
  checks: GeoCheckResult[],
  target: string,
  evidenceItems: GeoEvidenceItem[] = []
): GeoAuditReport {
  const overallScore = scoreFromChecks(checks);
  return {
    version: "2.0",
    overallScore,
    checks,
    sections: buildSections(checks),
    actionItems: buildActionItems(checks, target),
    evidenceItems,
    summary: buildSummary(overallScore, checks),
    generatedAt: new Date().toISOString(),
  };
}

export function auditProduct(input: ProductGeoInput): GeoAuditReport {
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const pageText = input.pageText?.trim() ?? "";
  const combined = `${title}\n${description}\n${pageText}`;
  const checks: GeoCheckResult[] = [];

  checks.push(
    check(
      "title-clarity",
      "商品标题是否能被直接理解",
      title.length >= 28 && title.length <= 90 ? 14 : title.length >= 16 ? 9 : 4,
      14,
      `当前标题长度 ${title.length} 字符`,
      "标题应包含品牌/品类/核心卖点，例如 handmade resin LED lamp、gift、bedroom desk 等真实购买语义。",
      title || "未读取到商品标题"
    )
  );

  checks.push(
    check(
      "taxonomy",
      "商品类目是否明确",
      input.category?.trim() ? 10 : 3,
      10,
      input.category?.trim() ? `类目: ${input.category}` : "缺少商品类目",
      "给商品设置清晰类目，帮助 AI 判断它属于 lamp、gift、home decor、fandom desk accessory 等哪类需求。",
      input.category?.trim() ? `后台类目: ${input.category}` : "后台没有类目信息"
    )
  );

  const hasFacts =
    /\d+\s*(cm|mm|inch|inches|g|kg|lb|w|v|mah|hours?)/i.test(combined) ||
    includesAny(combined, ["material", "resin", "wood", "usb", "handmade", "size", "dimension"]);
  checks.push(
    check(
      "factual-density",
      "商品事实密度",
      hasFacts ? 16 : description.length >= 180 ? 10 : 4,
      16,
      hasFacts ? "包含材质、尺寸、供电或手工属性等事实" : "缺少可验证的商品事实",
      "补充材质、尺寸、供电方式、包装、适用场景、手工差异等事实，减少 AI 摘要时的不确定性。",
      hasFacts ? "页面/描述出现 resin、wood、USB、尺寸或 handmade 等事实词" : "页面/描述中未发现足够事实词"
    )
  );

  checks.push(
    check(
      "price-trust",
      "价格与购买信号",
      typeof input.price === "number" && input.price > 0
        ? includesAny(combined, ["shipping", "return", "refund", "delivery", "secure"])
          ? 10
          : 8
        : 3,
      10,
      typeof input.price === "number" && input.price > 0 ? `价格: ${input.price}` : "缺少价格",
      "商品页应稳定展示价格、库存、配送和退货信息，方便搜索系统形成可购买判断。",
      typeof input.price === "number" && input.price > 0 ? `后台价格: ${input.price}` : "后台未提供价格"
    )
  );

  checks.push(
    check(
      "product-schema-readiness",
      "Product Schema 准备度",
      input.hasProductSchema && input.hasOfferSchema && input.hasAvailability
        ? 14
        : input.hasProductSchema && input.hasOfferSchema
          ? 11
          : input.url?.startsWith("http") && input.price
            ? 9
            : input.url?.startsWith("http")
              ? 6
              : 4,
      14,
      input.hasProductSchema
        ? "检测到 Product JSON-LD 结构化数据"
        : input.url?.startsWith("http")
          ? "有规范商品 URL，但仍需确认 Product Schema"
          : "缺少规范商品 URL",
      "确保商品页有 Product JSON-LD，至少包含 name、image、description、offers.price、availability、url。",
      input.hasProductSchema
        ? `Product: 已发现；Offer: ${input.hasOfferSchema ? "已发现" : "未发现"}；Availability: ${input.hasAvailability ? "已发现" : "未发现"}`
        : "未检测到 Product JSON-LD"
    )
  );

  const hasFaq = includesAny(combined, ["faq", "q:", "shipping", "return", "gift", "how to", "is it"]);
  checks.push(
    check(
      "qa-structure",
      "购买疑问覆盖",
      hasFaq ? 14 : 4,
      14,
      hasFaq ? "包含 FAQ/配送/退货/送礼等疑问信号" : "缺少购买前疑问解答",
      "补 3-5 条 FAQ，覆盖是否手工、适合送礼、配送时间、退货、灯光供电和清洁保养。",
      hasFaq ? "页面/描述出现 FAQ、shipping、return、gift 等疑问信号" : "未发现 FAQ 或购买疑问信号"
    )
  );

  const hasComparison = includesAny(combined, ["compared", "vs", "alternative", "mass-produced", "unique", "unlike"]);
  checks.push(
    check(
      "comparison-intent",
      "对比与替代意图",
      hasComparison ? 10 : 3,
      10,
      hasComparison ? "包含对比/差异化描述" : "缺少与普通灯或竞品的差异",
      "增加一段“Compared with ordinary lamps...”说明，帮助 AI 在推荐场景里给出选择理由。",
      hasComparison ? "页面/描述出现 compared、unique、unlike 等对比信号" : "未发现对比或替代选择说明"
    )
  );

  checks.push(
    check(
      "buyer-proof",
      "信任证据",
      input.hasReviewSignal || includesAny(combined, ["review", "rating", "customer", "handmade", "studio"])
        ? 10
        : 4,
      10,
      "检查商品是否提供评价、手工制作或品牌证据",
      "补充评价、制作过程、实拍图、品牌故事或买家使用场景，提升被 AI 推荐时的可信度。",
      input.hasReviewSignal ? "Product Schema 中发现 review 或 aggregateRating" : "未检测到结构化评价信号"
    )
  );

  return buildReport(checks, (input.url ?? title) || "product page");
}

export function auditSite(input: SiteGeoInput): GeoAuditReport {
  const name = input.name?.trim() ?? "";
  const domain = input.domain?.trim() ?? "";
  const brandVoice = input.brandVoice?.trim() ?? "";
  const productCount = input.productCount ?? 0;
  const evidence = input.pageEvidence;
  const siteText = `${brandVoice}\n${evidence?.homepageText ?? ""}\n${evidence?.landingPageText ?? ""}`;
  const policyText = evidence?.policyText ?? "";
  const checks: GeoCheckResult[] = [];

  checks.push(
    check(
      "brand-entity",
      "品牌实体清晰度",
      name.length >= 2 && domain.includes(".") ? 16 : 6,
      16,
      `品牌: ${name || "未填写"}，域名: ${domain || "未填写"}`,
      "品牌名、主域名、社媒名称和站内页脚应保持一致，让 AI 能把它识别为同一个实体。",
      `后台站点信息：${name || "未填写品牌"} / ${domain || "未填写域名"}`
    )
  );

  checks.push(
    check(
      "offer-clarity",
      "核心销售主张",
      siteText.length >= 120 && includesAny(siteText, ["handmade", "resin", "lamp", "gift", "desk"])
        ? 16
        : brandVoice.length >= 40
          ? 13
          : brandVoice.length >= 12
            ? 10
            : 4,
      16,
      siteText.length > brandVoice.length ? "真实页面包含销售主张和商品语义" : brandVoice ? "已填写品牌语调/定位" : "缺少一句话销售主张",
      "用一句话说清楚：卖什么、适合谁、为什么值得买。不要只写口号。",
      previewEvidence(siteText, "未读取到首页或落地页销售主张")
    )
  );

  checks.push(
    check(
      "audience-fit",
      "目标用户和场景",
      includesAny(siteText, ["gift", "desk", "bedroom", "fan", "gamer", "home", "collector", "anime"]) ? 12 : 5,
      12,
      "检查是否出现使用场景或目标人群",
      "在首页和主落地页明确适合送礼、卧室桌面、游戏房、粉丝收藏等具体场景。",
      includesAny(siteText, ["gift", "desk", "bedroom", "fan", "gamer", "home", "collector", "anime"])
        ? previewEvidence(siteText, "页面中出现目标用户或使用场景")
        : "未发现 gift、desk、bedroom、fan、gamer、collector 等场景词"
    )
  );

  const hasCommercialIntent = includesAny(siteText, [
    "buy",
    "shop",
    "bundle",
    "save",
    "discount",
    "sale",
    "price",
    "checkout",
    "order",
  ]);
  checks.push(
    check(
      "commercial-intent",
      "商业意图覆盖",
      hasCommercialIntent ? 12 : 4,
      12,
      hasCommercialIntent ? "页面包含购买、优惠或下单意图信号" : "页面缺少明确购买意图信号",
      "在落地页和核心商品区加入 shop、bundle、save、price、gift-ready 等商业意图表达，让 AI 能判断这是可购买页面。",
      hasCommercialIntent ? previewEvidence(siteText, "页面中出现商业意图词") : "未发现 buy、shop、bundle、save、price、checkout 等商业意图词"
    )
  );

  const hasInformationalIntent = includesAny(`${siteText}\n${policyText}`, [
    "faq",
    "how",
    "what",
    "shipping",
    "return",
    "refund",
    "is it",
    "does it",
    "question",
  ]);
  checks.push(
    check(
      "informational-intent",
      "信息/FAQ 意图覆盖",
      hasInformationalIntent ? 10 : 4,
      10,
      hasInformationalIntent ? "页面能回答配送、退货或购买前问题" : "页面缺少信息型问题回答",
      "补充 FAQ、配送、退货、材质、尺寸、是否适合送礼等问答，覆盖用户在购买前会问的问题。",
      hasInformationalIntent ? previewEvidence(`${siteText}\n${policyText}`, "页面中出现信息型意图") : "未发现 FAQ、how、shipping、return、refund 等信息型意图词"
    )
  );

  const hasLongTailIntent = includesAny(siteText, [
    "bedroom desk",
    "gaming room",
    "anime fan",
    "collector",
    "gift buyer",
    "desk decor",
    "home decor",
    "fandom",
    "gamer",
  ]);
  checks.push(
    check(
      "long-tail-intent",
      "长尾场景意图",
      hasLongTailIntent ? 10 : 4,
      10,
      hasLongTailIntent ? "页面包含具体人群或场景长尾表达" : "页面缺少具体长尾场景表达",
      "把抽象卖点拆成具体搜索/推荐场景，例如 anime fan gift、gaming room decor、bedroom desk lamp。",
      hasLongTailIntent ? previewEvidence(siteText, "页面中出现长尾场景表达") : "未发现 bedroom desk、gaming room、anime fan、collector、desk decor 等长尾场景词"
    )
  );

  checks.push(
    check(
      "catalog-coverage",
      "商品目录覆盖",
      (evidence?.productSchemaCount ?? 0) >= 8
        ? 16
        : productCount >= 20
          ? 16
          : productCount >= 8
            ? 11
            : productCount >= 1
              ? 7
              : 2,
      16,
      evidence?.productSchemaCount
        ? `检测到 ${evidence.productSchemaCount} 个 Product Schema 信号`
        : `已同步 ${productCount} 个商品`,
      "优先同步并优化 Top 20 SKU，让 AI 有足够商品实体和内部链接可理解。",
      evidence?.productSchemaCount
        ? `真实页面检测到 ${evidence.productSchemaCount} 个 Product JSON-LD 信号`
        : `后台已同步 ${productCount} 个商品，真实页面未检测到 Product Schema 证据`
    )
  );

  checks.push(
    check(
      "policy-clarity",
      "配送/退货/信任信息",
      includesAny(policyText, ["shipping", "delivery", "return", "refund", "contact", "damaged"])
        ? 12
        : includesAny(siteText, ["shipping", "delivery", "return", "refund"])
          ? 8
          : 4,
      12,
      policyText ? "检测到配送/退货/联系等政策内容" : "需要检查站内是否有 shipping、returns、contact、about 等页面",
      "确保首页、商品页和落地页能找到配送、退货、联系、支付安全和品牌介绍。",
      previewEvidence(policyText, "未在常见政策路径读取到配送、退货、联系或品牌介绍内容")
    )
  );

  checks.push(
    check(
      "llms-txt",
      "llms.txt 与 AI 爬虫说明",
      evidence?.llmsTxtFound ? 12 : evidence?.robotsTxtFound && evidence?.sitemapFound ? 8 : 5,
      12,
      evidence?.llmsTxtFound
        ? "检测到 /llms.txt"
        : evidence?.robotsTxtFound || evidence?.sitemapFound
          ? "检测到部分爬虫基础文件，仍建议补 /llms.txt"
          : "可在工具中心生成并部署 llms.txt",
      "在站点根目录部署 /llms.txt，声明核心页面、产品目录、联系邮箱和允许 AI 抓取的范围。",
      `llms.txt ${evidence?.llmsTxtFound ? "已发现" : "未发现"}；robots.txt ${evidence?.robotsTxtFound ? "已发现" : "未发现"}；sitemap.xml ${evidence?.sitemapFound ? "已发现" : "未发现"}`
    )
  );

  const homepageTitle = evidence?.homepageTitle?.trim() ?? "";
  const landingTitle = evidence?.landingPageTitle?.trim() ?? "";
  const homepageDescription = evidence?.homepageMetaDescription?.trim() ?? "";
  const landingDescription = evidence?.landingPageMetaDescription?.trim() ?? "";
  const titleMetaScore =
    homepageTitle && landingTitle && homepageDescription && landingDescription
      ? 12
      : (homepageTitle || landingTitle) && (homepageDescription || landingDescription)
        ? 8
        : 4;
  checks.push(
    check(
      "seo-title-description",
      "SEO 标题与描述",
      titleMetaScore,
      12,
      titleMetaScore >= 12 ? "首页和落地页都检测到 title 与 meta description" : titleMetaScore >= 8 ? "检测到部分 title/meta description" : "缺少可验证的 title/meta description",
      "确保首页和核心落地页都有唯一、可读、包含品牌与购买场景的 title 和 meta description。",
      `首页 title: ${homepageTitle || "未发现"}；落地页 title: ${landingTitle || "未发现"}；首页描述: ${homepageDescription || "未发现"}；落地页描述: ${landingDescription || "未发现"}`
    )
  );

  const homepageCanonical = evidence?.homepageCanonical?.trim() ?? "";
  const landingCanonical = evidence?.landingPageCanonical?.trim() ?? "";
  checks.push(
    check(
      "canonical-url",
      "Canonical 规范链接",
      homepageCanonical && landingCanonical ? 10 : homepageCanonical || landingCanonical ? 6 : 3,
      10,
      homepageCanonical && landingCanonical ? "首页和落地页都检测到 canonical" : homepageCanonical || landingCanonical ? "只检测到部分 canonical" : "未检测到 canonical",
      "给首页和核心落地页设置 canonical，避免搜索系统把同一内容拆成多个 URL 理解。",
      `首页 canonical: ${homepageCanonical || "未发现"}；落地页 canonical: ${landingCanonical || "未发现"}`
    )
  );

  const internalLinkTotal = (evidence?.homepageInternalLinkCount ?? 0) + (evidence?.landingPageInternalLinkCount ?? 0);
  checks.push(
    check(
      "internal-link-entry",
      "站内链接入口",
      internalLinkTotal >= 8 ? 10 : internalLinkTotal >= 3 ? 6 : 3,
      10,
      `检测到 ${internalLinkTotal} 个首页/落地页站内链接`,
      "确保首页和 /tiktok/ 能自然链接到商品集合、重点 SKU、FAQ、配送退货和品牌介绍页。",
      `首页 ${evidence?.homepageInternalLinkCount ?? 0} 个，落地页 ${evidence?.landingPageInternalLinkCount ?? 0} 个`
    )
  );

  checks.push(
    check(
      "external-search-data",
      "外部搜索表现数据",
      6,
      10,
      "需要接入 Search Console / PageSpeed 后才能判断排名、曝光、点击率和性能",
      "后续版本应接入 Search Console 和 PageSpeed，把 SEO 结果从页面证据升级为真实搜索表现。",
      "当前版本不硬猜关键词排名、索引覆盖、Core Web Vitals 或搜索 CTR"
    )
  );

  checks.push(
    check(
      "measurement-readiness",
      "GA4 行为验证闭环",
      10,
      12,
      "需要把 GEO 建议与 GA4 页面浏览、点击、加购和结账事件连接",
      "用 GA4/GEO 面板验证修改后是否提升 page_view、shop_bundle_click、add_to_cart 和 checkout_click。",
      "GA4 行为事件用于验证修改效果，重点看 page_view、点击、加购、结账"
    )
  );

  return buildReport(checks, domain || name || "site", buildSiteEvidenceItems(domain || name || "site", evidence));
}
