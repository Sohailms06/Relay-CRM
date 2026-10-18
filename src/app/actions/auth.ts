"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export interface AuthState {
  error?: string;
  success?: boolean;
}

export async function signUpAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const workspaceName = (formData.get("workspaceName") as string)?.trim();

  if (!email || !password || !fullName || !workspaceName) {
    return { error: "All fields are required to establish your workspace." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (!env.isSupabaseConfigured) {
    const missing = env.missingRequiredVariables;
    const detail = missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
    return { error: `Live Supabase credentials are required. Demo mode is disabled.${detail}` };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  if (!supabase) {
    return { error: "Failed to initialize Supabase client." };
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
    const errorMsg = authError?.message || "Failed to create account.";
    if (
      authError?.status === 429 ||
      errorMsg.toLowerCase().includes("rate limit") ||
      errorMsg.toLowerCase().includes("over_email_send_rate_limit")
    ) {
      return {
        error:
          "Supabase Auth email rate limit reached (free projects are restricted to 3–4 confirmation emails/hour on default SMTP). Please wait a few minutes before retrying, or configure Custom SMTP (e.g., Resend, SendGrid) in Supabase Dashboard → Auth → SMTP Settings.",
      };
    }
    return { error: errorMsg };
  }

  const userId = authData.user.id;

  // 2. Ensure email confirmation so user has immediate active session
  if (admin && !authData.session) {
    try {
      await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    } catch {
      // Ignore if already confirmed or permission restricted
    }
  }

  // 3. Create company workspace
  const slugBase = workspaceName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = `${slugBase || "workspace"}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Use admin client if available to ensure atomic initial provisioning
  const dbClient = admin || supabase;

  const { data: wsData, error: wsError } = await dbClient
    .from("workspaces")
    .insert({
      name: workspaceName,
      slug: slug,
      timezone: "UTC",
    })
    .select()
    .single();

  if (wsError || !wsData) {
    return { error: `Workspace provisioning failed: ${wsError?.message || "Unknown error"}` };
  }

  // 4. Assign user as Owner in workspace_members
  const { error: memberError } = await dbClient
    .from("workspace_members")
    .insert({
      workspace_id: wsData.id,
      user_id: userId,
      role: "owner",
      status: "active",
      permissions: {
        all: true,
        leads_read: true,
        leads_write: true,
        leads_delete: true,
        crm_read: true,
        crm_write: true,
        settings_write: true,
        audit_read: true,
      },
    });

  if (memberError) {
    return { error: `Failed to assign workspace ownership: ${memberError.message}` };
  }

  // 5. Initialize employee availability
  await dbClient.from("employee_availability").insert({
    workspace_id: wsData.id,
    user_id: userId,
    is_available: true,
    status_reason: "Initial Owner On-Call",
    max_active_leads: 10,
    current_active_leads: 0,
  });

  // 6. Sign in to establish active cookies if session wasn't returned on signup
  if (!authData.session) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      return { error: signInErr.message };
    }
  }

  redirect("/dashboard");
}

export async function signInAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  if (!env.isSupabaseConfigured) {
    const missing = env.missingRequiredVariables;
    const detail = missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
    return { error: `Live Supabase credentials are required. Demo mode is disabled.${detail}` };
  }

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

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
