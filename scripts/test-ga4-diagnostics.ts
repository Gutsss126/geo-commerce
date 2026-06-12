import assert from "node:assert/strict";
import {
  buildGa4Diagnostics,
  isValidGa4MeasurementId,
} from "../src/lib/ga4/diagnostics";
import { normalizeGa4PrivateKey } from "../src/lib/ga4/data-api";
import { buildGoogleOAuthUrl, isGoogleOAuthConfigured } from "../src/lib/ga4/oauth";

assert.equal(isValidGa4MeasurementId("G-OSEFCZ24XS"), true);
assert.equal(isValidGa4MeasurementId("UA-123"), false);
assert.equal(
  normalizeGa4PrivateKey('"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",'),
  "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n"
);
assert.equal(
  isGoogleOAuthConfigured({
    clientId: "client-id",
    clientSecret: "secret",
    redirectUri: "http://127.0.0.1:3000/api/integrations/google/oauth/callback",
  }),
  true
);
assert.equal(
  isGoogleOAuthConfigured({
    clientId: "client-id",
    clientSecret: "",
    redirectUri: "http://127.0.0.1:3000/api/integrations/google/oauth/callback",
  }),
  false
);

const oauthUrl = buildGoogleOAuthUrl(
  {
    clientId: "client-id",
    clientSecret: "secret",
    redirectUri: "http://127.0.0.1:3000/api/integrations/google/oauth/callback",
  },
  "state-123"
);
assert.equal(oauthUrl.searchParams.get("access_type"), "offline");
assert.equal(oauthUrl.searchParams.get("prompt"), "consent");
assert.equal(oauthUrl.searchParams.get("scope"), "https://www.googleapis.com/auth/analytics.readonly");

const missingDataApi = buildGa4Diagnostics({
  domain: "fancrafti.com",
  measurementId: "G-OSEFCZ24XS",
  landingPath: "/tiktok/",
  dataApiConfigured: false,
});

assert.equal(missingDataApi.status, "needs_data_api");
assert.equal(missingDataApi.measurementId, "G-OSEFCZ24XS");
assert.equal(missingDataApi.landingPage.url, "https://fancrafti.com/tiktok/");
assert.equal(missingDataApi.checks.some((check) => check.id === "data-api"), true);

const ready = buildGa4Diagnostics({
  domain: "fancrafti.com",
  measurementId: "G-OSEFCZ24XS",
  landingPath: "/tiktok/",
  dataApiConfigured: true,
  metrics: {
    activeUsers: 128,
    sessions: 156,
    conversions: 9,
    engagementRate: 0.62,
  },
  realtime: {
    activeUsers: 2,
  },
  events: [
    { name: "page_view", count: 42, activeUsers: 18 },
    { name: "shop_bundle_click", count: 7, activeUsers: 5 },
    { name: "checkout_click", count: 1, activeUsers: 1 },
  ],
  realtimeEvents: [
    { name: "page_view", count: 3, activeUsers: 2 },
    { name: "shop_bundle_click", count: 1, activeUsers: 1 },
  ],
});

assert.equal(ready.status, "ready");
assert.ok(ready.traffic);
assert.equal(ready.traffic.activeUsers, 128);
assert.equal(ready.traffic.engagementRateLabel, "62.0%");
assert.equal(ready.realtime?.activeUsers, 2);
assert.equal(ready.checks.some((check) => check.id === "realtime"), true);
assert.equal(ready.events.length, 3);
assert.equal(ready.events[1]?.name, "shop_bundle_click");
assert.equal(ready.realtimeEvents.length, 2);
assert.deepEqual(
  ready.funnel.map((step) => [step.id, step.count]),
  [
    ["visit", 42],
    ["primary_click", 7],
    ["cart", 0],
    ["checkout", 1],
  ]
);

console.log("GA4 diagnostics tests passed");
