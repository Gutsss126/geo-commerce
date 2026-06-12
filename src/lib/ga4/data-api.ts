import { createSign } from "node:crypto";
import type { Ga4RealtimeMetrics, Ga4TrafficMetrics } from "./diagnostics";

const scope = "https://www.googleapis.com/auth/analytics.readonly";

export type Ga4DataApiConfig = {
  propertyId?: string;
  clientEmail?: string;
  privateKey?: string;
};

export function normalizeGa4PrivateKey(value: string | undefined) {
  let key = (value ?? "").trim();
  if (key.endsWith(",")) key = key.slice(0, -1).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  if (key.endsWith(",")) key = key.slice(0, -1).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

export function getGa4DataApiConfigFromEnv(): Ga4DataApiConfig {
  return {
    propertyId: process.env.GA4_PROPERTY_ID,
    clientEmail: process.env.GA4_CLIENT_EMAIL,
    privateKey: normalizeGa4PrivateKey(process.env.GA4_PRIVATE_KEY),
  };
}

export function isGa4DataApiConfigured(config: Ga4DataApiConfig) {
  return Boolean(config.propertyId && config.clientEmail && config.privateKey);
}

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(config: Required<Ga4DataApiConfig>) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(config.privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "GA4 token request failed");
  }
  return String(payload.access_token);
}

export async function fetchGa4LandingPageMetrics(
  config: Ga4DataApiConfig,
  landingPath: string
): Promise<Ga4TrafficMetrics> {
  if (!isGa4DataApiConfigured(config)) {
    throw new Error("GA4 Data API is not configured");
  }

  const requiredConfig = config as Required<Ga4DataApiConfig>;
  const accessToken = await getAccessToken(requiredConfig);
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${requiredConfig.propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "conversions" },
          { name: "engagementRate" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "landingPagePlusQueryString",
            stringFilter: {
              matchType: "BEGINS_WITH",
              value: landingPath,
            },
          },
        },
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "GA4 Data API request failed");
  }

  const totals = payload.totals?.[0]?.metricValues ?? [];
  return {
    activeUsers: Number(totals[0]?.value ?? 0),
    sessions: Number(totals[1]?.value ?? 0),
    conversions: Number(totals[2]?.value ?? 0),
    engagementRate: Number(totals[3]?.value ?? 0),
  };
}

export async function fetchGa4LandingPageMetricsWithAccessToken(
  propertyId: string,
  accessToken: string,
  landingPath: string
): Promise<Ga4TrafficMetrics> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "conversions" },
          { name: "engagementRate" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "landingPagePlusQueryString",
            stringFilter: {
              matchType: "BEGINS_WITH",
              value: landingPath,
            },
          },
        },
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "GA4 Data API request failed");
  }

  const totals = payload.totals?.[0]?.metricValues ?? [];
  return {
    activeUsers: Number(totals[0]?.value ?? 0),
    sessions: Number(totals[1]?.value ?? 0),
    conversions: Number(totals[2]?.value ?? 0),
    engagementRate: Number(totals[3]?.value ?? 0),
  };
}

export async function fetchGa4RealtimeMetricsWithAccessToken(
  propertyId: string,
  accessToken: string
): Promise<Ga4RealtimeMetrics> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        metrics: [{ name: "activeUsers" }],
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "GA4 Realtime API request failed");
  }

  const totals = payload.totals?.[0]?.metricValues ?? [];
  const firstRow = payload.rows?.[0]?.metricValues ?? [];
  return {
    activeUsers: Number(totals[0]?.value ?? firstRow[0]?.value ?? 0),
  };
}
