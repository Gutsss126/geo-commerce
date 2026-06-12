import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleOAuthCode } from "@/lib/ga4/oauth";

function redirectToDiagnostics(status: string) {
  return NextResponse.redirect(
    new URL(`/diagnostics/ga4?oauth=${status}`, process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000")
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return redirectToDiagnostics("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("ga4_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToDiagnostics("invalid_state");
  }

  try {
    await exchangeGoogleOAuthCode(code);
    const response = redirectToDiagnostics("connected");
    response.cookies.delete("ga4_oauth_state");
    return response;
  } catch {
    return redirectToDiagnostics("token_error");
  }
}
