import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  if (!env.isSupabaseConfigured) {
    return null;
  }
  return createBrowserClient(
    env.supabaseUrl,
    env.supabaseAnonKey
  );
}
