import { BarChart3, CheckCircle2, ExternalLink, KeyRound, TriangleAlert } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getGa4Diagnostics } from "@/lib/ga4/service";
import {
  getGoogleOAuthConfigFromEnv,
  getStoredGa4OAuthCredential,
  isGoogleOAuthConfigured,
} from "@/lib/ga4/oauth";

export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: "pass" | "warn" | "fail" }) {
  const styles = {
    pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };
  const labels = { pass: "正常", warn: "待配置", fail: "异常" };
  return <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>{labels[status]}</span>;
}

function OAuthNotice({ status }: { status?: string }) {
  if (!status) return null;
  const copy: Record<string, string> = {
    connected: "Google Analytics 授权已保存，正在使用 OAuth 自动读取 GA4 数据。",
    missing_config: "缺少 Google OAuth Client ID 或 Client Secret，请先补齐环境变量。",
    denied: "你取消了 Google 授权，GA4 自动读取尚未连接。",
    invalid_state: "OAuth 状态校验失败，请重新点击连接。",
    token_error: "Google OAuth 换取 token 失败，请检查回调地址和 OAuth Client 配置。",
  };
  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <p className="text-sm text-blue-200">{copy[status] ?? "Google OAuth 状态已更新。"}</p>
    </Card>
  );
}

