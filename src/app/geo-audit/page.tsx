import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ListChecks, Sparkles, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { runSiteAudit } from "@/app/actions";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import {
  formatGeoAuditDelta,
  formatGeoScoreGap,
  getGeoAuditStatusSummary,
  getGeoAuditScopeItems,
  getGeoCheckSourceLabel,
  getGeoExecutionTasks,
  getGeoEffectTrackingSummary,
  getGeoFixWorkflow,
  getGeoOptimizationPlan,
  getGeoReviewSteps,
  getGeoScopeGaps,
  getGeoStrategyReadiness,
  getGeoTaskCenterGroups,
  getGeoValidationLoopItems,
} from "@/lib/geo/display";
import type {
  GeoActionItem,
  GeoAuditReport,
  GeoAuditSection,
  GeoCheckResult,
  GeoEvidenceItem,
  PageExperienceReport,
  PageExperienceStatus,
} from "@/lib/geo/types";

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

function TaskStatusPill({ status }: { status: "todo" | "review" | "improved" }) {
  const styles = {
    todo: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    review: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    improved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };
  const labels = { todo: "待处理", review: "需复查", improved: "已改善" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>{labels[status]}</span>;
}

const geoAuditNavItems = [
  { href: "#geo-audit-result", label: "看结果", helper: "分数变化" },
  { href: "#geo-audit-tasks", label: "处理任务", helper: "下一步" },
  { href: "#geo-audit-review", label: "复查步骤", helper: "验证效果" },
  { href: "#geo-audit-details", label: "详细诊断", helper: "展开查看" },
];

function GeoAuditPageNav() {
  return (
    <nav aria-label="GEO Audit page sections" className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {geoAuditNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-[var(--border)] bg-slate-950/35 px-3 py-2 transition hover:border-blue-500/40 hover:bg-blue-500/10"
          >
            <span className="block text-sm font-medium text-slate-100 group-hover:text-blue-100">{item.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{item.helper}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function DetailGroupLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-950/25 px-4 py-3">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
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

function PageExperienceStatusPill({ status }: { status: PageExperienceStatus }) {
  const styles = {
    pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    unavailable: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  };
  const labels = { pass: "通过", warn: "待加强", fail: "需处理", unavailable: "待检测" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>{labels[status]}</span>;
}

function EvidenceSourcePill({ label }: { label: string }) {
  return (
    <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-200">
      Evidence: {label}
    </span>
  );
}

function ScopeGapPill({ severity }: { severity: "high" | "medium" | "low" }) {
  const styles = {
    high: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    low: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  };
  const labels = { high: "High", medium: "Medium", low: "Low" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[severity]}`}>{labels[severity]}</span>;
}

function ValidationStatusPill({ status }: { status: "verified" | "watching" | "blocked" | "not_connected" }) {
  const styles = {
    verified: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    watching: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    blocked: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    not_connected: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  };
  const labels = {
    verified: "已验证",
    watching: "观察中",
    blocked: "受阻",
    not_connected: "待接入",
  };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>{labels[status]}</span>;
}

function SummaryTonePill({ tone }: { tone: "pass" | "warn" | "fail" | "info" }) {
  const styles = {
    pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    info: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  };
  const labels = {
    pass: "正常",
    warn: "待加强",
    fail: "需处理",
    info: "观察",
  };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[tone]}`}>{labels[tone]}</span>;
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
          <div className="mt-2">
            <EvidenceSourcePill label={getGeoCheckSourceLabel(item)} />
          </div>
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
  const rows = getGeoStrategyReadiness();
  const styles = {
    verified: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    needs_work: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    external_required: "border-blue-500/30 bg-blue-500/5 text-blue-200",
  };

  return (
    <Card>
      <CardTitle>策略严谨度</CardTitle>
      <CardDescription>当前版本先做 GEO 决策闭环，SEO 深度诊断会作为后续增强，不把分数包装成万能答案。</CardDescription>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.title} className={`rounded-lg border p-4 ${styles[row.status]}`}>
            <p className="text-sm font-medium text-slate-200">{row.title}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{row.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.items.map((item) => (
                <span key={item} className="rounded border border-slate-700/70 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ValidationLoopCard({
  items,
}: {
  items: ReturnType<typeof getGeoValidationLoopItems>;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>GEO 验证闭环</CardTitle>
          <CardDescription>不承诺收录和排名，只追踪优化是否逐步变成可见、可理解、可访问、可转化。</CardDescription>
        </div>
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
          4 layers
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-200">{item.label}</p>
              <ValidationStatusPill status={item.status} />
            </div>
            <p className="mt-3 text-sm leading-5 text-slate-300">{item.signal}</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">{item.nextStep}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeoBasicsCard({ checks }: { checks: GeoCheckResult[] }) {
  const seoCheckIds = ["seo-title-description", "canonical-url", "internal-link-entry", "external-search-data"];
  const seoChecks = seoCheckIds
    .map((id) => checks.find((check) => check.id === id))
    .filter((check): check is GeoCheckResult => Boolean(check));

  if (seoChecks.length === 0) return null;

  const passCount = seoChecks.filter((check) => check.status === "pass").length;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>SEO 基础健康度</CardTitle>
          <CardDescription>只看页面可验证的基础信号；排名、曝光和速度需要后续接外部数据。</CardDescription>
        </div>
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-200">
          {passCount}/{seoChecks.length}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {seoChecks.map((check) => (
          <div key={check.id} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-200">{check.name}</p>
              <CheckStatusPill status={check.status} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{check.message}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PageExperienceCard({ report, landingPath }: { report?: PageExperienceReport; landingPath?: string | null }) {
  if (!report) {
    return (
      <Card>
        <CardTitle>页面体验</CardTitle>
        <CardDescription>重新运行 GEO Audit 后，会用 PageSpeed 检测首页和 /tiktok/ 的公开页面体验信号。</CardDescription>
        <div className="mt-4 rounded-lg border border-slate-700/70 bg-slate-950/40 p-4 text-sm text-slate-400">
          暂无外部检测数据
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>页面体验</CardTitle>
          <CardDescription>来自 PageSpeed 的外部验证，只作为体验风险参考，不直接混入 GEO 总分。</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-200">
            {report.passCount}/{report.metricCount}
          </span>
          <PageExperienceStatusPill status={report.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {report.results.map((result) => (
          <details key={result.url} className="group rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <div>
                <p className="break-all text-sm font-medium text-slate-200">{result.url}</p>
                <p className="mt-1 text-xs text-slate-500">检测时间：{new Date(result.fetchedAt).toLocaleString("zh-CN")}</p>
              </div>
              <PageExperienceStatusPill status={result.status} />
            </summary>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(result.categories).map(([key, category]) => (
                <div key={key} className="rounded border border-[var(--border)] p-3">
                  <p className="text-xs text-slate-500">{category.label}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold text-slate-100">{category.score ?? "—"}</span>
                    <PageExperienceStatusPill status={category.status} />
                  </div>
                </div>
              ))}
            </div>
            {result.topRisks.length > 0 && (
              <div className="mt-4 rounded border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-sm font-medium text-amber-200">主要风险</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {result.topRisks.map((risk) => (
                    <li key={risk}>• {risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </details>
        ))}
      </div>
    </Card>
  );
}

function formatAuditTime(value?: Date | string | null) {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AuditDeltaCard({
  current,
  previous,
  auditCount,
  currentCreatedAt,
  previousCreatedAt,
}: {
  current: GeoAuditReport | null;
  previous: GeoAuditReport | null;
  auditCount: number;
  currentCreatedAt?: Date | null;
  previousCreatedAt?: Date | null;
}) {
  if (!current) return null;
  const delta = formatGeoAuditDelta(current, previous);
  const styles = {
    new: "border-blue-500/30 bg-blue-500/5 text-blue-200",
    improved: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    declined: "border-rose-500/30 bg-rose-500/5 text-rose-200",
    flat: "border-slate-600/60 bg-slate-950/40 text-slate-200",
  };
  const label = {
    new: "首次记录",
    improved: "变好",
    declined: "变差",
    flat: "持平",
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>最近审计对比</CardTitle>
          <CardDescription>
            已保存 {auditCount} 次站点审计；本次 {formatAuditTime(currentCreatedAt)}
            {previousCreatedAt ? `，上次 ${formatAuditTime(previousCreatedAt)}` : "，等待下一次形成趋势。"}
          </CardDescription>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-medium ${styles[delta.status]}`}>
          {label[delta.status]}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-300">{delta.summary}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">本次分数</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{delta.currentScore}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">上次分数</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            {delta.previousScore === null ? "暂无" : delta.previousScore}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">通过项</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">
            {delta.currentPassCount}
            {delta.status !== "new" && <span className="ml-2 text-xs text-slate-500">({delta.passDelta > 0 ? `+${delta.passDelta}` : delta.passDelta})</span>}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">需处理</p>
          <p className="mt-1 text-lg font-semibold text-rose-300">
            {delta.currentFailCount}
            {delta.status !== "new" && <span className="ml-2 text-xs text-slate-500">({delta.failDelta > 0 ? `+${delta.failDelta}` : delta.failDelta})</span>}
          </p>
        </div>
      </div>
    </Card>
  );
}

function EffectTrackingCard({ summary }: { summary: ReturnType<typeof getGeoEffectTrackingSummary> }) {
  const styles = {
    new: "border-blue-500/30 bg-blue-500/5 text-blue-200",
    improved: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    declined: "border-rose-500/30 bg-rose-500/5 text-rose-200",
    flat: "border-slate-600/60 bg-slate-950/40 text-slate-200",
  };
  const labels = {
    new: "建立基线",
    improved: "看到改善",
    declined: "出现风险",
    flat: "继续观察",
  };
  const behaviorStyles = {
    not_connected: "border-rose-500/30 bg-rose-500/5 text-rose-200",
    watching: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    verified: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>优化效果追踪</CardTitle>
          <CardDescription>用最近两次 GEO Audit 和 GA4 可用性判断：现在能不能说明优化有效。</CardDescription>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-medium ${styles[summary.status]}`}>
          {labels[summary.status]}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{summary.summary}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">已改善</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">{summary.improvedChecks.length}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {summary.improvedChecks.slice(0, 2).map((check) => check.name).join(" / ") || "等待下一次对比"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">新增风险</p>
          <p className="mt-1 text-lg font-semibold text-rose-300">{summary.newRiskChecks.length}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {summary.newRiskChecks.slice(0, 2).map((check) => check.name).join(" / ") || "暂无新增风险"}
          </p>
        </div>
        <div className={`rounded-lg border p-3 ${behaviorStyles[summary.behaviorSignal.status]}`}>
          <p className="text-xs opacity-80">行为验证</p>
          <p className="mt-1 text-sm font-semibold">{summary.behaviorSignal.label}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{summary.behaviorSignal.detail}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {summary.waitWindows.map((item) => (
          <div key={item.label} className="rounded border border-[var(--border)] bg-slate-950/30 p-3">
            <p className="text-sm font-medium text-slate-100">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.purpose}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditStatusSummaryCard({ items }: { items: ReturnType<typeof getGeoAuditStatusSummary> }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>本次诊断状态</CardTitle>
          <CardDescription>先看检查是否可信，再看分数和优化建议。</CardDescription>
        </div>
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
          Snapshot
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{item.value}</p>
              </div>
              <SummaryTonePill tone={item.tone} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExecutionTasksCard({ actionItems, domain }: { actionItems: GeoActionItem[]; domain?: string | null }) {
  const tasks = getGeoExecutionTasks(actionItems, domain);
  if (tasks.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>一键执行清单</CardTitle>
          <CardDescription>把当前最重要的 3 个问题转成运营可执行任务，先改、再复查。</CardDescription>
        </div>
        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-200">
          {tasks.length} tasks
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {tasks.map((task) => (
          <div key={`${task.stepLabel}-${task.title}`} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-blue-300">{task.stepLabel}</p>
              <PriorityPill priority={task.priority} />
            </div>
            <p className="mt-2 font-medium text-slate-100">{task.title}</p>
            <p className="mt-1 text-xs text-slate-500">{task.target}</p>
            <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
              <p>
                <span className="text-slate-300">目标：</span>
                {task.goal}
              </p>
              <p>
                <span className="text-slate-300">动作：</span>
                {task.action}
              </p>
              <p>
                <span className="text-slate-300">复查：</span>
                {task.validation}
              </p>
            </div>
            {task.copyBlock && (
              <details className="mt-3 rounded border border-[var(--border)] bg-slate-950/70 p-3">
                <summary className="cursor-pointer text-xs font-medium text-emerald-200">可复制内容</summary>
                <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{task.copyBlock}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function TaskCenterCard({ groups }: { groups: ReturnType<typeof getGeoTaskCenterGroups> }) {
  const allTasks = groups.flatMap((group) => group.tasks.map((task) => ({ ...task, groupLabel: group.label })));
  const topTasks = allTasks.slice(0, 3);
  if (allTasks.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>任务中心</CardTitle>
          <CardDescription>默认只显示接下来最重要的 3 个动作，其它内容折叠，方便快速判断下一步。</CardDescription>
        </div>
        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-200">
          {allTasks.length} tasks
        </span>
      </div>
      {topTasks[0] && (
        <div className="mt-4 rounded-lg border border-blue-500/25 bg-blue-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-200">从这里开始</p>
              <p className="mt-1 font-medium text-slate-100">{topTasks[0].title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{topTasks[0].action}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <TaskStatusPill status={topTasks[0].status} />
              <PriorityPill priority={topTasks[0].priority} />
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {topTasks.map((task, index) => (
          <div key={`${task.id}-${task.title}`} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-blue-300">任务 {index + 1} · {task.groupLabel}</p>
              <PriorityPill priority={task.priority} />
            </div>
            <p className="mt-2 font-medium text-slate-100">{task.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <p className="text-xs text-slate-500">{task.target}</p>
              <TaskStatusPill status={task.status} />
            </div>
            <p className="mt-3 rounded border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs leading-5 text-blue-100">
              {task.explanation}
            </p>
            <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
              <p>
                <span className="text-slate-300">目标：</span>
                {task.goal}
              </p>
              <p>
                <span className="text-slate-300">动作：</span>
                {task.action}
              </p>
              <p>
                <span className="text-slate-300">验证：</span>
                {task.validation}
              </p>
            </div>
            <details className="mt-3 rounded border border-[var(--border)] bg-slate-950/60 p-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-200">查看来源和影响</summary>
              <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                <p>
                  <span className="text-slate-300">来源：</span>
                  {task.source}
                </p>
                <p>
                  <span className="text-slate-300">影响：</span>
                  {task.impact}
                </p>
              </div>
            </details>
            {task.copyBlock && (
              <details className="mt-3 rounded border border-[var(--border)] bg-slate-950/70 p-3">
                <summary className="cursor-pointer text-xs font-medium text-emerald-200">可复制内容</summary>
                <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{task.copyBlock}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
      <details className="mt-4 rounded-lg border border-[var(--border)] bg-slate-950/30 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">查看分组任务池</summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-[var(--border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{group.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{group.summary}</p>
                </div>
                <span className="rounded border border-slate-600/70 px-2 py-0.5 text-xs text-slate-300">
                  {group.tasks.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {group.tasks.length > 0 ? (
                  group.tasks.map((task) => (
                    <div key={task.id} className="rounded border border-[var(--border)] bg-slate-950/50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-200">{task.title}</p>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <TaskStatusPill status={task.status} />
                          <PriorityPill priority={task.priority} />
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{task.action}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{task.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                    这一组暂无待处理任务。
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}

function ReviewStepsCard({ steps }: { steps: ReturnType<typeof getGeoReviewSteps> }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>复查指引</CardTitle>
          <CardDescription>任务做完后按这 3 步确认变化，避免只看一次分数就下结论。</CardDescription>
        </div>
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
          Review loop
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2 md:flex-row">
        {steps.map((step) => (
          <div key={step.id} className="flex-1 rounded-lg border border-[var(--border)] bg-slate-950/40 p-3">
            <p className="text-sm font-medium text-slate-100">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{step.action}</p>
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
      audits: { where: { type: "site" }, orderBy: { createdAt: "desc" }, take: 2 },
      products: { orderBy: [{ geoScore: "asc" }, { updatedAt: "desc" }], take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  const primarySite = sites[0] ?? null;
  const latestAudit = primarySite?.audits[0] ?? null;
  const previousAudit = primarySite?.audits[1] ?? null;
  const report = latestAudit ? parseReport(latestAudit.report) : null;
  const previousReport = previousAudit ? parseReport(previousAudit.report) : null;
  const sections = report?.sections ?? [];
  const actionItems = report?.actionItems ?? [];
  const checks = report?.checks ?? [];
  const topActions = actionItems.slice(0, 3);
  const scopeItems = getGeoAuditScopeItems({
    domain: primarySite?.domain,
    landingPath: primarySite?.landingPath,
    products: primarySite?.products.map((product) => ({
      title: product.title,
      url: product.url,
      geoScore: product.geoScore,
    })),
    report,
  });
  const scopeGaps = getGeoScopeGaps(scopeItems);
  const validationLoopItems = getGeoValidationLoopItems({
    current: report,
    previous: previousReport,
    scopeGaps,
  });
  const taskCenterGroups = getGeoTaskCenterGroups({
    actionItems,
    scopeGaps,
    validationLoopItems,
    currentReport: report,
    previousReport,
    domain: primarySite?.domain,
  });
  const statusSummary = getGeoAuditStatusSummary({
    scopeItems,
    scopeGaps,
    actionItems,
    validationLoopItems,
  });
  const reviewSteps = getGeoReviewSteps();
  const effectTrackingSummary = getGeoEffectTrackingSummary({
    current: report,
    previous: previousReport,
  });
  const detailsSummaryItems = [
    { label: "检查项", value: checks.length },
    { label: "证据缺口", value: scopeGaps.length },
    { label: "已检查范围", value: scopeItems.length },
    { label: "复查项", value: validationLoopItems.length },
  ];

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

      <GeoAuditPageNav />

      <div id="geo-audit-result" className="scroll-mt-4">
        <AuditDeltaCard
          current={report}
          previous={previousReport}
          auditCount={primarySite?._count.audits ?? 0}
          currentCreatedAt={latestAudit?.createdAt}
          previousCreatedAt={previousAudit?.createdAt}
        />
      </div>
      <EffectTrackingCard summary={effectTrackingSummary} />
      <div id="geo-audit-tasks" className="scroll-mt-4">
        <TaskCenterCard groups={taskCenterGroups} />
      </div>
      <div id="geo-audit-review" className="scroll-mt-4">
        <ReviewStepsCard steps={reviewSteps} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-slate-950/30 p-3">
        {detailsSummaryItems.map((item) => (
          <span
            key={item.label}
            className="rounded border border-slate-600/70 bg-slate-950/40 px-2 py-1 text-xs text-slate-300"
          >
            {item.label}: <span className="text-slate-100">{item.value}</span>
          </span>
        ))}
      </div>

      <details id="geo-audit-details" className="scroll-mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <summary className="cursor-pointer list-none p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>详细诊断</CardTitle>
              <CardDescription>展开后查看检查状态、证据缺口、全部检查项和商品细节。</CardDescription>
            </div>
            <span className="rounded border border-slate-600/70 px-2 py-1 text-xs text-slate-300">展开</span>
          </div>
        </summary>
        <div className="space-y-6 border-t border-[var(--border)] p-5">
          <DetailGroupLabel title="状态与验证" description="先确认本次诊断是否可信，以及优化结果能不能被 GA4 或复查数据验证。" />
          <AuditStatusSummaryCard items={statusSummary} />
          <ValidationLoopCard items={validationLoopItems} />

          <DetailGroupLabel title="基础能力" description="再看 AI 和搜索系统理解页面所需的 SEO、内容结构和页面体验基础。" />
          <StrategyReadinessCard />
          <SeoBasicsCard checks={checks} />
          <PageExperienceCard report={report?.pageExperience} landingPath={primarySite?.landingPath} />

          <DetailGroupLabel title="证据范围" description="这里说明系统本次看过哪些页面和文件，以及哪些证据还不完整。" />

      {scopeItems.length > 0 && (
        <Card>
          <CardTitle>检查范围</CardTitle>
          <CardDescription>先确认系统实际看过哪些页面和文件，再判断分数是否可信。</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scopeItems.map((item) => (
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

      {scopeGaps.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>证据缺口</CardTitle>
              <CardDescription>这些不是新的扣分项，而是说明本次诊断哪里还不够完整。</CardDescription>
            </div>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
              {scopeGaps.length} gap{scopeGaps.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {scopeGaps.map((gap) => (
              <div key={gap.id} className="rounded-lg border border-[var(--border)] bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-200">{gap.label}</p>
                  <ScopeGapPill severity={gap.severity} />
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-400">{gap.reason}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">{gap.nextStep}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

          <DetailGroupLabel title="检查项与商品" description="最后查看全部检查项、核心维度和低分商品，用于逐项复核。" />

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

      <Card className="hidden">
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
      </details>
    </div>
  );
}
