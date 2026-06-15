import assert from "node:assert/strict";
import { extractJsonLdSignals, extractSeoSignals, htmlToReadableText, resolveSiteUrl } from "../src/lib/geo/page-evidence";

const html = `
  <html>
    <head>
      <title>FanCrafti Ocean Lamp</title>
      <meta name="description" content="Handmade resin LED lamps for anime fans and bedroom desks." />
      <link rel="canonical" href="https://fancrafti.com/tiktok/" />
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
      <a href="/shop/">Shop</a>
      <a href="https://fancrafti.com/products/ocean-lamp">Ocean Lamp</a>
      <a href="https://example.com/offsite">External</a>
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

const seo = extractSeoSignals(html, "https://fancrafti.com/tiktok/");
assert.equal(seo.title, "FanCrafti Ocean Lamp");
assert.equal(seo.metaDescription, "Handmade resin LED lamps for anime fans and bedroom desks.");
assert.equal(seo.canonical, "https://fancrafti.com/tiktok/");
assert.equal(seo.internalLinkCount, 2);

assert.equal(resolveSiteUrl("fancrafti.com", "/tiktok/"), "https://fancrafti.com/tiktok/");
assert.equal(resolveSiteUrl("https://fancrafti.com/", "robots.txt"), "https://fancrafti.com/robots.txt");

console.log("GEO page evidence extractor tests passed");
