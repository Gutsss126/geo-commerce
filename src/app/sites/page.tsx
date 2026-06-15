import Link from "next/link";
import { CheckCircle2, CircleDashed, ExternalLink, Settings2 } from "lucide-react";
import { createSite, runSiteAudit, updateSiteConfig } from "@/app/actions";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { prisma } from "@/lib/db";
import { getSiteConfigStatus, resolveSiteAuditConfig } from "@/lib/site-config";

function StatusDot({ ready }: { ready: boolean }) {
  return ready ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
  ) : (
    <CircleDashed className="h-4 w-4 text-amber-300" />
  );
}

function StatusItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2">
      <StatusDot ready={ready} />
      <span className="text-sm text-slate-300">{label}</span>
    </div>
  );
}

export default async function SitesPage() {
  const sites = await prisma.site.findMany({
    include: {
      _count: { select: { products: true, audits: true } },
      audits: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">站点配置</h1>
        <p className="mt-1 text-slate-400">
          先把目标站点、落地页和 GA4 参数放在这里，GEO 审计和流量诊断会自动复用。
          <Link href="/integrations/wordpress" className="ml-2 text-blue-400 hover:underline">
            WordPress 集成指南
          </Link>
        </p>
      </header>

      <Card>
        <CardTitle>添加站点</CardTitle>
        <CardDescription>
          安全 MVP 只保存普通配置，不保存 Google 私钥或用户密码。
        </CardDescription>
        <form action={createSite} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="品牌名 / 店铺名"
            required
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="domain"
            placeholder="example.com，不需要 https"
            required
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="landingPath"
            defaultValue="/tiktok/"
            placeholder="/tiktok/"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="ga4MeasurementId"
            placeholder="GA4 Measurement ID，例如 G-XZ96E6XHMY"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="ga4PropertyId"
            placeholder="GA4 Property ID，例如 541416618"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="wpUrl"
            placeholder="WordPress 后台地址，可选"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <select name="platform" defaultValue="wordpress" className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option value="wordpress">WordPress + WooCommerce</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="shopify">Shopify</option>
            <option value="shopline">SHOPLINE</option>
            <option value="custom">自研 / Headless</option>
          </select>
          <select name="locale" defaultValue="zh-CN" className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option value="zh-CN">zh-CN</option>
            <option value="en-US">en-US</option>
            <option value="ja-JP">ja-JP</option>
          </select>
          <textarea
            name="brandVoice"
            placeholder="品牌语调，可选。例如：手作、礼物感、轻奢、游戏周边"
            className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            创建站点并生成基线审计
          </button>
        </form>
      </Card>

      <div className="grid gap-4">
        {sites.map((site) => {
          const lastScore = site.audits[0]?.overallScore ?? 0;
          const config = resolveSiteAuditConfig(site);
          const status = getSiteConfigStatus(site);
          return (
            <Card key={site.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{site.name}</CardTitle>
                  <CardDescription>
                    {config.domain} · {site.platform} · {site._count.products} 个商品 ·{" "}
                    {site._count.audits} 次审计
                  </CardDescription>
                  <p className="mt-2 text-xs text-slate-500">
                    当前诊断页：{config.landingPath} · GA4：{config.ga4MeasurementId ?? "未配置"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={lastScore} />
                  <form action={runSiteAudit.bind(null, site.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-blue-500/40 px-3 py-1.5 text-sm text-blue-300 hover:bg-blue-500/10"
                    >
                      重新审计
                    </button>
                  </form>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <StatusItem label={`落地页 ${config.landingPath}`} ready={status.landingPage === "ready"} />
                <StatusItem label="GA4 页面采集" ready={status.ga4Tracking === "ready"} />
                <StatusItem label="GA4 报告读取" ready={status.ga4Reporting === "ready"} />
              </div>

              <details className="rounded-lg border border-[var(--border)] bg-black/20">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-slate-200">
                  <Settings2 className="h-4 w-4 text-blue-300" />
                  编辑配置
                </summary>
                <form action={updateSiteConfig} className="grid gap-3 border-t border-[var(--border)] p-3 sm:grid-cols-2">
                  <input type="hidden" name="siteId" value={site.id} />
                  <input
                    name="name"
                    defaultValue={site.name}
                    className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    name="domain"
                    defaultValue={config.domain}
                    className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    name="landingPath"
                    defaultValue={config.landingPath}
                    className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
                  />
                  <input
                    name="ga4MeasurementId"
                    defaultValue={config.ga4MeasurementId ?? ""}
                    className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
                    placeholder="G-XZ96E6XHMY"
                  />
                  <input
                    name="ga4PropertyId"
                    defaultValue={config.ga4PropertyId ?? ""}
                    className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
                    placeholder="541416618"
                  />
                  <input
                    name="wpUrl"
                    defaultValue={site.wpUrl ?? ""}
                    className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
                    placeholder="WordPress 后台地址"
                  />
                  <textarea
                    name="brandVoice"
                    defaultValue={site.brandVoice ?? ""}
                    className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
                    rows={2}
                  />
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href="/diagnostics/ga4"
                      className="inline-flex items-center gap-2 text-sm text-blue-300 hover:underline"
                    >
                      打开 GA4 诊断
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
                    >
                      保存配置
                    </button>
                  </div>
                </form>
              </details>
            </Card>
          );
        })}
        {sites.length === 0 && (
          <p className="py-12 text-center text-slate-500">还没有站点，先用上方表单添加一个。</p>
        )}
      </div>
    </div>
  );
}
