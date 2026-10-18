"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { testTwilioMessageAction } from "@/app/actions/integrations";
import { MessageSquare, Send, Phone, User, Clock, CheckCircle2 } from "lucide-react";

export interface MessageItem {
  id: string;
  sender_type: "customer" | "user" | "system";
  content: string;
  direction: "inbound" | "outbound";
  status: string;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  channel: "sms" | "whatsapp" | "telegram" | "email" | "chat";
  status: "open" | "closed" | "archived";
  last_message_at: string;
  contacts?: { id: string; first_name: string; last_name?: string | null; phone?: string | null; email?: string | null } | null;
  messages: MessageItem[];
}

interface ConversationsClientProps {
  workspaceId: string;
  conversations: ConversationItem[];
}

export function ConversationsClient({
  workspaceId,
  conversations: initialConversations,
}: ConversationsClientProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeConv = conversations.find((c) => c.id === selectedId);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !replyText.trim()) return;

    const targetPhone = activeConv.contacts?.phone;
    if (!targetPhone) {
      setFeedback({ type: "error", text: "Contact has no associated phone number for outbound dispatch." });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      const channel = activeConv.channel === "whatsapp" ? "whatsapp" : "sms";
      const res = await testTwilioMessageAction({
        workspaceId,
        to: targetPhone,
        channel,
        body: replyText.trim(),
      });

      if (res.error) {
        setFeedback({ type: "error", text: `Dispatch failed: ${res.error}` });
      } else {
        const newMsg: MessageItem = {
          id: `msg-${Date.now()}`,
          sender_type: "user",
          content: replyText.trim(),
          direction: "outbound",
          status: "sent",
          created_at: new Date().toISOString(),
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? { ...c, messages: [...c.messages, newMsg], last_message_at: newMsg.created_at }
              : c
          )
        );
        setReplyText("");
        setFeedback({
          type: "success",
          text: `Message dispatched via Twilio ${channel.toUpperCase()}! Lead SLA response acknowledged.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to dispatch message" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18181B]">
            Conversations
          </h1>
          <p className="mt-0.5 text-xs text-[#71717A]">
            Customer messaging and SMS threads.
          </p>
        </div>
      </div>

      {feedback && (
        <Feedback
          variant={feedback.type}
          title={feedback.type === "success" ? "Message Dispatched" : "Messaging Notice"}
        >
          {feedback.text}
        </Feedback>
      )}

      {/* Main Split View: Thread List + Active Conversation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
        {/* Thread Sidebar */}
        <Card className="border-[#E5E5E0] md:col-span-1 overflow-hidden flex flex-col">
          <CardHeader className="p-3 border-b border-[#EFEFEA] bg-[#FAFAF8]">
            <CardTitle className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
              Customer Threads ({conversations.length})
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-[#EFEFEA] overflow-y-auto flex-1 max-h-[550px]">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71717A]">
                No customer messages yet. Inbound Twilio WhatsApp or SMS messages will appear here.
              </div>
            ) : (
              conversations.map((c) => {
                const contactName = c.contacts
                  ? `${c.contacts.first_name} ${c.contacts.last_name || ""}`.trim()
                  : "Customer Inquirer";
                const lastMsg = c.messages[c.messages.length - 1]?.content || "Inbound message thread";
                const isSelected = c.id === selectedId;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 ${
                      isSelected ? "bg-[#E8EFE9]/40 border-l-2 border-[#1E3A2F]" : "hover:bg-[#FAFAF8]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#18181B] truncate">{contactName}</span>
                      <Badge variant={c.channel === "whatsapp" ? "success" : "outline"} className="text-[10px]">
                        {c.channel}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#71717A] truncate line-clamp-1">{lastMsg}</p>
                    <span className="text-[10px] text-[#A1A1AA] mt-0.5">
                      {new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Message View & Reply Box */}
        <Card className="border-[#E5E5E0] md:col-span-2 flex flex-col justify-between overflow-hidden">
          {activeConv ? (
            <>
              {/* Active Header */}
              <div className="p-3.5 border-b border-[#EFEFEA] bg-[#FAFAF8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#18181B]">
                    {activeConv.contacts
                      ? `${activeConv.contacts.first_name} ${activeConv.contacts.last_name || ""}`.trim()
                      : "Customer Inquiry"}
                  </h4>
                  <span className="text-[11px] text-[#71717A] flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {activeConv.contacts?.phone || "No phone"} · Channel:{" "}
                    <strong className="capitalize">{activeConv.channel}</strong>
                  </span>
                </div>
                <Badge variant="success">Two-Way Active</Badge>
              </div>

              {/* Messages Scroll Area */}
              <div className="p-4 space-y-3 overflow-y-auto max-h-[380px] flex-1 bg-white">
                {activeConv.messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#71717A]">
                    No messages in this conversation thread yet.
                  </div>
                ) : (
                  activeConv.messages.map((m) => {
                    const isOutbound = m.direction === "outbound";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs shadow-sm ${
                            isOutbound
                              ? "bg-[#1E3A2F] text-white"
                              : "bg-[#F4F4F0] text-[#18181B] border border-[#E5E5E0]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                        <span className="text-[10px] text-[#A1A1AA] mt-1 px-1">
                          {isOutbound ? "Sent by Rep" : "Inbound Customer"} ·{" "}
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Outbound Reply Input */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-[#EFEFEA] bg-[#FAFAF8]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply via Twilio ${activeConv.channel.toUpperCase()}...`}
                    className="flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
                    disabled={isSending}
                  />
                  <Button type="submit" variant="primary" className="h-9 px-3 text-xs shrink-0" isLoading={isSending}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send Reply
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#71717A]">
              Select a conversation thread to view message history and send Twilio replies.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
