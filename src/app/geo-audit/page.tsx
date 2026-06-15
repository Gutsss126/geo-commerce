import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ListChecks, Sparkles, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { runSiteAudit } from "@/app/actions";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { formatGeoScoreGap, getGeoFixWorkflow, getGeoOptimizationPlan } from "@/lib/geo/display";
import type { GeoActionItem, GeoAuditReport, GeoAuditSection, GeoCheckResult, GeoEvidenceItem } from "@/lib/geo/types";

function parseReport(report: string): GeoAuditReport | null {
  try {
    return JSON.parse(report) as GeoAuditReport;
  } catch {
    return null;
  }
}

function PriorityPill({ priority }: { priority: GeoActionItem["priority"] }) {
  const styles = {
    high: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    low: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  };
  const labels = { high: "优先", medium: "建议", low: "观察" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[priority]}`}>{labels[priority]}</span>;
}

function EvidenceStatusPill({ status }: { status: GeoEvidenceItem["status"] }) {
  const styles = {
    found: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    partial: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    missing: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    not_checked: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  };
  const labels = { found: "已检查", partial: "部分", missing: "未发现", not_checked: "未检查" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>{labels[status]}</span>;
}

function CheckStatusPill({ status }: { status: GeoCheckResult["status"] }) {
  const styles = {
    pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };
  const labels = { pass: "通过", warn: "待加强", fail: "需处理" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>{labels[status]}</span>;
}

function SectionCard({ section }: { section: GeoAuditSection }) {
  const ratio = Math.round((section.score / section.maxScore) * 100);
  const Icon = ratio >= 80 ? CheckCircle2 : TriangleAlert;
  const iconColor = ratio >= 80 ? "text-emerald-300" : ratio >= 55 ? "text-amber-300" : "text-rose-300";

  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{section.title}</p>
          <p className="mt-1 text-sm text-slate-500">{section.summary}</p>
        </div>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800">
        <div className="h-full rounded bg-blue-500" style={{ width: `${ratio}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {section.score}/{section.maxScore} · {ratio}%
      </p>
    </div>
  );
}

