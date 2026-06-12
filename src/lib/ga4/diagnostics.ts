export type Ga4TrafficMetrics = {
  activeUsers: number;
  sessions: number;
  conversions: number;
  engagementRate: number;
};

export type Ga4DiagnosticCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  recommendation: string;
};

export type Ga4DiagnosticsInput = {
  domain: string;
  measurementId?: string | null;
  landingPath: string;
  dataApiConfigured: boolean;
  metrics?: Ga4TrafficMetrics | null;
  dataApiError?: string | null;
};

export type Ga4Diagnostics = {
  domain: string;
  measurementId: string | null;
  status:
    | "missing_measurement_id"
    | "invalid_measurement_id"
    | "needs_data_api"
    | "data_unavailable"
    | "ready";
  landingPage: {
    path: string;
    url: string;
  };
  traffic: (Ga4TrafficMetrics & { engagementRateLabel: string }) | null;
  checks: Ga4DiagnosticCheck[];
  generatedAt: string;
};

export function isValidGa4MeasurementId(value: string | null | undefined) {
  return /^G-[A-Z0-9]{6,}$/.test((value ?? "").trim());
}

export function normalizeLandingPath(value: string) {
  const trimmed = value.trim() || "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function buildGa4Diagnostics(input: Ga4DiagnosticsInput): Ga4Diagnostics {
  const domain = input.domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const measurementId = input.measurementId?.trim() || null;
  const landingPath = normalizeLandingPath(input.landingPath);
  const checks: Ga4DiagnosticCheck[] = [];

  const measurementValid = isValidGa4MeasurementId(measurementId);
  checks.push({
    id: "measurement-id",
    label: "GA4 Measurement ID",
    status: measurementValid ? "pass" : measurementId ? "fail" : "warn",
    message: measurementId
      ? `${measurementId} ${measurementValid ? "格式正确" : "格式不正确"}`
      : "尚未配置 GA4 Measurement ID",
    recommendation: "fancrafti.com 当前应使用 G-OSEFCZ24XS，并确认 /tiktok/ 页面已加载同一个 ID。",
  });

  checks.push({
    id: "landing-page",
    label: "落地页",
    status: landingPath === "/tiktok/" ? "pass" : "warn",
    message: `诊断路径: ${landingPath}`,
    recommendation: "TikTok 投放诊断优先观察 /tiktok/ 的访问、参与度与转化事件。",
  });

  checks.push({
    id: "data-api",
    label: "GA4 Data API",
    status: input.dataApiConfigured ? "pass" : "warn",
    message: input.dataApiConfigured ? "已配置读取参数" : "缺少 Property ID 或服务账号环境变量",
    recommendation:
      "安全 MVP 不在数据库保存 Google 凭证；请通过 GA4_PROPERTY_ID、GA4_CLIENT_EMAIL、GA4_PRIVATE_KEY 配置读取权限。",
  });

  if (input.dataApiError) {
    checks.push({
      id: "data-api-error",
      label: "数据读取",
      status: "fail",
      message: input.dataApiError,
      recommendation: "检查服务账号是否已加入 GA4 Property，并授予 Viewer 以上权限。",
    });
  }

  if (input.metrics) {
    checks.push({
      id: "traffic",
      label: "流量信号",
      status: input.metrics.activeUsers > 0 || input.metrics.sessions > 0 ? "pass" : "warn",
      message: `近 28 天 ${input.metrics.sessions} sessions，${input.metrics.activeUsers} active users`,
      recommendation: "若 sessions 有量但 conversions 为 0，请检查 GA4 conversion/key event 标记。",
    });
  }

  const status = !measurementId
    ? "missing_measurement_id"
    : !measurementValid
      ? "invalid_measurement_id"
      : input.dataApiError
        ? "data_unavailable"
        : !input.dataApiConfigured
          ? "needs_data_api"
          : "ready";

  return {
    domain,
    measurementId,
    status,
    landingPage: {
      path: landingPath,
      url: `https://${domain}${landingPath}`,
    },
    traffic: input.metrics
      ? {
          ...input.metrics,
          engagementRateLabel: `${(input.metrics.engagementRate * 100).toFixed(1)}%`,
        }
      : null,
    checks,
    generatedAt: new Date().toISOString(),
  };
}
