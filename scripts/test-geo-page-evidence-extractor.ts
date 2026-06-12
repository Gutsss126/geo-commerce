import assert from "node:assert/strict";
import { extractJsonLdSignals, htmlToReadableText, resolveSiteUrl } from "../src/lib/geo/page-evidence";

const html = `
  <html>
    <head>
      <title>FanCrafti Ocean Lamp</title>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Ocean Resin Lamp",
          "review": { "@type": "Review", "reviewRating": { "ratingValue": "5" } },
          "offers": {
            "@type": "Offer",
            "price": "39.99",
            "availability": "https://schema.org/InStock"
          }
        }
      </script>
    </head>
    <body>
      <nav>Menu</nav>
      <h1>Handmade Resin LED Lamp</h1>
      <p>Perfect gift for anime fans and bedroom desks.</p>
      <script>console.log("ignore");</script>
      <style>body { color: red; }</style>
    </body>
  </html>
`;

const text = htmlToReadableText(html);
assert.match(text, /Handmade Resin LED Lamp/);
assert.match(text, /Perfect gift/);
assert.doesNotMatch(text, /console/);
assert.doesNotMatch(text, /color: red/);

const signals = extractJsonLdSignals(html);
assert.equal(signals.productSchemaCount, 1);
assert.equal(signals.hasProductSchema, true);
assert.equal(signals.hasOfferSchema, true);
assert.equal(signals.hasAvailability, true);
assert.equal(signals.hasReviewSignal, true);

assert.equal(resolveSiteUrl("fancrafti.com", "/tiktok/"), "https://fancrafti.com/tiktok/");
assert.equal(resolveSiteUrl("https://fancrafti.com/", "robots.txt"), "https://fancrafti.com/robots.txt");

console.log("GEO page evidence extractor tests passed");
