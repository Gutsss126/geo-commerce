import { NextResponse } from "next/server";
import { z } from "zod";
import { auditProduct } from "@/lib/geo/analyzer";
import { collectProductPageEvidence } from "@/lib/geo/page-evidence";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  url: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const pageEvidence = await collectProductPageEvidence(body.url);
    const report = auditProduct({
      ...body,
      pageText: pageEvidence?.pageText,
      hasProductSchema: pageEvidence?.hasProductSchema,
      hasOfferSchema: pageEvidence?.hasOfferSchema,
      hasAvailability: pageEvidence?.hasAvailability,
      hasReviewSignal: pageEvidence?.hasReviewSignal,
    });
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
