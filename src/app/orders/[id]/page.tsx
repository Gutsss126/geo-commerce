import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { statusColor, statusLabel, ORDER_STATUSES } from "@/lib/orders";
import { updateOrderStatus } from "@/app/order-actions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { site: true, items: { include: { product: true } } },
  });

  if (!order) notFound();

  const fullAddress = [
    order.shippingCountry,
    order.shippingProvince,
    order.shippingCity,
    order.shippingAddress,
    order.shippingPostalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-blue-400 hover:underline">
            ← 返回订单列表
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{order.orderNumber}</h1>
          <p className="mt-1 text-slate-400">
            {order.site.name} · {new Date(order.createdAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-sm ${statusColor(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>客户信息</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="用户 ID" value={order.userId} mono />
            <Row label="收件人" value={order.contactName} />
            <Row label="电话" value={order.contactPhone} />
            <Row label="邮箱" value={order.contactEmail ?? "—"} />
          </dl>
        </Card>

        <Card>
          <CardTitle>收件地址</CardTitle>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">{fullAddress}</p>
          {order.note && (
            <p className="mt-4 text-xs text-slate-500">
              备注: {order.note}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>商品明细</CardTitle>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="pb-2">SKU</th>
              <th className="pb-2">商品名</th>
              <th className="pb-2">数量</th>
              <th className="pb-2">单价</th>
              <th className="pb-2">小计</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--border)]">
                <td className="py-2 font-mono text-xs">{item.sku}</td>
                <td className="py-2">{item.title}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">${item.unitPrice.toFixed(2)}</td>
                <td className="py-2">${item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-4 text-right text-slate-400">
                合计
              </td>
              <td className="pt-4 font-bold text-blue-300">
                ${order.totalAmount.toFixed(2)} {order.currency}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <Card>
        <CardTitle>更新状态</CardTitle>
        <CardDescription>流转订单履约状态</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <form key={s.value} action={updateOrderStatus.bind(null, order.id, s.value)}>
              <button
                type="submit"
                disabled={order.status === s.value}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-white/5"
              >
                {s.label}
              </button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}
