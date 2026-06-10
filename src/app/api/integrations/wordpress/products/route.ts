import { NextResponse } from "next/server";
import { authenticateWordPressRequest } from "@/lib/wordpress/auth";
import { parseWooProductBody } from "@/lib/wordpress/mapper";
import { upsertWordPressProduct } from "@/lib/wordpress/sync";

export async function POST(req: Request) {
  const auth = await authenticateWordPressRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload = parseWooProductBody(body);
    const product = await upsertWordPressProduct(auth.site.id, payload);
    return NextResponse.json({ ok: true, product });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
