import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { regenerateSiteApiKey } from "@/app/actions";

export default async function WordPressIntegrationPage() {
  const sites = await prisma.site.findMany({
    where: { platform: { in: ["wordpress", "woocommerce"] } },
    orderBy: { name: "asc" },
  });

  const allSites = await prisma.site.findMany({ orderBy: { name: "asc" } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">WordPress / WooCommerce 集成</h1>
        <p className="mt-1 text-slate-400">
          安装插件后，产品保存与订单状态变更将自动同步到 GEO Commerce 后台。
          已上线示例：{" "}
          <a
            href="https://fancrafti.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            fancrafti.com
          </a>
          （生产部署见 docs/fancrafti-production.md）
        </p>
      </header>

      {allSites.some((s) => s.domain === "fancrafti.com") && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardTitle>FanCrafti 配置摘要</CardTitle>
          <CardDescription>https://fancrafti.com/</CardDescription>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            <li>• 插件 API 地址必须用下方公网 URL，不能填 localhost</li>
            <li>• 建议：<span className="font-mono text-blue-300">https://geo.fancrafti.com</span></li>
            <li>• 站点域名：<span className="font-mono">fancrafti.com</span></li>
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>① 安装 WordPress 插件</CardTitle>
        <CardDescription>
          插件目录：<code className="text-blue-300">wordpress/geo-commerce-connector</code>
        </CardDescription>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>将整个 <strong>geo-commerce-connector</strong> 文件夹上传到{" "}
            <code>wp-content/plugins/</code>
          </li>
          <li>在 WordPress 后台 → 插件 → 启用「GEO Commerce Connector」</li>
          <li>确保已安装并启用 <strong>WooCommerce</strong>（订单同步需要）</li>
          <li>进入 设置 → GEO Commerce，填写下方 API 地址与密钥</li>
        </ol>
      </Card>

      <Card>
        <CardTitle>② 插件配置项</CardTitle>
        <dl className="mt-4 space-y-3 text-sm">
          <ConfigRow
            label="GEO API 地址"
            value={`${appUrl}`}
            hint="插件会向该地址 POST 同步数据"
          />
          <ConfigRow
            label="产品同步端点"
            value={`${appUrl}/api/integrations/wordpress/products`}
          />
          <ConfigRow
            label="订单同步端点"
            value={`${appUrl}/api/integrations/wordpress/orders`}
          />
          <ConfigRow label="请求头" value="X-GEO-API-Key: <你的站点密钥>" />
        </dl>
      </Card>

      <Card>
        <CardTitle>③ 站点 API 密钥</CardTitle>
        {allSites.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            请先在{" "}
            <Link href="/sites" className="text-blue-400 hover:underline">
              站点管理
            </Link>{" "}
            添加 WordPress 站点（平台选择 WordPress）。
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {allSites.map((site) => (
              <li
                key={site.id}
                className="rounded-lg border border-[var(--border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{site.name}</p>
                    <p className="text-xs text-slate-500">
                      {site.domain} · {site.platform} · ID:{" "}
                      <span className="font-mono text-slate-400">{site.id}</span>
                    </p>
                    {site.wpUrl && (
                      <p className="mt-1 text-xs text-slate-500">WP: {site.wpUrl}</p>
                    )}
                  </div>
                  <form action={regenerateSiteApiKey.bind(null, site.id)}>
                    <button
                      type="submit"
                      className="text-xs text-amber-400 hover:underline"
                    >
                      重新生成密钥
                    </button>
                  </form>
                </div>
                <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-3 text-xs text-emerald-300">
                  {site.apiKey ?? "（非 WordPress 站点或未生成，请在站点管理重建）"}
                </pre>
                {site.platform !== "wordpress" && site.platform !== "woocommerce" && (
                  <p className="mt-2 text-xs text-amber-500">
                    提示：将站点平台改为 wordpress 以启用 Webhook 鉴权
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>④ WordPress 侧 GEO 建议</CardTitle>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>• 使用插件或主题代码输出 JSON-LD Product Schema（可调用本后台 Schema API）</li>
          <li>• 在站点根目录放置 <code>llms.txt</code>（可在 GEO 工具箱生成后复制到 WP 根目录）</li>
          <li>• WooCommerce 产品描述建议 300+ 字，并包含 FAQ（可用工具箱生成）</li>
          <li>• 订单用户 ID 使用 WooCommerce <code>customer_id</code>，访客订单为 <code>guest</code></li>
        </ul>
        <Link
          href="/tools"
          className="mt-4 inline-block text-sm text-blue-400 hover:underline"
        >
          打开 GEO 工具箱 →
        </Link>
      </Card>

      {sites.length > 0 && (
        <p className="text-xs text-slate-500">
          已配置 {sites.length} 个 WordPress/WooCommerce 站点，同步数据可在订单管理与产品 GEO 中查看。
        </p>
      )}
    </div>
  );
}

function ConfigRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-mono text-xs text-blue-200 break-all">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-slate-600">{hint}</dd>}
    </div>
  );
}
