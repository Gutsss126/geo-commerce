import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildGoogleOAuthUrl,
  getGoogleOAuthConfigFromEnv,
  isGoogleOAuthConfigured,
} from "@/lib/ga4/oauth";

export async function GET() {
  const config = getGoogleOAuthConfigFromEnv();
  if (!isGoogleOAuthConfigured(config)) {
    return NextResponse.redirect(
      new URL("/diagnostics/ga4?oauth=missing_config", process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000")
    );
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildGoogleOAuthUrl(config, state));
  response.cookies.set("ga4_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
