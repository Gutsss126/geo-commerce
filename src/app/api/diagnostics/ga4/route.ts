import { NextResponse } from "next/server";
import { getGa4Diagnostics } from "@/lib/ga4/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const diagnostics = await getGa4Diagnostics({
    domain: url.searchParams.get("domain"),
    measurementId: url.searchParams.get("measurementId"),
    landingPath: url.searchParams.get("path"),
  });

  return NextResponse.json({ ok: true, diagnostics });
}
