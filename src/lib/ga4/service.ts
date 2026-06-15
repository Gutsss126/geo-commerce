import { buildGa4Diagnostics } from "./diagnostics";
import {
  fetchGa4LandingPageEventsWithAccessToken,
  fetchGa4LandingPageMetrics,
  fetchGa4LandingPageMetricsWithAccessToken,
  fetchGa4RealtimeEventsWithAccessToken,
  fetchGa4RealtimeMetricsWithAccessToken,
  getGa4DataApiConfigFromEnv,
  isGa4DataApiConfigured,
} from "./data-api";
import {
  getGoogleOAuthConfigFromEnv,
  getStoredGa4OAuthCredential,
  isGoogleOAuthConfigured,
  refreshGoogleOAuthAccessToken,
} from "./oauth";

const defaultDomain = "fancrafti.com";
const defaultMeasurementId = "G-XZ96E6XHMY";
const defaultLandingPath = "/tiktok/";

export type GetGa4DiagnosticsOptions = {
  domain?: string | null;
  measurementId?: string | null;
  landingPath?: string | null;
  propertyId?: string | null;
};

export async function getGa4Diagnostics(options: GetGa4DiagnosticsOptions = {}) {
  const domain = options.domain?.trim() || process.env.GA4_DOMAIN || defaultDomain;
  const measurementId =
    options.measurementId?.trim() ||
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
    defaultMeasurementId;
  const landingPath = options.landingPath?.trim() || process.env.GA4_LANDING_PATH || defaultLandingPath;
  const dataApiConfig = getGa4DataApiConfigFromEnv();
  const propertyId = options.propertyId?.trim() || dataApiConfig.propertyId;
  const effectiveDataApiConfig = { ...dataApiConfig, propertyId };
  const dataApiConfigured = isGa4DataApiConfigured(effectiveDataApiConfig);
  const oauthConfig = getGoogleOAuthConfigFromEnv();
  const oauthConfigured = isGoogleOAuthConfigured(oauthConfig);
  let oauthCredential = null;
  if (oauthConfigured) {
    try {
      oauthCredential = await getStoredGa4OAuthCredential();
    } catch {
      oauthCredential = null;
    }
  }

  if (oauthCredential && propertyId) {
    try {
      const accessToken =
        oauthCredential.accessToken &&
        oauthCredential.expiresAt &&
        oauthCredential.expiresAt.getTime() > Date.now() + 60_000
          ? oauthCredential.accessToken
          : await refreshGoogleOAuthAccessToken(oauthCredential.refreshToken, oauthConfig);
      if (!accessToken) {
        throw new Error("Google OAuth did not return an access token");
      }
      const metrics = await fetchGa4LandingPageMetricsWithAccessToken(
        propertyId,
        accessToken,
        landingPath
      );
      const realtime = await fetchGa4RealtimeMetricsWithAccessToken(propertyId, accessToken).catch(
        () => null
      );
      const events = await fetchGa4LandingPageEventsWithAccessToken(
        propertyId,
        accessToken,
        landingPath
      ).catch(() => null);
      const realtimeEvents = await fetchGa4RealtimeEventsWithAccessToken(
        propertyId,
        accessToken
      ).catch(() => null);
      return buildGa4Diagnostics({
        domain,
        measurementId,
        landingPath,
        dataApiConfigured: true,
        metrics,
        realtime,
        events,
        realtimeEvents,
      });
    } catch (error) {
      return buildGa4Diagnostics({
        domain,
        measurementId,
        landingPath,
        dataApiConfigured: true,
        dataApiError: error instanceof Error ? error.message : "GA4 OAuth Data API request failed",
      });
    }
  }

  if (!dataApiConfigured) {
    return buildGa4Diagnostics({
      domain,
      measurementId,
      landingPath,
      dataApiConfigured,
    });
  }

  try {
    const metrics = await fetchGa4LandingPageMetrics(effectiveDataApiConfig, landingPath);
    return buildGa4Diagnostics({
      domain,
      measurementId,
      landingPath,
      dataApiConfigured,
      metrics,
    });
  } catch (error) {
    return buildGa4Diagnostics({
      domain,
      measurementId,
      landingPath,
      dataApiConfigured,
      dataApiError: error instanceof Error ? error.message : "GA4 Data API request failed",
    });
  }
}