function OptimizationPlanPanel({
  checkId,
  domain,
  plan,
  siteId,
}: {
  checkId: string;
  domain?: string | null;
  plan: NonNullable<ReturnType<typeof getGeoOptimizationPlan>>;
  siteId?: string;
}) {
  const workflow = getGeoFixWorkflow({ id: checkId }, domain);

  return (
    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-blue-200">{plan.title}</p>
          <p className="mt-1 text-sm text-slate-400">{plan.summary}</p>
        </div>
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
          执行包
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-sm font-medium text-slate-200">为什么重要</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{plan.why}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-slate-950/40 p-3 lg:col-span-2">
          <p className="text-sm font-medium text-slate-200">怎么改</p>
          <ol className="mt-2 space-y-1 text-xs leading-5 text-slate-400">
            {plan.steps.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {plan.events && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-200">需要追踪的动作</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
          {plan.events.map((event) => (
            <div key={event.name} className="rounded border border-[var(--border)] p-3">
              <p className="font-mono text-sm text-blue-200">{event.name}</p>
              <p className="mt-1 text-xs text-slate-400">{event.purpose}</p>
              <p className="mt-1 text-xs text-slate-500">位置：{event.placement}</p>
            </div>
          ))}
          </div>
        </div>
      )}

      {(plan.template || plan.code) && (
        <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-sm font-medium text-emerald-200">可复制内容</p>
          <p className="mt-1 text-xs text-slate-500">给运营或建站后台直接使用，复制前按实际页面和商品微调。</p>
          {plan.template && (
            <details className="mt-3 rounded border border-[var(--border)] bg-slate-950/60 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">文字模板</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{plan.template}</pre>
            </details>
          )}
          {plan.code && (
            <details className="mt-3 rounded border border-[var(--border)] bg-slate-950/60 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">代码片段</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{plan.code}</pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-4 rounded border border-[var(--border)] p-3">
        <p className="text-sm font-medium text-slate-200">怎么复查</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-400">
          {plan.validation.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded border border-[var(--border)] p-3">
        <p className="text-sm font-medium text-slate-200">执行状态</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {workflow.statuses.map((status) => (
            <span key={status} className="rounded border border-slate-600/60 px-2 py-1 text-xs text-slate-300">
              {status}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">{workflow.reviewHint}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {workflow.actions.map((action) =>
            action.kind === "audit" && siteId ? (
              <form key={action.label} action={runSiteAudit.bind(null, siteId)}>
                <button
                  type="submit"
                  className="rounded border border-blue-500/40 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-500/10"
                >
                  {action.label}
                </button>
              </form>
            ) : action.href ? (
              <Link
                key={action.label}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                className="rounded border border-slate-600/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                {action.label}
              </Link>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

function CheckRow({ domain, item, siteId }: { domain?: string | null; item: GeoCheckResult; siteId?: string }) {
  const scoreGap = formatGeoScoreGap(item);
  const optimizationPlan = getGeoOptimizationPlan(item);

  return (
    <details className="group rounded-lg border border-[var(--border)] p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.name}</p>
          {scoreGap && <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">缺口：{scoreGap}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-blue-300">
            {item.score}/{item.maxScore}
          </span>
          <CheckStatusPill status={item.status} />
          <span className="text-xs text-slate-500 group-open:hidden">展开</span>
          <span className="hidden text-xs text-slate-500 group-open:inline">收起</span>
        </div>
      </summary>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="text-sm text-slate-400">{item.message}</p>
        {item.evidence && <p className="mt-3 text-sm text-slate-300">证据：{item.evidence}</p>}
        <p className="mt-2 text-xs text-slate-500">建议：{item.recommendation}</p>

        {optimizationPlan && (
          <OptimizationPlanPanel checkId={item.id} domain={domain} plan={optimizationPlan} siteId={siteId} />
        )}
      </div>
    </details>
  );
}

function ActionItemRow({ domain, item, siteId }: { domain?: string | null; item: GeoActionItem; siteId?: string }) {
  const optimizationPlan = getGeoOptimizationPlan({ id: item.id });

  return (
    <details className="group rounded-lg border border-[var(--border)] p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-slate-500">{item.target}</p>
        </div>
        <div className="flex items-center gap-3">
          <PriorityPill priority={item.priority} />
          <span className="text-xs text-slate-500 group-open:hidden">展开方案</span>
          <span className="hidden text-xs text-slate-500 group-open:inline">收起</span>
        </div>
      </summary>
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="text-sm text-slate-300">{item.fix}</p>
        <p className="mt-2 text-xs text-slate-500">验证：{item.validation}</p>
        {optimizationPlan && <OptimizationPlanPanel checkId={item.id} domain={domain} plan={optimizationPlan} siteId={siteId} />}
      </div>
    </details>
  );
}

function StrategyReadinessCard() {
  const rows = [
    {
      title: "GEO 已覆盖",
      body: "品牌实体、页面证据、商品机器可读性、FAQ/信任信息、llms.txt、GA4 行为验证闭环。",
    },
    {
      title: "SEO 待增强",
      body: "关键词机会、标题/描述重复、索引状态、内链深度、Core Web Vitals 与搜索排名变化还需要后续版本接入。",
    },
    {
      title: "严谨原则",
      body: "先看真实页面证据，再给分；先给最少的 3 个优先动作，再提供可复制执行包；最后用 GA4 复查效果。",
    },
  ];

  return (
    <Card>
      <CardTitle>策略严谨度</CardTitle>
      <CardDescription>当前版本先做 GEO 决策闭环，SEO 深度诊断会作为后续增强，不把分数包装成万能答案。</CardDescription>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.title} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-slate-200">{row.title}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{row.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function GeoAuditV2Page() {
  const sites = await prisma.site.findMany({
    include: {
      _count: { select: { products: true, audits: true } },
      audits: { orderBy: { createdAt: "desc" }, take: 1 },
      products: { orderBy: [{ geoScore: "asc" }, { updatedAt: "desc" }], take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  const primarySite = sites[0] ?? null;
  const latestAudit = primarySite?.audits[0] ?? null;
  const report = latestAudit ? parseReport(latestAudit.report) : null;
  const sections = report?.sections ?? [];
  const actionItems = report?.actionItems ?? [];
  const evidenceItems = report?.evidenceItems ?? [];
  const checks = report?.checks ?? [];
  const topActions = actionItems.slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">GEO Audit 2.0</h1>
          <p className="mt-1 max-w-3xl text-slate-400">
            用第一性原则检查独立站是否能被 AI 和搜索系统准确理解、引用并推荐给正确买家。
          </p>
        </div>
        <Link
          href="/audits"
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/10"
        >
          历史报告
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-300" />
                <CardTitle>{primarySite ? primarySite.name : "还没有站点"}</CardTitle>
              </div>
              <CardDescription>
                {primarySite
                  ? `${primarySite.domain} · ${primarySite._count.products} 个商品 · ${primarySite._count.audits} 次审计`
                  : "先添加站点，系统会生成基线 GEO 审计。"}
              </CardDescription>
              {report && <p className="mt-3 text-sm text-slate-300">{report.summary}</p>}
            </div>
            {report ? <ScoreBadge score={report.overallScore} size="lg" /> : null}
          </div>

          {primarySite && (
            <form action={runSiteAudit.bind(null, primarySite.id)} className="mt-5">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                重新运行 GEO Audit 2.0
              </button>
            </form>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-300" />
            <CardTitle>本轮只看 3 件事</CardTitle>
          </div>
          <ol className="mt-4 space-y-3 text-sm text-slate-300">
            <li>1. AI 是否能一句话理解你是谁、卖什么、适合谁。</li>
            <li>2. 商品信息是否足够机器可读，能支持价格、库存、评价、FAQ 和 Schema。</li>
            <li>3. 每条建议是否能用 GA4 行为数据验证效果。</li>
          </ol>
        </Card>
      </div>

      <StrategyReadinessCard />

      {evidenceItems.length > 0 && (
        <Card>
          <CardTitle>检查范围</CardTitle>
          <CardDescription>先确认系统实际看过哪些页面和文件，再判断分数是否可信。</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {evidenceItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{item.source}</p>
                  </div>
                  <EvidenceStatusPill status={item.status} />
                </div>
                <p className="mt-3 text-sm text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {checks.length > 0 && (
        <Card>
          <CardTitle>全部检查项</CardTitle>
          <CardDescription>每一项都展示证据、得分和下一步动作，方便运营逐条核对。</CardDescription>
          <div className="mt-4 space-y-3">
            {checks.map((item) => (
              <CheckRow key={item.id} domain={primarySite?.domain} item={item} siteId={primarySite?.id} />
            ))}
          </div>
        </Card>
      )}

      {sections.length > 0 && (
        <Card>
          <CardTitle>四个核心维度</CardTitle>
          <CardDescription>避免复杂总分崇拜，先看哪一层阻碍了 AI 理解和推荐。</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>优先行动清单</CardTitle>
        <CardDescription>只展示最该先做的 3 个问题，避免把运营拖进一长串技术清单。</CardDescription>
        <div className="mt-4 space-y-3">
          {topActions.map((item) => (
            <ActionItemRow key={item.id} domain={primarySite?.domain} item={item} siteId={primarySite?.id} />
          ))}
          {topActions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              暂无高优先级问题。可以进入产品页逐个优化 Top SKU。
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-300" />
            <CardTitle>低分商品优先看</CardTitle>
          </div>
          <CardDescription>商品页是电商 GEO 的实体底座，优先处理信息薄弱的 SKU。</CardDescription>
          <div className="mt-4 space-y-3">
            {primarySite?.products.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-medium">{product.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.category ?? "未设置类目"}</p>
                </div>
                <span className="text-sm font-semibold text-blue-300">{product.geoScore ?? "—"}</span>
              </div>
            ))}
            {!primarySite?.products.length && <p className="py-8 text-center text-sm text-slate-500">还没有同步商品。</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>下一步功能方向</CardTitle>
          <CardDescription>保持简约，先做能产生业务判断的能力。</CardDescription>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• 把首页、/tiktok/、Top SKU 的真实页面内容拉入审计。</li>
            <li>• 检查 Product Schema、价格、库存、评价、配送、退货字段。</li>
            <li>• 用固定购买问题测试 AI 是否能推荐 Fancrafti。</li>
            <li>• 把建议和 GA4 点击/加购/结账事件绑定，形成验证闭环。</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
