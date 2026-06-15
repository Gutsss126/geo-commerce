import assert from "node:assert/strict";
import { parsePageSpeedResult, summarizePageExperience } from "../src/lib/geo/page-experience";

const payload = {
  lighthouseResult: {
    fetchTime: "2026-06-15T12:00:00.000Z",
    categories: {
      performance: { score: 0.72 },
      accessibility: { score: 0.91 },
      "best-practices": { score: 0.86 },
      seo: { score: 0.93 },
    },
    audits: {
      "largest-contentful-paint": {
        title: "Largest Contentful Paint",
        score: 0.42,
        displayValue: "4.2 s",
      },
      "cumulative-layout-shift": {
        title: "Cumulative Layout Shift",
        score: 0.95,
        displayValue: "0.02",
      },
      "total-blocking-time": {
        title: "Total Blocking Time",
        score: 0.68,
        displayValue: "280 ms",
      },
    },
  },
};

const result = parsePageSpeedResult("https://fancrafti.com/tiktok/", payload);

assert.equal(result.status, "warn");
assert.equal(result.url, "https://fancrafti.com/tiktok/");
assert.equal(result.categories.performance.score, 72);
assert.equal(result.categories.performance.status, "warn");
assert.equal(result.categories.accessibility.score, 91);
assert.equal(result.categories.accessibility.status, "pass");
assert.ok(result.topRisks.some((risk) => risk.includes("Largest Contentful Paint")));

const summary = summarizePageExperience([result]);
assert.equal(summary.status, "warn");
assert.equal(summary.passCount, 2);
assert.equal(summary.metricCount, 4);

const unavailable = parsePageSpeedResult("https://fancrafti.com/", {});
assert.equal(unavailable.status, "unavailable");
assert.equal(unavailable.categories.performance.score, null);

console.log("Page experience tests passed");
