import { prisma } from "@/lib/db";

export async function authenticateWordPressRequest(req: Request) {
  const apiKey = req.headers.get("x-geo-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!apiKey) return { ok: false as const, error: "Missing X-GEO-API-Key header", status: 401 };

  const site = await prisma.site.findFirst({
    where: { apiKey, platform: { in: ["wordpress", "woocommerce"] } },
  });
  if (!site) return { ok: false as const, error: "Invalid API key or site not configured for WordPress", status: 403 };

  return { ok: true as const, site };
}
