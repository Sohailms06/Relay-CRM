// ==============================================================================
// RELAY CRM — UNIVERSAL ENVIRONMENT CONFIGURATION & ADAPTER
// Supports modern (publishable/secret) and legacy (anon/service-role) keys,
// with or without NEXT_PUBLIC_ prefixes in server environments.
// Dynamic getters prevent static inlining freezes during Next.js builds.
// ==============================================================================

/**
 * Universal safe environment variable extractor.
 * Inspects static process.env, dynamic process.env lookup, and fallback arrays.
 */
function readEnv(direct: string | undefined, names: string[]): string {
  if (direct && typeof direct === "string" && direct.trim() !== "") {
    return direct.trim();
  }
  if (typeof process !== "undefined" && process.env) {
    for (const name of names) {
      const val = process.env[name];
      if (val && typeof val === "string" && val.trim() !== "") {
        return val.trim();
      }
    }
  }
  return "";
}

export const env = {
  get appUrl(): string {
    const direct = process.env.NEXT_PUBLIC_APP_URL;
    const resolved = readEnv(direct, [
      "NEXT_PUBLIC_APP_URL",
      "APP_URL",
      "VERCEL_PROJECT_PRODUCTION_URL",
      "VERCEL_URL",
    ]);
    if (resolved) {
      return resolved.startsWith("http") ? resolved : `https://${resolved}`;
    }
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  },

  get supabaseUrl(): string {
    // Check static NEXT_PUBLIC_SUPABASE_URL first for compiler inlining, then runtime fallbacks
    const direct = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return readEnv(direct, [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
      "SUPABASE_PROJECT_URL",
    ]);
  },

  get supabaseAnonKey(): string {
    // 1. Static checks for compiler inlining (browser-safe)
    const directPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const directAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const direct = directPub || directAnon;

    // 2. Runtime fallback list (includes server-only names when running in Node.js)
    const fallbackNames =
      typeof window === "undefined"
        ? [
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "SUPABASE_ANON_KEY",
            "SUPABASE_PUBLISHABLE_KEY",
            "NEXT_PUBLIC_SUPABASE_KEY",
            "SUPABASE_KEY",
          ]
        : [
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "NEXT_PUBLIC_SUPABASE_KEY",
          ];

    return readEnv(direct, fallbackNames);
  },

  get supabaseServiceKey(): string {
    // Strictly server-side only: NEVER expose to the browser bundle
    if (typeof window !== "undefined") {
      return "";
    }

    const directSec = process.env.SUPABASE_SECRET_KEY;
    const directSvc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const direct = directSec || directSvc;

    return readEnv(direct, [
      "SUPABASE_SECRET_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_KEY",
      "SUPABASE_ADMIN_KEY",
    ]);
  },

  get isSupabaseConfigured(): boolean {
    const url = this.supabaseUrl;
    const anonKey = this.supabaseAnonKey;

    const isValidUrl =
      Boolean(url) &&
      url !== "https://your-project-ref.supabase.co" &&
      !url.includes("your-project-ref") &&
      url.startsWith("http");

    const isValidKey =
      Boolean(anonKey) &&
      anonKey !== "your-anon-key-here" &&
      anonKey !== "your-publishable-or-anon-key-here" &&
      anonKey.length > 20;

    return isValidUrl && isValidKey;
  },

  get missingRequiredVariables(): string[] {
    const missing: string[] = [];
    if (!this.supabaseUrl) {
      missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
    }
    if (!this.supabaseAnonKey) {
      missing.push(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY)"
      );
    }
    if (typeof window === "undefined" && !this.supabaseServiceKey) {
      missing.push(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)"
      );
    }
    return missing;
  },
};
