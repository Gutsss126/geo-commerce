import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { GeoAuditReport } from "@/lib/geo/types";

export default async function AuditsPage() {
  const audits = await prisma.geoAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { site: true },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">审计报告</h1>
        <p className="mt-1 text-slate-400">查看站点与产品的 GEO 检查项明细与修复建议。</p>
      </header>

      <div className="space-y-4">
        {audits.map((audit) => {
          const report = JSON.parse(audit.report) as GeoAuditReport;
          return (
            <Card key={audit.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {audit.site.name} — {audit.type === "site" ? "站点审计" : "产品审计"}
                  </CardTitle>
                  <CardDescription>
                    {new Date(audit.createdAt).toLocaleString("zh-CN")}
                    {audit.targetUrl ? ` · ${audit.targetUrl}` : ""}
                  </CardDescription>
                  <p className="mt-2 text-sm text-slate-300">{report.summary}</p>
                </div>
                <span className="text-3xl font-bold text-blue-300">{audit.overallScore}</span>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {report.checks.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between">
                      <span>{c.name}</span>
                      <span
                        className={
                          c.status === "pass"
                            ? "text-emerald-400"
                            : c.status === "warn"
                              ? "text-amber-400"
                              : "text-rose-400"
                        }
                      >
                        {c.score}/{c.maxScore}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{c.recommendation}</p>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
        {audits.length === 0 && (
          <p className="text-center text-slate-500 py-12">暂无审计报告</p>
        )}
      </div>
    </div>
  );
}
