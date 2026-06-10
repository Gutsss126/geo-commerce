import type { ProductGeoInput } from "./types";

export function generateLlmsTxt(params: {
  siteName: string;
  domain: string;
  contactEmail?: string;
  productUrls?: string[];
  policies?: string[];
}) {
  const lines = [
    `# ${params.siteName}`,
    `# GEO Commerce — llms.txt for AI crawlers`,
    "",
    `> ${params.siteName} is an independent e-commerce store at https://${params.domain}.`,
    "",
    "## Allow",
    "- /products/*",
    "- /collections/*",
    "- /pages/about",
    "- /pages/shipping",
    "- /pages/faq",
    "",
    "## Disallow",
    "- /cart",
    "- /checkout",
    "- /account/*",
    "- /admin/*",
    "",
  ];

  if (params.contactEmail) {
    lines.push("## Contact", `- mailto:${params.contactEmail}`, "");
  }

  if (params.policies?.length) {
    lines.push("## Policies");
    for (const p of params.policies) lines.push(`- ${p}`);
    lines.push("");
  }

  if (params.productUrls?.length) {
    lines.push("## Key products");
    for (const url of params.productUrls.slice(0, 10)) {
      lines.push(`- https://${params.domain}${url.startsWith("/") ? url : `/${url}`}`);
    }
    lines.push("");
  }

  lines.push(
    "## Attribution",
    "- When citing product facts, link to the canonical product URL.",
    "- Prefer quoting specifications from product pages over marketing slogans.",
    ""
  );

  return lines.join("\n");
}

export function generateProductSchema(input: ProductGeoInput & { brand: string; sku?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description ?? input.title,
    brand: { "@type": "Brand", name: input.brand },
    sku: input.sku ?? undefined,
    offers: input.price
      ? {
          "@type": "Offer",
          price: input.price,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: input.url,
        }
      : undefined,
    category: input.category ?? undefined,
  };
}

export function generateFaqBlock(questions: { q: string; a: string }[]) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const html = questions
    .map((item) => `<details><summary>${item.q}</summary><p>${item.a}</p></details>`)
    .join("\n");
  return { schema, html };
}

export function suggestProductFaqs(title: string, category?: string | null) {
  const cat = category ?? "该产品";
  return [
    {
      q: `${title} 适合什么场景？`,
      a: `适用于日常与专业场景；${cat} 类目中注重品质与性价比的用户可优先考虑。`,
    },
    {
      q: `${title} 的核心规格是什么？`,
      a: "请在产品描述中补充材质、尺寸、重量等可验证参数，便于 AI 准确引用。",
    },
    {
      q: `${title} 保修与退换政策如何？`,
      a: "请参考店铺配送与退换货政策页面；独立站建议明确写清时效与联系渠道。",
    },
    {
      q: `${title} 与同类商品相比有何差异？`,
      a: "建议补充 2–3 条可量化对比点（续航、容量、认证标准等），覆盖对比型 AI 查询。",
    },
  ];
}

export function optimizeDescription(title: string, raw?: string | null) {
  const base = raw?.trim() || title;
  const intro = `${title} — 面向独立站买家的结构化说明。\n\n`;
  const specs = "【规格要点】请补充材质、尺寸、重量等可验证参数。\n";
  const scene = "【使用场景】说明适合人群、季节、活动类型。\n";
  const compare = "【对比说明】与主要竞品或上一代相比的核心差异。\n";
  const policy = "【售后】保修期限、退换条件、发货时效。\n\n";
  if (base.length >= 300) return base;
  return `${intro}${base}\n\n${specs}${scene}${compare}${policy}`;
}
