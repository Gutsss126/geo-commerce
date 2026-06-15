import assert from "node:assert/strict";
import {
  getSiteConfigStatus,
  normalizeSiteLandingPath,
  resolveSiteAuditConfig,
} from "../src/lib/site-config";

assert.equal(normalizeSiteLandingPath("tiktok"), "/tiktok/");
assert.equal(normalizeSiteLandingPath("/tiktok"), "/tiktok/");
assert.equal(normalizeSiteLandingPath("/tiktok/"), "/tiktok/");
assert.equal(normalizeSiteLandingPath(""), "/tiktok/");

const config = resolveSiteAuditConfig({
  domain: "https://fancrafti.com/",
  landingPath: "tiktok",
  ga4MeasurementId: " G-XZ96E6XHMY ",
  ga4PropertyId: " 541416618 ",
  ga4Status: "partial",
});

assert.deepEqual(config, {
  domain: "fancrafti.com",
  landingPath: "/tiktok/",
  ga4MeasurementId: "G-XZ96E6XHMY",
  ga4PropertyId: "541416618",
  ga4Status: "configured",
});

assert.deepEqual(
  getSiteConfigStatus({
    domain: "fancrafti.com",
    landingPath: "/tiktok/",
    ga4MeasurementId: "G-XZ96E6XHMY",
    ga4PropertyId: "541416618",
  }),
  {
    landingPage: "ready",
    ga4Tracking: "ready",
    ga4Reporting: "ready",
  },
);

assert.deepEqual(
  getSiteConfigStatus({
    domain: "fancrafti.com",
    landingPath: "/",
    ga4MeasurementId: "G-XZ96E6XHMY",
    ga4PropertyId: null,
  }),
  {
    landingPage: "ready",
    ga4Tracking: "ready",
    ga4Reporting: "missing",
  },
);

console.log("Site config checks passed");
