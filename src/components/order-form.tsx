"use client";

import { useState } from "react";
import { createOrder } from "@/app/order-actions";
import { ORDER_STATUSES } from "@/lib/orders";

type LineRow = { sku: string; quantity: number; unitPrice: string };

export function OrderForm({
  sites,
  defaultSiteId,
}: {
  sites: { id: string; name: string }[];
  defaultSiteId?: string;
}) {
  const [lines, setLines] = useState<LineRow[]>([
    { sku: "", quantity: 1, unitPrice: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  function updateLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addLine() {
    setLines((prev) => [...prev, { sku: "", quantity: 1, unitPrice: "" }]);
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const itemsJson = JSON.stringify(
      lines.map((l) => ({
        sku: l.sku,
        quantity: Number(l.quantity),
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
      }))
    );
    formData.set("itemsJson", itemsJson);
    try {
      const id = await createOrder(formData);
      window.location.href = `/orders/${id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  }

  return (
    <form action={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <select
        name="siteId"
        required
        defaultValue={defaultSiteId}
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      >
        <option value="">选择站点</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        name="userId"
        placeholder="用户 ID *"
        required
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="contactName"
        placeholder="收件人姓名 *"
        required
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="contactPhone"
        placeholder="联系电话 *"
        required
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="contactEmail"
        type="email"
        placeholder="邮箱"
        className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />

      <input
        name="shippingCountry"
        placeholder="国家/地区"
        defaultValue="CN"
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="shippingPostalCode"
        placeholder="邮编"
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="shippingProvince"
        placeholder="省/州"
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="shippingCity"
        placeholder="城市"
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <input
        name="shippingAddress"
        placeholder="详细地址（街道、门牌）*"
        required
        className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />

      <select name="status" className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
        {ORDER_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <input
        name="orderNumber"
        placeholder="订单号（留空自动生成）"
        className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />
      <textarea
        name="note"
        placeholder="订单备注"
        rows={2}
        className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
      />

      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">商品明细</p>
          <button
            type="button"
            onClick={addLine}
            className="text-xs text-blue-400 hover:underline"
          >
            + 添加 SKU 行
          </button>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-4 items-end">
            <input
              value={line.sku}
              onChange={(e) => updateLine(i, { sku: e.target.value })}
              placeholder="商品 SKU *"
              required
              className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
              placeholder="数量"
              className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                placeholder="单价（可选）"
                className="flex-1 rounded-lg border bg-black/30 px-3 py-2 text-sm"
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="rounded border border-rose-500/40 px-2 text-xs text-rose-300"
                >
                  删
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="sm:col-span-2 text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        className="sm:col-span-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
      >
        创建订单
      </button>
    </form>
  );
}
