import type { GeoAuditReport, GeoCheckResult, ProductGeoInput, SiteGeoInput } from "./types";

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function check(
  id: string,
  name: string,
  score: number,
  maxScore: number,
  message: string,
  recommendation: string
): GeoCheckResult {
  const ratio = score / maxScore;
  const status = ratio >= 0.8 ? "pass" : ratio >= 0.5 ? "warn" : "fail";
  return { id, name, score, maxScore, status, message, recommendation };
}

export function auditProduct(input: ProductGeoInput): GeoAuditReport {
  const title = input.title?.trim() ?? "";
  const desc = input.description?.trim() ?? "";
  const checks: GeoCheckResult[] = [];

  const titleLen = title.length;
  checks.push(
    check(
      "title-clarity",
      "标题可引用性",
      titleLen >= 20 && titleLen <= 80 ? 15 : titleLen >= 10 ? 10 : 5,
      15,
      `标题长度 ${titleLen} 字符`,
      "标题应包含品牌+品类+核心卖点，20–80 字符，便于 AI 直接引用。"
    )
  );

  const hasSpecs = /\d+\s*(ml|g|kg|cm|inch|"|')/i.test(desc) || /尺寸|规格|容量|weight|size/i.test(desc);
  checks.push(
    check(
      "factual-density",
      "事实密度",
      hasSpecs ? 20 : desc.length > 120 ? 12 : 6,
      20,
      hasSpecs ? "含可验证规格信息" : "缺少量化规格",
      "补充尺寸、材质、容量等可验证事实，提升生成式引擎引用可信度。"
    )
  );

  const hasFAQ = /[?？]/.test(desc) || /faq|常见问题|Q:/i.test(desc);
  checks.push(
    check(
      "qa-structure",
      "问答结构",
      hasFAQ ? 15 : 5,
      15,
      hasFAQ ? "含问答式结构" : "无问答结构",
      "增加 3–5 条买家常见问题，利于 AI Overview / Perplexity 摘取。"
    )
  );

  const hasComparison = /对比|vs|相比|compared|alternative/i.test(desc);
  checks.push(
    check(
      "comparison-intent",
      "对比意图覆盖",
      hasComparison ? 12 : 4,
      12,
      hasComparison ? "含对比表述" : "缺少对比场景",
      "覆盖「与 XX 相比」「适合什么人」等对比型查询意图。"
    )
  );

  const hasUrl = Boolean(input.url?.startsWith("http"));
  checks.push(
    check(
      "canonical-url",
      "规范 URL",
      hasUrl ? 10 : 0,
      10,
      hasUrl ? "已配置产品 URL" : "缺少规范 URL",
      "每个产品页需稳定 canonical URL，便于 AI 溯源引用。"
    )
  );

  const hasCategory = Boolean(input.category?.trim());
  checks.push(
    check(
      "taxonomy",
      "品类语义",
      hasCategory ? 13 : 5,
      13,
      hasCategory ? `品类: ${input.category}` : "未设置品类",
      "明确品类层级（如 户外 > 帐篷 > 双人），强化实体关联。"
    )
  );

  const descScore = desc.length >= 300 ? 15 : desc.length >= 150 ? 10 : desc.length >= 50 ? 6 : 2;
  checks.push(
    check(
      "content-depth",
      "内容深度",
      descScore,
      15,
      `描述 ${desc.length} 字符`,
      "独立站产品描述建议 300+ 字，含使用场景、材质、保修与配送政策。"
    )
  );

  const total = checks.reduce((s, c) => s + c.score, 0);
  const max = checks.reduce((s, c) => s + c.maxScore, 0);
  const overallScore = clamp(Math.round((total / max) * 100));

  return {
    overallScore,
    checks,
    summary: buildSummary(overallScore, checks),
    generatedAt: new Date().toISOString(),
  };
}

export function auditSite(input: SiteGeoInput): GeoAuditReport {
  const checks: GeoCheckResult[] = [];
  const domain = input.domain?.trim() ?? "";

  checks.push(
    check(
      "domain-trust",
      "域名可信度信号",
      domain.includes(".") && !domain.includes(" ") ? 18 : 8,
      20,
      `域名: ${domain || "未设置"}`,
      "使用品牌主域名，避免临时子域，利于实体识别。"
    )
  );

  const hasVoice = Boolean(input.brandVoice?.trim());
  checks.push(
    check(
      "brand-voice",
      "品牌语义一致性",
      hasVoice ? 20 : 8,
      20,
      hasVoice ? "已配置品牌语调" : "未配置品牌语调",
      "在后台定义品牌语调，确保 AI 生成摘要时语气一致。"
    )
  );

  const count = input.productCount ?? 0;
  checks.push(
    check(
      "catalog-coverage",
      "目录覆盖度",
      count >= 20 ? 20 : count >= 5 ? 14 : count >= 1 ? 8 : 2,
      20,
      `已录入 ${count} 个产品`,
      "GEO 需要足够结构化产品页；建议至少优化 Top 20 SKU。"
    )
  );

  checks.push(
    check(
      "entity-readiness",
      "实体就绪度",
      input.name.length >= 2 ? 18 : 6,
      20,
      `站点名: ${input.name}`,
      "站点名称应与社媒、维基、新闻稿中的品牌实体一致。"
    )
  );

  checks.push(
    check(
      "llms-txt",
      "llms.txt 配置",
      10,
      20,
      "需在工具中心生成并部署 llms.txt",
      "在站点根目录部署 /llms.txt，声明 AI 爬虫可索引范围与联系信息。"
    )
  );

  const total = checks.reduce((s, c) => s + c.score, 0);
  const max = checks.reduce((s, c) => s + c.maxScore, 0);
  const overallScore = clamp(Math.round((total / max) * 100));

  return {
    overallScore,
    checks,
    summary: buildSummary(overallScore, checks),
    generatedAt: new Date().toISOString(),
  };
}

function buildSummary(score: number, checks: GeoCheckResult[]) {
  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  if (score >= 80) return `GEO 就绪度较高（${score} 分），${warns} 项可继续优化。`;
  if (score >= 60) return `基础尚可（${score} 分），${fails} 项需优先修复、${warns} 项建议改进。`;
  return `GEO 风险较高（${score} 分），${fails} 项未达标，建议先完成 llms.txt 与 Top SKU 内容优化。`;
}