function EventRows({
  events,
  emptyCopy,
}: {
  events: Array<{ name: string; count: number; activeUsers: number }>;
  emptyCopy: string;
}) {
  if (!events.length) {
    return <p className="mt-4 text-sm text-slate-500">{emptyCopy}</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/60 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 text-right font-medium">Count</th>
            <th className="px-3 py-2 text-right font-medium">Users</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {events.map((event) => (
            <tr key={event.name}>
              <td className="px-3 py-2 font-medium text-slate-200">{event.name}</td>
              <td className="px-3 py-2 text-right text-slate-300">{event.count}</td>
              <td className="px-3 py-2 text-right text-slate-300">{event.activeUsers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Ga4DiagnosticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ oauth?: string }>;
}) {
  const [diagnostics, params] = await Promise.all([getGa4Diagnostics(), searchParams]);
  const oauthConfig = getGoogleOAuthConfigFromEnv();
  const oauthConfigured = isGoogleOAuthConfigured(oauthConfig);
  let oauthCredential = null;
  let oauthStoreReady = true;
  if (oauthConfigured) {
    try {
      oauthCredential = await getStoredGa4OAuthCredential();
    } catch {
      oauthStoreReady = false;
    }
  }
  const ready = diagnostics.status === "ready";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">GA4 流量诊断</h1>
          <p className="mt-1 text-slate-400">
            面向 fancrafti.com 的自动化诊断：优先用 Google OAuth 读取 /tiktok/ 近 28 天流量。
          </p>
        </div>
        <a
          href="/api/diagnostics/ga4"
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/10"
        >
          API
          <ExternalLink className="h-4 w-4" />
        </a>
      </header>

      <OAuthNotice status={params?.oauth} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-300" />
              <CardTitle>Google OAuth 自动读取</CardTitle>
            </div>
            <CardDescription>
              不使用服务账号 JSON key；用你的 Google 登录授权读取 GA4，只保存 refresh token。
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={oauthCredential ? "pass" : oauthConfigured ? "warn" : "fail"} />
            <a
              href="/api/integrations/google/oauth/start"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              {oauthCredential ? "重新授权" : "连接 Google Analytics"}
            </a>
          </div>
        </div>
        {!oauthConfigured && (
          <p className="mt-3 text-xs text-amber-300">
            需要先在 .env 配置 GOOGLE_OAUTH_CLIENT_ID 和 GOOGLE_OAUTH_CLIENT_SECRET。
          </p>
        )}
        {!oauthStoreReady && (
          <p className="mt-3 text-xs text-amber-300">
            OAuth token 表还没有同步到数据库，请先运行 npx prisma db push。
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardDescription>站点</CardDescription>
          <CardTitle className="mt-2 text-base">{diagnostics.domain}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Measurement ID</CardDescription>
          <CardTitle className="mt-2 text-base">{diagnostics.measurementId ?? "未配置"}</CardTitle>
        </Card>
        <Card>
          <CardDescription>落地页</CardDescription>
          <CardTitle className="mt-2 text-base">{diagnostics.landingPage.path}</CardTitle>
        </Card>
        <Card>
          <CardDescription>读取状态</CardDescription>
          <CardTitle className="mt-2 flex items-center gap-2 text-base">
            {ready ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            ) : (
              <TriangleAlert className="h-4 w-4 text-amber-300" />
            )}
            {ready ? "已接入" : "待授权/待配置"}
          </CardTitle>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-300" />
          <CardTitle>GA4 实时反馈</CardTitle>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Active users last 30 min</p>
            <p className="mt-1 text-2xl font-semibold">
              {diagnostics.realtime?.activeUsers ?? "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Check method</p>
            <p className="mt-1 text-sm text-slate-300">
              打开 https://fancrafti.com/tiktok/ 后等待 1-3 分钟，再刷新本页。
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardTitle>落地页动作漏斗</CardTitle>
          <CardDescription>基于近 28 天 GA4 事件，先看用户是否从访问走向点击与结账意图。</CardDescription>
          <div className="mt-4 space-y-3">
            {diagnostics.funnel.map((step, index) => (
              <div key={step.id} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Step {index + 1}</p>
                    <p className="font-medium">{step.label}</p>
                  </div>
                  <p className="text-2xl font-semibold">{step.count}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>实时用户动作</CardTitle>
          <CardDescription>最近 30 分钟事件，用来确认投放访问和按钮点击是否正在发生。</CardDescription>
          <EventRows events={diagnostics.realtimeEvents} emptyCopy="暂时没有实时事件；打开落地页并点击按钮后刷新本页。" />
        </Card>
      </div>

      {diagnostics.traffic && (
        <Card>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-300" />
            <CardTitle>近 28 天 /tiktok/ 流量</CardTitle>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Active users</p>
              <p className="mt-1 text-2xl font-semibold">{diagnostics.traffic.activeUsers}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="mt-1 text-2xl font-semibold">{diagnostics.traffic.sessions}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conversions</p>
              <p className="mt-1 text-2xl font-semibold">{diagnostics.traffic.conversions}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Engagement rate</p>
              <p className="mt-1 text-2xl font-semibold">{diagnostics.traffic.engagementRateLabel}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>近 28 天事件排行</CardTitle>
        <CardDescription>GA4 按事件名汇总 /tiktok/ 落地页动作，后续按钮点击事件会出现在这里。</CardDescription>
        <EventRows events={diagnostics.events} emptyCopy="暂时没有可展示的历史事件；GA4 标准报表同步后会逐步出现。" />
      </Card>

      <Card>
        <CardTitle>诊断检查</CardTitle>
        <ul className="mt-4 space-y-3">
          {diagnostics.checks.map((check) => (
            <li key={check.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{check.label}</p>
                <StatusPill status={check.status} />
              </div>
              <p className="mt-2 text-sm text-slate-300">{check.message}</p>
              <p className="mt-1 text-xs text-slate-500">{check.recommendation}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>OAuth 配置</CardTitle>
        <CardDescription>
          在 Google Cloud 的 OAuth Client 里，把下面的 callback 地址加入 Authorized redirect URIs。
        </CardDescription>
        <pre className="mt-4 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
{`GOOGLE_OAUTH_CLIENT_ID=你的 Web OAuth Client ID
GOOGLE_OAUTH_CLIENT_SECRET=你的 Web OAuth Client Secret
GOOGLE_OAUTH_REDIRECT_URI=${oauthConfig.redirectUri}
GA4_PROPERTY_ID=541416618
GA4_MEASUREMENT_ID=${diagnostics.measurementId ?? "G-XZ96E6XHMY"}`}
        </pre>
      </Card>
    </div>
  );
}
