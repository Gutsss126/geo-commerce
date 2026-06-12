import { NextResponse } from "next/server";
import { z } from "zod";
import { auditSite } from "@/lib/geo/analyzer";
import { collectSitePageEvidence } from "@/lib/geo/page-evidence";

const schema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  brandVoice: z.string().optional().nullable(),
  productCount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const pageEvidence = await collectSitePageEvidence(body.domain);
    const report = auditSite({ ...body, pageEvidence });
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
