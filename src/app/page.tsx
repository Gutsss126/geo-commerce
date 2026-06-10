import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { ArrowRight, Package, Globe, ScanSearch, ShoppingCart } from "lucide-react";
import { statusLabel, statusColor } from "@/lib/orders";

export default async function DashboardPage() {
  const [sites, products, audits, citations, orderCount, recentOrders] = await Promise.all([
    prisma.site.findMany({ include: { _count: { select: { products: true, orders: true } } } }),
    prisma.product.findMany({ orderBy: { geoScore: "asc" }, take: 5 }),
    prisma.geoAudit.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { site: true } }),
    prisma.citation.count(),
    prisma.order.count(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { site: true, items: true },
    }),
  ]);

  const avgScore =
    products.length > 0
      ? Math.round(products.reduce((s, p) => s + (p.geoScore ?? 0), 0) / products.length)
      : 0;

  const lowProducts = await prisma.product.findMany({
    where: { geoScore: { lt: 60 } },
    take: 3,
    include: { site: true },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">GEO 总览</h1>
        <p className="mt-1 text-slate-400">
          管理独立站在 ChatGPT、Perplexity、Google AI Overview 等生成式引擎中的可发现性与可引用性。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardDescription>接入站点</CardDescription>
          <p className="mt-2 text-3xl font-bold">{sites.length}</p>
        </Card>
        <Card>
          <CardDescription>产品条目</CardDescription>
          <p className="mt-2 text-3xl font-bold">
            {sites.reduce((s, x) => s + x._count.products, 0)}
          </p>
        </Card>
        <Card>
          <CardDescription>订单数</CardDescription>
          <p className="mt-2 text-3xl font-bold">{orderCount}</p>
        </Card>
        <Card>
          <CardDescription>平均 GEO 分</CardDescription>
          <div className="mt-2 flex items-center gap-3">
            <ScoreBadge score={avgScore || 0} size="sm" />
          </div>
        </Card>
        <Card>
          <CardDescription>AI 引用记录</CardDescription>
          <p className="mt-2 text-3xl font-bold">{citations}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>待优化 SKU</CardTitle>
          <CardDescription>GEO 分低于 60 的产品优先处理</CardDescription>
          <ul className="mt-4 space-y-3">
            {lowProducts.length === 0 ? (
              <li className="text-sm text-slate-500">暂无低分产品，或尚未录入产品。</li>
            ) : (
              lowProducts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-slate-500">{p.site.name}</p>
                  </div>
                  <ScoreBadge score={p.geoScore ?? 0} size="sm" />
                </li>
              ))
            )}
          </ul>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
          >
            查看全部产品 <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>

        <Card>
          <CardTitle>最近审计</CardTitle>
          <ul className="mt-4 space-y-2">
            {audits.length === 0 ? (
              <li className="text-sm text-slate-500">尚无审计记录，请先添加站点并运行审计。</li>
            ) : (
              audits.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between text-sm border-b border-[var(--border)] py-2 last:border-0"
                >
                  <span>
                    {a.site.name} · {a.type === "site" ? "站点" : "产品"}
                  </span>
                  <span className="font-mono text-blue-300">{a.overallScore}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>最近订单</CardTitle>
        <ul className="mt-4 space-y-2">
          {recentOrders.length === 0 ? (
            <li className="text-sm text-slate-500">暂无订单</li>
          ) : (
            recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <div>
                  <Link href={`/orders/${o.id}`} className="text-blue-400 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {o.userId} · {o.items.map((i) => i.sku).join(", ")}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${statusColor(o.status)}`}>
                  {statusLabel(o.status)}
                </span>
              </li>
            ))
          )}
        </ul>
        <Link
          href="/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
        >
          订单管理 <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/sites", icon: Globe, title: "添加站点", desc: "绑定 Shopify / WooCommerce 等" },
          { href: "/orders", icon: ShoppingCart, title: "订单管理", desc: "用户·SKU·地址·联系方式" },
          { href: "/tools", icon: ScanSearch, title: "GEO 工具箱", desc: "llms.txt · Schema · FAQ" },
          { href: "/products", icon: Package, title: "优化产品", desc: "批量审计与描述增强" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:border-blue-500/40">
                <Icon className="h-5 w-5 text-blue-400" />
                <p className="mt-3 font-semibold">{item.title}</p>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
