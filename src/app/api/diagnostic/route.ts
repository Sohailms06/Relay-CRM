// ==============================================================================
// RELAY CRM — PRODUCTION ENVIRONMENT DIAGNOSTIC ENDPOINT
// Securely verifies whether Supabase credentials are detected in the runtime.
// NEVER reveals raw secret values or keys.
// ==============================================================================

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const detectedKeys: string[] = [];

  const candidates = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_KEY",
    "CRON_SECRET",
  ];

  const allRelatedKeys = Object.keys(process.env).filter((k) =>
    /SUPABASE|URL|PROJECT/i.test(k)
  );

  for (const key of candidates) {
    if (process.env[key] && process.env[key]!.trim().length > 0) {
      detectedKeys.push(key);
    }
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    isSupabaseConfigured: env.isSupabaseConfigured,
    hasSupabaseUrl: Boolean(env.supabaseUrl),
    hasAnonOrPublishableKey: Boolean(env.supabaseAnonKey),
    hasServiceOrSecretKey: Boolean(env.supabaseServiceKey),
    detectedEnvironmentVariableNames: detectedKeys,
    allRelatedEnvironmentVariableNamesInRuntime: allRelatedKeys,
    missingRequiredVariables: env.missingRequiredVariables,
    urlKeyDetails: {
      inKeys: Object.keys(process.env).includes("NEXT_PUBLIC_SUPABASE_URL"),
      type: typeof process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").length,
      bracketType: typeof process.env["NEXT_PUBLIC_SUPABASE_URL"],
      bracketLength: (process.env["NEXT_PUBLIC_SUPABASE_URL"] || "").length,
      firstCharAscii: (process.env["NEXT_PUBLIC_SUPABASE_URL"] || "").charCodeAt(0) || null,
      lastCharAscii: (process.env["NEXT_PUBLIC_SUPABASE_URL"] || "").charCodeAt((process.env["NEXT_PUBLIC_SUPABASE_URL"] || "").length - 1) || null,
    },
  });
}
