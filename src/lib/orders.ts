export const ORDER_STATUSES = [
  { value: "pending", label: "待付款" },
  { value: "paid", label: "已付款" },
  { value: "processing", label: "处理中" },
  { value: "shipped", label: "已发货" },
  { value: "delivered", label: "已签收" },
  { value: "cancelled", label: "已取消" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export function statusLabel(status: string) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function statusColor(status: string) {
  switch (status) {
    case "paid":
    case "delivered":
      return "bg-emerald-500/20 text-emerald-300";
    case "shipped":
    case "processing":
      return "bg-blue-500/20 text-blue-300";
    case "cancelled":
      return "bg-rose-500/20 text-rose-300";
    default:
      return "bg-amber-500/20 text-amber-300";
  }
}

export function generateOrderNumber() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${stamp}-${rand}`;
}

export function parseOrderItemsJson(raw: string) {
  const items = JSON.parse(raw) as {
    sku: string;
    quantity: number;
    unitPrice?: number;
  }[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("至少包含一条商品行");
  }
  for (const row of items) {
    if (!row.sku?.trim()) throw new Error("SKU 不能为空");
    if (!row.quantity || row.quantity < 1) throw new Error("数量必须大于 0");
  }
  return items.map((row) => ({
    sku: row.sku.trim(),
    quantity: Math.floor(row.quantity),
    unitPrice: row.unitPrice ?? 0,
  }));
}
