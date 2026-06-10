import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await prisma.site.count();
    return NextResponse.json({
      ok: true,
      database: "connected",
      sites: count,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        hint: "Check Vercel DATABASE_URL (Neon pooled postgresql://...?sslmode=require)",
        error: message,
      },
      { status: 500 }
    );
  }
}
