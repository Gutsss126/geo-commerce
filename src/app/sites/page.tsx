import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import Link from "next/link";
import { createSite, runSiteAudit } from "@/app/actions";

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
        <h1 className="text-2xl font-bold">站点管理</h1>
        <p className="mt-1 text-slate-400">
          绑定 WordPress / WooCommerce 等独立站，统一管理 GEO 与订单同步。
          <Link href="/integrations/wordpress" className="ml-2 text-blue-400 hover:underline">
            WordPress 集成指南 →
          </Link>
        </p>
      </header>

      <Card>
        <CardTitle>添加站点</CardTitle>
        <form action={createSite} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="品牌名 / 店铺名"
            required
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="domain"
            placeholder="example.com（不含 https）"
            required
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="wpUrl"
            placeholder="WordPress 地址 https://你的站点.com（可选）"
            className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <select name="platform" defaultValue="wordpress" className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option value="wordpress">WordPress + WooCommerce</option>
            <option value="woocommerce">WooCommerce（仅标记）</option>
            <option value="shopify">Shopify</option>
            <option value="shopline">SHOPLINE</option>
            <option value="custom">自研 / Headless</option>
          </select>
          <select name="locale" className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option value="zh-CN">zh-CN</option>
            <option value="en-US">en-US</option>
            <option value="ja-JP">ja-JP</option>
          </select>
          <textarea
            name="brandVoice"
            placeholder="品牌语调（专业 / 年轻 / 奢华…）"
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
          return (
            <Card key={site.id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>{site.name}</CardTitle>
                <CardDescription>
                  {site.domain} · {site.platform} · {site._count.products} 产品 ·{" "}
                  {site._count.audits} 次审计
                </CardDescription>
                {site.brandVoice && (
                  <p className="mt-2 text-xs text-slate-500">语调: {site.brandVoice}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
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
            </Card>
          );
        })}
        {sites.length === 0 && (
          <p className="text-center text-slate-500 py-12">尚未添加站点，请使用上方表单创建。</p>
        )}
      </div>
    </div>
  );
}
