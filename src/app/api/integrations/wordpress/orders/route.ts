import { NextResponse } from "next/server";
import { authenticateWordPressRequest } from "@/lib/wordpress/auth";
import { parseWooOrderBody } from "@/lib/wordpress/mapper";
import { upsertWordPressOrder } from "@/lib/wordpress/sync";

export async function POST(req: Request) {
  const auth = await authenticateWordPressRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload = parseWooOrderBody(body);
    const order = await upsertWordPressOrder(auth.site.id, payload);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
