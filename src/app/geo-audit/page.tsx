import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ListChecks, Sparkles, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { runSiteAudit } from "@/app/actions";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import type { GeoActionItem, GeoAuditReport, GeoAuditSection } from "@/lib/geo/types";

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
            <div key={item.id} className="rounded-lg border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.target}</p>
                </div>
                <PriorityPill priority={item.priority} />
              </div>
              <p className="mt-3 text-sm text-slate-300">{item.fix}</p>
              <p className="mt-2 text-xs text-slate-500">验证：{item.validation}</p>
            </div>
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
