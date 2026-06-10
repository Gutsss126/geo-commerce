/**
 * 为 https://fancrafti.com/ 预置 WordPress 站点（可重复执行）
 * 运行: npx tsx scripts/seed-fancrafti.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateApiKey } from "../src/lib/api-key";
import { generateLlmsTxt } from "../src/lib/geo/generators";

const prisma = new PrismaClient();

const DOMAIN = "fancrafti.com";
const WP_URL = "https://fancrafti.com";

async function main() {
  const existing = await prisma.site.findUnique({ where: { domain: DOMAIN } });

  const site = await prisma.site.upsert({
    where: { domain: DOMAIN },
    update: {
      platform: "wordpress",
      wpUrl: WP_URL,
      name: "FanCrafti",
    },
    create: {
      name: "FanCrafti",
      domain: DOMAIN,
      platform: "wordpress",
      wpUrl: WP_URL,
      locale: "en-US",
      brandVoice: "Creative craft supplies — clear, trustworthy product facts for AI search",
      apiKey: generateApiKey(),
    },
  });

  if (!site.apiKey) {
    await prisma.site.update({
      where: { id: site.id },
      data: { apiKey: generateApiKey() },
    });
  }

  const refreshed = await prisma.site.findUniqueOrThrow({ where: { domain: DOMAIN } });

  const llms = generateLlmsTxt({
    siteName: refreshed.name,
    domain: DOMAIN,
    contactEmail: `hello@${DOMAIN}`,
    policies: [
      `https://${DOMAIN}/shipping-policy/`,
      `https://${DOMAIN}/refund-policy/`,
      `https://${DOMAIN}/privacy-policy/`,
    ],
  });

  await prisma.llmsConfig.upsert({
    where: { siteId: refreshed.id },
    update: { content: llms },
    create: { siteId: refreshed.id, content: llms },
  });

  console.log("\n✓ FanCrafti 站点已就绪\n");
  console.log("  站点 ID:", refreshed.id);
  console.log("  域名:   ", DOMAIN);
  console.log("  WP:     ", WP_URL);
  console.log("  API Key:", refreshed.apiKey);
  console.log("\n  WordPress 插件 → GEO API 地址填你的公网后台，例如:");
  console.log("  https://geo.fancrafti.com");
  console.log("  （或 Vercel 部署地址，见 docs/fancrafti-production.md）\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
