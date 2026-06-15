import assert from "node:assert/strict";
import { auditProduct, auditSite } from "../src/lib/geo/analyzer";

const weakSite = auditSite({
  name: "FanCrafti",
  domain: "fancrafti.com",
  brandVoice: "Handmade resin LED lamps.",
  productCount: 3,
});

const weakPolicyScore = weakSite.checks.find((check) => check.id === "policy-clarity")?.score ?? 0;

const evidencedSite = auditSite({
  name: "FanCrafti",
  domain: "fancrafti.com",
  brandVoice: "Handmade resin LED lamps.",
  productCount: 3,
  pageEvidence: {
    homepageText:
      "FanCrafti makes handmade resin LED lamps for bedroom desks, gamer rooms, collectors, and gift buyers.",
    landingPageText:
      "Pick any 3 handmade resin lamps and save big. Perfect gift for anime fans, gamers, bedroom decor, and collector desks.",
    policyText:
      "Shipping is available worldwide. Returns are accepted within 30 days. Contact support for damaged items.",
    llmsTxtFound: true,
    robotsTxtFound: true,
    sitemapFound: true,
    productSchemaCount: 5,
    productPageCount: 5,
  },
});

assert.ok(evidencedSite.overallScore > weakSite.overallScore);
assert.ok(
  (evidencedSite.checks.find((check) => check.id === "policy-clarity")?.score ?? 0) > weakPolicyScore
);
assert.ok(evidencedSite.actionItems?.every((item) => item.id !== "llms-txt"));
assert.ok(evidencedSite.evidenceItems?.some((item) => item.id === "landing-page" && item.status === "found"));
assert.ok(evidencedSite.evidenceItems?.some((item) => item.id === "llms" && item.status === "found"));
assert.match(
  evidencedSite.checks.find((check) => check.id === "policy-clarity")?.evidence ?? "",
  /Shipping|policy|shipping/i
);
assert.ok(evidencedSite.checks.every((check) => typeof check.evidence === "string" && check.evidence.length > 0));
assert.equal(evidencedSite.checks.find((check) => check.id === "commercial-intent")?.status, "pass");
assert.equal(evidencedSite.checks.find((check) => check.id === "informational-intent")?.status, "pass");
assert.equal(evidencedSite.checks.find((check) => check.id === "long-tail-intent")?.status, "pass");
assert.ok(weakSite.actionItems?.some((item) => item.id === "commercial-intent" || item.id === "long-tail-intent"));

const productWithoutSchema = auditProduct({
  title: "FanCrafti Ocean Resin Lamp",
  description: "Handmade resin LED lamp for bedroom desks.",
  category: "Resin Lamps",
  price: 39.99,
  url: "https://fancrafti.com/products/ocean-resin-lamp",
});

const productWithSchema = auditProduct({
  title: "FanCrafti Ocean Resin Lamp",
  description: "Handmade resin LED lamp for bedroom desks.",
  category: "Resin Lamps",
  price: 39.99,
  url: "https://fancrafti.com/products/ocean-resin-lamp",
  pageText:
    "Handmade resin LED lamp with wood base, USB power, gift-ready packaging, shipping, returns, and customer reviews.",
  hasProductSchema: true,
  hasOfferSchema: true,
  hasAvailability: true,
  hasReviewSignal: true,
});

assert.ok(productWithSchema.overallScore > productWithoutSchema.overallScore);
assert.equal(
  productWithSchema.checks.find((check) => check.id === "product-schema-readiness")?.status,
  "pass"
);

console.log("GEO page evidence tests passed");
