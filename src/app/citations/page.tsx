import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { addCitation } from "@/app/actions";

export default async function CitationsPage() {
  const [sites, citations] = await Promise.all([
    prisma.site.findMany(),
    prisma.citation.findMany({
      orderBy: { detectedAt: "desc" },
      include: { site: true },
      take: 50,
    }),
  ]);

  const byEngine = citations.reduce<Record<string, number>>((acc, c) => {
    acc[c.engine] = (acc[c.engine] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">AI 引用追踪</h1>
        <p className="mt-1 text-slate-400">
          手动记录在各生成式引擎中品牌/产品被引用的查询与片段（可扩展为自动监测）。
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        {Object.entries(byEngine).map(([engine, count]) => (
          <Card key={engine} className="min-w-[120px]">
            <CardDescription>{engine}</CardDescription>
            <p className="text-2xl font-bold">{count}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>记录引用</CardTitle>
        <form action={addCitation} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select name="siteId" required className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option value="">站点</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select name="engine" className="rounded-lg border bg-black/30 px-3 py-2 text-sm">
            <option>ChatGPT</option>
            <option>Perplexity</option>
            <option>Google AI Overview</option>
            <option>Claude</option>
            <option>Copilot</option>
          </select>
          <input
            name="query"
            placeholder="用户查询词"
            required
            className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <textarea
            name="snippet"
            placeholder="AI 回答片段"
            className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
            rows={2}
          />
          <input
            name="citedUrl"
            placeholder="引用的 URL"
            className="sm:col-span-2 rounded-lg border bg-black/30 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500"
          >
            保存
          </button>
        </form>
      </Card>

      <div className="space-y-3">
        {citations.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-300">{c.engine}</span>
              <span>{c.site.name}</span>
              <span>{new Date(c.detectedAt).toLocaleString("zh-CN")}</span>
            </div>
            <p className="mt-2 font-medium text-sm">「{c.query}」</p>
            {c.snippet && <p className="mt-1 text-sm text-slate-400">{c.snippet}</p>}
            {c.citedUrl && (
              <a href={c.citedUrl} className="mt-1 block text-xs text-blue-400 hover:underline">
                {c.citedUrl}
              </a>
            )}
          </Card>
        ))}
        {citations.length === 0 && (
          <p className="text-center text-slate-500 py-8">尚无引用记录</p>
        )}
      </div>
    </div>
  );
}
