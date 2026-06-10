import { NextResponse } from "next/server";
import { z } from "zod";
import { auditSite } from "@/lib/geo/analyzer";

const schema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  brandVoice: z.string().optional().nullable(),
  productCount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const report = auditSite(body);
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
