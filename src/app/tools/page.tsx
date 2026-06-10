import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  generateAndSaveLlms,
  optimizeProductDescription,
  getProductFaqSuggestions,
} from "@/app/actions";
import { generateProductSchema } from "@/lib/geo/generators";

async function LlmsTool({ siteId, siteName }: { siteId: string; siteName: string }) {
  const config = await prisma.llmsConfig.findUnique({ where: { siteId } });
  return (
    <Card>
      <CardTitle>llms.txt — {siteName}</CardTitle>
      <CardDescription>部署到 https://域名/llms.txt，引导 AI 爬虫索引范围</CardDescription>
      <form action={generateAndSaveLlms.bind(null, siteId)} className="mt-3">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-500"
        >
          生成 / 更新
        </button>
      </form>
      {config && (
        <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
          {config.content}
        </pre>
      )}
    </Card>
  );
}

async function SchemaPreview({ productId }: { productId: string }) {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    include: { site: true },
  });
  if (!p) return null;
  const schema = generateProductSchema({
    title: p.title,
    description: p.description,
    category: p.category,
    price: p.price,
    url: p.url,
    brand: p.site.name,
    sku: p.slug,
  });
  return (
    <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-xs">
      {JSON.stringify(schema, null, 2)}
    </pre>
  );
}

export default async function ToolsPage() {
  const [sites, products] = await Promise.all([
    prisma.site.findMany(),
    prisma.product.findMany({ include: { site: true }, take: 5 }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">GEO 工具箱</h1>
        <p className="mt-1 text-slate-400">
          一键生成 llms.txt、JSON-LD Schema、FAQ 建议与描述增强模板。
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {sites.map((site) => (
          <LlmsTool key={site.id} siteId={site.id} siteName={site.name} />
        ))}
      </div>

      <Card>
        <CardTitle>产品描述增强</CardTitle>
        <CardDescription>为短描述注入规格、场景、对比、售后等 GEO 友好结构</CardDescription>
        <ul className="mt-4 space-y-4">
          {products.map((p) => (
            <li key={p.id} className="rounded-lg border border-[var(--border)] p-3">
              <p className="font-medium text-sm">{p.title}</p>
              <p className="text-xs text-slate-500">{p.site.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={optimizeProductDescription.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300"
                  >
                    增强描述
                  </button>
                </form>
              </div>
              <FaqBlock productId={p.id} />
              <SchemaPreview productId={p.id} />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>REST API</CardTitle>
        <CardDescription>供主题、Shopify App 或 CI 调用的接口</CardDescription>
        <ul className="mt-3 space-y-1 font-mono text-xs text-slate-400">
          <li>POST /api/audit/product — 产品 GEO 审计</li>
          <li>POST /api/audit/site — 站点 GEO 审计</li>
          <li>GET /api/llms/[domain] — 获取 llms.txt 内容</li>
          <li>GET /api/schema/product?slug= — JSON-LD 产品 Schema</li>
          <li>GET /api/orders — 订单列表（支持 siteId、userId、status）</li>
          <li>POST /api/orders — 创建订单</li>
          <li>GET/PATCH/DELETE /api/orders/[id] — 订单详情与状态</li>
          <li>POST /api/integrations/wordpress/products — WordPress 产品同步</li>
          <li>POST /api/integrations/wordpress/orders — WooCommerce 订单同步</li>
        </ul>
      </Card>
    </div>
  );
}

async function FaqBlock({ productId }: { productId: string }) {
  const faqs = await getProductFaqSuggestions(productId);
  return (
    <div className="mt-2">
      <p className="text-xs text-slate-500 mb-1">FAQ 建议（可嵌入产品页）:</p>
      <ul className="text-xs text-slate-400 space-y-1">
        {faqs.map((f, i) => (
          <li key={i}>
            <strong className="text-slate-300">Q:</strong> {f.q}
          </li>
        ))}
      </ul>
    </div>
  );
}
