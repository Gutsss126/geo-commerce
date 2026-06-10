import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateProductSchema } from "@/lib/geo/generators";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  const domain = new URL(req.url).searchParams.get("domain");

  if (!slug || !domain) {
    return NextResponse.json({ error: "slug and domain required" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { domain } });
  if (!site) return NextResponse.json({ error: "site not found" }, { status: 404 });

  const product = await prisma.product.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const schema = generateProductSchema({
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.price,
    url: product.url,
    brand: site.name,
    sku: product.slug,
  });

  return NextResponse.json(schema);
}
