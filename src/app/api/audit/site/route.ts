import { NextResponse } from "next/server";
import { z } from "zod";
import { auditSite } from "@/lib/geo/analyzer";
import { collectSitePageEvidence } from "@/lib/geo/page-evidence";
import { collectSitePageExperience } from "@/lib/geo/page-experience";

const schema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  brandVoice: z.string().optional().nullable(),
  productCount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const [pageEvidence, pageExperience] = await Promise.all([
      collectSitePageEvidence(body.domain),
      collectSitePageExperience(body.domain),
    ]);
    const report = auditSite({ ...body, pageEvidence });
    report.pageExperience = pageExperience;
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
