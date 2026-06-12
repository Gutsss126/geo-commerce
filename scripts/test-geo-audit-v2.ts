import assert from "node:assert/strict";
import { auditProduct, auditSite } from "../src/lib/geo/analyzer";

const siteReport = auditSite({
  name: "FanCrafti",
  domain: "fancrafti.com",
  brandVoice: "Handmade resin LED lamps for fandom desks, bedrooms, and gift buyers.",
  productCount: 12,
});

assert.equal(siteReport.version, "2.0");
assert.equal(siteReport.sections?.length, 4);
assert.equal(siteReport.sections?.[0]?.id, "site-understanding");
assert.equal(siteReport.sections?.[1]?.id, "commerce-readability");
assert.equal(siteReport.sections?.[2]?.id, "ai-recommendation-readiness");
assert.equal(siteReport.sections?.[3]?.id, "measurement-loop");
assert.ok(siteReport.actionItems?.length);
assert.equal(siteReport.actionItems?.[0]?.priority, "high");
assert.match(siteReport.summary, /GEO Audit 2\.0/);

const weakProductReport = auditProduct({
  title: "Lamp",
  description: "Nice handmade lamp.",
  category: null,
  price: null,
  url: null,
});

assert.equal(weakProductReport.version, "2.0");
assert.ok(weakProductReport.sections?.some((section) => section.id === "commerce-readability"));
assert.ok(weakProductReport.actionItems?.some((item) => item.id === "product-schema-readiness"));
assert.ok(weakProductReport.overallScore < 70);

const strongProductReport = auditProduct({
  title: "FanCrafti Handmade Resin LED Ocean Lamp for Bedroom Desk Gift",
  description:
    "Handmade resin LED lamp with ocean scene, wood base, USB power, 18 cm height, gift-ready packaging, bedroom and gaming desk use. FAQ: Is it handmade? Yes. Shipping and returns are available. Compared with mass-produced lamps, each piece has a unique resin pattern.",
  category: "Handmade Resin LED Lamps",
  price: 39.99,
  url: "https://fancrafti.com/products/ocean-resin-led-lamp",
});

assert.ok(strongProductReport.overallScore > weakProductReport.overallScore);
assert.equal(strongProductReport.sections?.length, 4);

console.log("GEO Audit 2.0 tests passed");
