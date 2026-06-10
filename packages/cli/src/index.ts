#!/usr/bin/env npx tsx
/**
 * GEO Commerce CLI — 可在 CI 或本地对独立站运行 GEO 检查
 *
 * Usage:
 *   npm run cli -- audit:product --title "..." --desc "..."
 *   npm run cli -- audit:site --name "Brand" --domain example.com
 *   npm run cli -- llms --name "Brand" --domain example.com
 *   npm run cli -- schema --title "Product" --brand "Brand" --price 99
 */

import { auditProduct, auditSite } from "../../../src/lib/geo/analyzer";
import {
  generateLlmsTxt,
  generateProductSchema,
  optimizeDescription,
} from "../../../src/lib/geo/generators";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  let cmd = argv[0] ?? "help";
  for (let i = 1; i < argv.length; i++) {
    if (argv[i]?.startsWith("--")) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] ?? "true";
      i++;
    }
  }
  return { cmd, args };
}

const { cmd, args } = parseArgs(process.argv.slice(2));

function printJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

switch (cmd) {
  case "audit:product": {
    const report = auditProduct({
      title: args.title ?? "",
      description: args.desc ?? args.description,
      category: args.category,
      price: args.price ? Number(args.price) : undefined,
      url: args.url,
    });
    printJson(report);
    process.exit(report.overallScore >= 60 ? 0 : 1);
    break;
  }
  case "audit:site": {
    const report = auditSite({
      name: args.name ?? "",
      domain: args.domain ?? "",
      brandVoice: args.voice,
      productCount: args.products ? Number(args.products) : 0,
    });
    printJson(report);
    break;
  }
  case "llms": {
    const text = generateLlmsTxt({
      siteName: args.name ?? "Store",
      domain: args.domain ?? "example.com",
      contactEmail: args.email,
    });
    console.log(text);
    break;
  }
  case "schema": {
    printJson(
      generateProductSchema({
        title: args.title ?? "Product",
        description: args.desc,
        brand: args.brand ?? "Brand",
        price: args.price ? Number(args.price) : undefined,
        url: args.url,
        category: args.category,
        sku: args.sku,
      })
    );
    break;
  }
  case "optimize:desc": {
    console.log(optimizeDescription(args.title ?? "", args.desc));
    break;
  }
  default:
    console.log(`GEO Commerce CLI

Commands:
  audit:product  --title "..." [--desc "..."] [--category "..."] [--price 99] [--url ...]
  audit:site     --name "..." --domain example.com [--voice "..."] [--products 10]
  llms           --name "..." --domain example.com [--email hello@example.com]
  schema         --title "..." --brand "..." [--price 99] [--url ...]
  optimize:desc  --title "..." [--desc "..."]
`);
}
