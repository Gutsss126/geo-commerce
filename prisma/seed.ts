import { PrismaClient } from "@prisma/client";
import { auditProduct, auditSite } from "../src/lib/geo/analyzer";
import { generateLlmsTxt } from "../src/lib/geo/generators";
import { generateApiKey } from "../src/lib/api-key";

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.site.upsert({
    where: { domain: "demo-outdoor.com" },
    update: {
      platform: "wordpress",
      wpUrl: "https://demo-outdoor.com",
    },
    create: {
      name: "Demo Outdoor",
      domain: "demo-outdoor.com",
      platform: "wordpress",
      wpUrl: "https://demo-outdoor.com",
      locale: "zh-CN",
      brandVoice: "专业、可信、注重实测数据",
      apiKey: generateApiKey(),
    },
  });

  if (!site.apiKey) {
    await prisma.site.update({
      where: { id: site.id },
      data: { apiKey: generateApiKey() },
    });
  }

  const products = [
    {
      title: "超轻双人帐篷 Pro 2P — 四季露营",
      slug: "ultralight-tent-pro-2p",
      sku: "TENT-PRO-2P",
      category: "户外/帐篷/双人",
      price: 189.99,
      url: "https://demo-outdoor.com/products/ultralight-tent-pro-2p",
      description:
        "重量 1.2kg，防水指数 3000mm。适合徒步与露营。常见问题：是否含地布？答：标配。与入门款相比风绳加固。",
    },
    {
      title: "便携露营炉具套装",
      slug: "camp-stove-kit",
      sku: "STOVE-KIT-01",
      category: "户外/炊具",
      price: 49.99,
      description: "轻便炉头，适合周末露营。",
    },
  ];

  for (const p of products) {
    const report = auditProduct(p);
    await prisma.product.upsert({
      where: { siteId_slug: { siteId: site.id, slug: p.slug } },
      update: {
        geoScore: report.overallScore,
        description: p.description,
        sku: p.sku,
      },
      create: {
        siteId: site.id,
        ...p,
        geoScore: report.overallScore,
        lastAuditAt: new Date(),
      },
    });
    await prisma.geoAudit.create({
      data: {
        siteId: site.id,
        type: "product",
        targetUrl: p.url,
        overallScore: report.overallScore,
        report: JSON.stringify(report),
      },
    });
  }

  const siteReport = auditSite({
    name: site.name,
    domain: site.domain,
    brandVoice: site.brandVoice,
    productCount: products.length,
  });
  await prisma.geoAudit.create({
    data: {
      siteId: site.id,
      type: "site",
      overallScore: siteReport.overallScore,
      report: JSON.stringify(siteReport),
    },
  });

  await prisma.llmsConfig.upsert({
    where: { siteId: site.id },
    update: {},
    create: {
      siteId: site.id,
      content: generateLlmsTxt({
        siteName: site.name,
        domain: site.domain,
        productUrls: products.map((p) => `/products/${p.slug}`),
      }),
    },
  });

  const tent = await prisma.product.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: "ultralight-tent-pro-2p" } },
  });
  const stove = await prisma.product.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: "camp-stove-kit" } },
  });

  await prisma.order.upsert({
    where: { siteId_orderNumber: { siteId: site.id, orderNumber: "ORD-DEMO-10001" } },
    update: {},
    create: {
      siteId: site.id,
      orderNumber: "ORD-DEMO-10001",
      userId: "user_8f3a21bc",
      status: "paid",
      contactName: "张明",
      contactPhone: "+86 13800138000",
      contactEmail: "zhang@example.com",
      shippingCountry: "CN",
      shippingProvince: "浙江省",
      shippingCity: "杭州市",
      shippingAddress: "西湖区文三路 88 号 2 栋 501 室",
      shippingPostalCode: "310000",
      totalAmount: 189.99,
      items: {
        create: [
          {
            sku: "TENT-PRO-2P",
            title: tent?.title ?? "超轻双人帐篷",
            quantity: 1,
            unitPrice: 189.99,
            lineTotal: 189.99,
            productId: tent?.id,
          },
        ],
      },
    },
  });

  await prisma.order.upsert({
    where: { siteId_orderNumber: { siteId: site.id, orderNumber: "ORD-DEMO-10002" } },
    update: {},
    create: {
      siteId: site.id,
      orderNumber: "ORD-DEMO-10002",
      userId: "user_9c12ef45",
      status: "shipped",
      contactName: "Lisa Chen",
      contactPhone: "+1 415-555-0198",
      contactEmail: "lisa@example.com",
      shippingCountry: "US",
      shippingProvince: "CA",
      shippingCity: "San Francisco",
      shippingAddress: "123 Market St, Apt 4B",
      shippingPostalCode: "94103",
      totalAmount: 239.98,
      items: {
        create: [
          {
            sku: "TENT-PRO-2P",
            title: tent?.title ?? "超轻双人帐篷",
            quantity: 1,
            unitPrice: 189.99,
            lineTotal: 189.99,
            productId: tent?.id,
          },
          {
            sku: "STOVE-KIT-01",
            title: stove?.title ?? "便携炉具",
            quantity: 1,
            unitPrice: 49.99,
            lineTotal: 49.99,
            productId: stove?.id,
          },
        ],
      },
    },
  });

  await prisma.citation.createMany({
    data: [
      {
        siteId: site.id,
        engine: "Perplexity",
        query: "best ultralight 2 person tent under $200",
        snippet: "Demo Outdoor Ultralight Tent Pro 2P is cited for 1.2kg weight and 3000mm waterproofing.",
        citedUrl: "https://demo-outdoor.com/products/ultralight-tent-pro-2p",
      },
      {
        siteId: site.id,
        engine: "ChatGPT",
        query: "轻便双人帐篷推荐",
        snippet: "提到超轻双人帐篷 Pro 2P 的风绳加固与标配地布。",
        citedUrl: "https://demo-outdoor.com/products/ultralight-tent-pro-2p",
      },
    ],
  });

  console.log("Seed complete:", site.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
