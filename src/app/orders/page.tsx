import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { OrderForm } from "@/components/order-form";
import { statusColor, statusLabel } from "@/lib/orders";
import { deleteOrder } from "@/app/order-actions";
import { ORDER_STATUSES } from "@/lib/orders";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; siteId?: string }>;
}) {
  const params = await searchParams;
  const [sites, orders] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.order.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.siteId ? { siteId: params.siteId } : {}),
      },
      include: {
        site: true,
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">订单管理</h1>
        <p className="mt-1 text-slate-400">
          管理用户 ID、商品 SKU、数量、收件地址与联系方式，支持与 GEO 产品库联动。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardDescription>订单总数</CardDescription>
          <p className="mt-2 text-3xl font-bold">{orders.length}</p>
        </Card>
        <Card>
          <CardDescription>有效成交额</CardDescription>
          <p className="mt-2 text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
        </Card>
        <Card>
          <CardDescription>待处理</CardDescription>
          <p className="mt-2 text-3xl font-bold">
            {orders.filter((o) => o.status === "pending" || o.status === "paid").length}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>新建订单</CardTitle>
        <CardDescription>SKU 可与产品库中的 slug / sku 字段匹配以自动带出标题与价格</CardDescription>
        <OrderForm sites={sites} defaultSiteId={params.siteId} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>订单列表</CardTitle>
          <div className="flex flex-wrap gap-2 text-sm">
            <FilterLink href="/orders" active={!params.status && !params.siteId}>
              全部
            </FilterLink>
            {ORDER_STATUSES.slice(0, 4).map((s) => (
              <FilterLink
                key={s.value}
                href={`/orders?status=${s.value}`}
                active={params.status === s.value}
              >
                {s.label}
              </FilterLink>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3">订单号</th>
                <th className="px-4 py-3">用户 ID</th>
                <th className="px-4 py-3">站点</th>
                <th className="px-4 py-3">商品</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-blue-400 hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{order.userId}</td>
                  <td className="px-4 py-3 text-slate-400">{order.site.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {order.items.map((i) => `${i.sku}×${i.quantity}`).join(", ")}
                  </td>
                  <td className="px-4 py-3">${order.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${statusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Link href={`/orders/${order.id}`} className="text-blue-400 hover:underline text-xs">
                        详情
                      </Link>
                      <form action={deleteOrder.bind(null, order.id)}>
                        <button type="submit" className="text-xs text-rose-400 hover:underline">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="py-12 text-center text-slate-500">暂无订单</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded bg-blue-500/20 px-2 py-1 text-blue-300"
          : "rounded px-2 py-1 text-slate-500 hover:bg-white/5"
      }
    >
      {children}
    </Link>
  );
}
