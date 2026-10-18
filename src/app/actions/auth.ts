"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export interface AuthState {
  error?: string;
  success?: boolean;
}

export async function signUpAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const workspaceName = formData.get("workspaceName") as string;

  if (!email || !password || !fullName || !workspaceName) {
    return { error: "All fields are required to establish your workspace." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  // Generate workspace slug
  const slug = workspaceName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (env.isSupabaseConfigured) {
    const supabase = await createClient();
    if (!supabase) {
      return { error: "Supabase client initialization failed." };
    }

    // 1. Sign up user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError || !authData.user) {
      return { error: authError?.message || "Failed to create account." };
    }

    const userId = authData.user.id;

    // 2. Create the workspace record
    const { data: wsData, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
        timezone: "UTC",
      })
      .select()
      .single();

    if (wsError || !wsData) {
      return { error: `Failed to create workspace: ${wsError?.message}` };
    }

    // 3. Add user as Owner in workspace_members
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: wsData.id,
        user_id: userId,
        role: "owner",
        status: "active",
      });

    if (memberError) {
      return { error: `Failed to assign workspace ownership: ${memberError.message}` };
    }

    // 4. Initialize availability record
    await supabase.from("employee_availability").insert({
      workspace_id: wsData.id,
      user_id: userId,
      is_available: true,
      status_reason: "Initial Owner On-Call",
    });
  } else {
    // Supabase credentials not yet supplied by user:
    // Store demo session in cookie to test user journey end-to-end
    const cookieStore = await cookies();
    cookieStore.set(
      "relay_session",
      JSON.stringify({
        user: { id: "demo-user-1", email, full_name: fullName },
        workspace: { id: "demo-ws-1", name: workspaceName, slug, role: "owner" },
      }),
      { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" }
    );
  }

  redirect("/dashboard");
}

export async function signInAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  if (env.isSupabaseConfigured) {
    const supabase = await createClient();
    if (!supabase) {
      return { error: "Supabase client initialization failed." };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: signInError.message };
    }
  } else {
    // Supabase credentials pending: authenticate demo user session
    const cookieStore = await cookies();
    cookieStore.set(
      "relay_session",
      JSON.stringify({
        user: { id: "demo-user-1", email, full_name: email.split("@")[0] },
        workspace: { id: "demo-ws-1", name: "Apex Commercial Services", slug: "apex-commercial", role: "owner" },
      }),
      { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" }
    );
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  if (env.isSupabaseConfigured) {
    const supabase = await createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("relay_session");

  redirect("/login");
}
