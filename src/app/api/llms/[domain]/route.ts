import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateLlmsTxt } from "@/lib/geo/generators";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;
  const site = await prisma.site.findUnique({
    where: { domain },
    include: { llmsConfig: true, products: { take: 10 } },
  });

  if (!site) {
    return new NextResponse("Site not found", { status: 404 });
  }

  const content =
    site.llmsConfig?.content ??
    generateLlmsTxt({
      siteName: site.name,
      domain: site.domain,
      productUrls: site.products.map((p) => p.url ?? `/products/${p.slug}`),
    });

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
