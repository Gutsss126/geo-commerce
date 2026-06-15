import { NextResponse } from "next/server";
import { getGa4Diagnostics } from "@/lib/ga4/service";
import { prisma } from "@/lib/db";
import { resolveSiteAuditConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  const site = siteId
    ? await prisma.site.findUnique({ where: { id: siteId } })
    : await prisma.site.findFirst({ orderBy: { createdAt: "desc" } });
  const siteConfig = site ? resolveSiteAuditConfig(site) : null;
  const diagnostics = await getGa4Diagnostics({
    domain: url.searchParams.get("domain") ?? siteConfig?.domain,
    measurementId: url.searchParams.get("measurementId") ?? siteConfig?.ga4MeasurementId,
    landingPath: url.searchParams.get("path") ?? siteConfig?.landingPath,
    propertyId: url.searchParams.get("propertyId") ?? siteConfig?.ga4PropertyId,
  });

  return NextResponse.json({ ok: true, diagnostics });
}
