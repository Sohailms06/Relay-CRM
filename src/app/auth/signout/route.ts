import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  if (env.isSupabaseConfigured) {
    const supabase = await createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("relay_session");

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
