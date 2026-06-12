import { prisma } from "@/lib/db";

export const googleAnalyticsReadonlyScope = "https://www.googleapis.com/auth/analytics.readonly";
export const ga4OAuthCredentialId = "default";

export type GoogleOAuthConfig = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export function getGoogleOAuthConfigFromEnv(): GoogleOAuthConfig {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "http://127.0.0.1:3000";

  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      `${baseUrl}/api/integrations/google/oauth/callback`,
  };
}

export function isGoogleOAuthConfigured(config: GoogleOAuthConfig) {
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function buildGoogleOAuthUrl(config: GoogleOAuthConfig, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId ?? "");
  url.searchParams.set("redirect_uri", config.redirectUri ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleAnalyticsReadonlyScope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url;
}

async function parseTokenResponse(response: Response) {
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Google OAuth token request failed");
  }
  if (!payload.access_token) {
    throw new Error("Google OAuth response did not include an access token");
  }
  return payload;
}

function getExpiresAt(expiresIn: number | undefined) {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

export async function exchangeGoogleOAuthCode(code: string, config = getGoogleOAuthConfigFromEnv()) {
  if (!isGoogleOAuthConfigured(config)) {
    throw new Error("Google OAuth is not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId ?? "",
      client_secret: config.clientSecret ?? "",
      redirect_uri: config.redirectUri ?? "",
      grant_type: "authorization_code",
    }),
  });

  const payload = await parseTokenResponse(response);
  const existing = await prisma.ga4OAuthCredential.findUnique({
    where: { id: ga4OAuthCredentialId },
  });
  const refreshToken = payload.refresh_token || existing?.refreshToken;

  if (!refreshToken) {
    throw new Error("Google OAuth response did not include a refresh token");
  }

  await prisma.ga4OAuthCredential.upsert({
    where: { id: ga4OAuthCredentialId },
    create: {
      id: ga4OAuthCredentialId,
      refreshToken,
      accessToken: payload.access_token,
      expiresAt: getExpiresAt(payload.expires_in),
      scope: payload.scope,
      tokenType: payload.token_type,
    },
    update: {
      refreshToken,
      accessToken: payload.access_token,
      expiresAt: getExpiresAt(payload.expires_in),
      scope: payload.scope,
      tokenType: payload.token_type,
    },
  });
}

export async function getStoredGa4OAuthCredential() {
  return prisma.ga4OAuthCredential.findUnique({ where: { id: ga4OAuthCredentialId } });
}

export async function refreshGoogleOAuthAccessToken(
  refreshToken: string,
  config = getGoogleOAuthConfigFromEnv()
) {
  if (!isGoogleOAuthConfigured(config)) {
    throw new Error("Google OAuth is not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId ?? "",
      client_secret: config.clientSecret ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = await parseTokenResponse(response);
  await prisma.ga4OAuthCredential.update({
    where: { id: ga4OAuthCredentialId },
    data: {
      accessToken: payload.access_token,
      expiresAt: getExpiresAt(payload.expires_in),
      scope: payload.scope,
      tokenType: payload.token_type,
    },
  });
  return payload.access_token;
}
