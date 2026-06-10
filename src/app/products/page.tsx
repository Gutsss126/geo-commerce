import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { createProduct, runProductAudit } from "@/app/actions";

export default async function ProductsPage() {
  const [sites, products] = await Promise.all([
    prisma.site.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: { site: true },
      orderBy: { geoScore: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">产品 GEO</h1>
        <p className="mt-1 text-slate-400">
          针对 SKU 标题、描述、品类与 URL 进行可引用性评分与优化建议。
        </p>
      </header>

      <Card>
        <CardTitle>录入产品</CardTitle>
        <form action={createProduct} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select name="siteId" required className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option value="">选择站点</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            name="title"
            placeholder="产品标题"
            required
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="URL slug"
            required
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="sku"
            placeholder="商品 SKU（默认同 slug）"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="category"
            placeholder="品类路径，如 户外/帐篷"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="price"
            type="number"
            step="0.01"
            placeholder="价格"
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <input
            name="url"
            placeholder="https://..."
            className="rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="产品描述（可为空，后续可用工具增强）"
            className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
            rows={3}
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            添加并审计
          </button>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">产品</th>
              <th className="px-4 py-3">站点</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">品类</th>
              <th className="px-4 py-3">GEO 分</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-slate-400">{p.site.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.sku ?? p.slug}</td>
                <td className="px-4 py-3 text-slate-400">{p.category ?? "—"}</td>
                <td className="px-4 py-3">
                  <ScoreBadge score={p.geoScore ?? 0} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <form action={runProductAudit.bind(null, p.id)}>
                    <button type="submit" className="text-blue-400 hover:underline">
                      重新审计
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="py-12 text-center text-slate-500">暂无产品数据</p>
        )}
      </div>
    </div>
  );
}
