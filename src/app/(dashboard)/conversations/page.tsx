// ==============================================================================
// RELAY CRM — CONVERSATIONS DASHBOARD PAGE (Phase 3: Real Integrations)
// Unified customer messaging across WhatsApp and SMS via Twilio
// ==============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConversationsClient, type ConversationItem } from "./conversations-client";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) redirect("/login");

  const workspaceId = member.workspace_id;
  const admin = createAdminClient() || supabase;

  // 1. Fetch conversations for this workspace
  const { data: rawConvs } = await admin
    .from("conversations")
    .select(`
      id,
      channel,
      status,
      last_message_at,
      contacts(id, first_name, last_name, phone, email)
    `)
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false });

  // 2. Fetch messages for these conversations
  const convIds = (rawConvs || []).map((c) => c.id);
  let messagesByConv = new Map<string, any[]>();

  if (convIds.length > 0) {
    const { data: rawMsgs } = await admin
      .from("messages")
      .select("id, conversation_id, sender_type, content, direction, status, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true });

    (rawMsgs || []).forEach((m) => {
      const list = messagesByConv.get(m.conversation_id) || [];
      list.push(m);
      messagesByConv.set(m.conversation_id, list);
    });
  }

  const conversations: ConversationItem[] = (rawConvs || []).map((c: any) => ({
    id: c.id,
    channel: c.channel,
    status: c.status,
    last_message_at: c.last_message_at,
    contacts: c.contacts,
    messages: messagesByConv.get(c.id) || [],
  }));

  return (
    <ConversationsClient
      workspaceId={workspaceId}
      conversations={conversations}
    />
  );
}
