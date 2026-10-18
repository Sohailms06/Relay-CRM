"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Feedback } from "@/components/ui/feedback";
import {
  saveIntegrationConfigAction,
  testTelegramAlertAction,
  testTwilioMessageAction,
  testStripeCheckoutAction,
} from "@/app/actions/integrations";
import {
  Send,
  MessageSquare,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

export interface IntegrationConfigItem {
  provider: "telegram" | "twilio" | "stripe" | "google_calendar";
  is_active: boolean;
  settings: Record<string, any>;
  updated_at?: string;
}

export interface SyncEventItem {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  status: "received" | "processed" | "failed" | "ignored";
  processed_at: string;
  payload?: any;
}

interface IntegrationsClientProps {
  workspaceId: string;
  workspaceName: string;
  configs: Record<string, IntegrationConfigItem>;
  syncEvents: SyncEventItem[];
  envFlags: {
    hasTelegramEnv: boolean;
    hasTwilioEnv: boolean;
    hasStripeEnv: boolean;
    hasGoogleEnv: boolean;
    appUrl: string;
  };
}

export function IntegrationsClient({
  workspaceId,
  workspaceName,
  configs,
  syncEvents: initialEvents,
  envFlags,
}: IntegrationsClientProps) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states
  const [telegramChatId, setTelegramChatId] = useState(
    configs.telegram?.settings?.chat_id || ""
  );
  const [twilioToNumber, setTwilioToNumber] = useState("+15550199");
  const [twilioChannel, setTwilioChannel] = useState<"sms" | "whatsapp">("whatsapp");
  const [stripeAmount, setStripeAmount] = useState("150.00");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestTelegram = async () => {
    setIsLoading("telegram");
    setFeedback(null);
    try {
      const res = await testTelegramAlertAction({
        workspaceId,
        customChatId: telegramChatId.trim() || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", text: `Telegram test failed: ${res.error}` });
      } else {
        setFeedback({
          type: "success",
          text: `Test Telegram notification sent successfully! (Message ID: ${res.messageId})`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to trigger Telegram test" });
    } finally {
      setIsLoading(null);
    }
  };

  const handleTestTwilio = async () => {
    setIsLoading("twilio");
    setFeedback(null);
    try {
      const res = await testTwilioMessageAction({
        workspaceId,
        to: twilioToNumber.trim(),
        channel: twilioChannel,
        body: `Hello from Relay CRM! Testing outbound ${twilioChannel.toUpperCase()} integration.`,
      });
      if (res.error) {
        setFeedback({ type: "error", text: `Twilio message failed: ${res.error}` });
      } else {
        setFeedback({
          type: "success",
          text: `Twilio ${twilioChannel.toUpperCase()} message queued successfully! (SID: ${res.messageSid})`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Twilio test failed" });
    } finally {
      setIsLoading(null);
    }
  };

  const handleTestStripe = async () => {
    setIsLoading("stripe");
    setFeedback(null);
    try {
      const res = await testStripeCheckoutAction({
        workspaceId,
        amount: parseFloat(stripeAmount) || 150.0,
        serviceTitle: "Commercial Plumbing SLA Retainer",
      });
      if (res.error) {
        setFeedback({ type: "error", text: `Stripe session creation failed: ${res.error}` });
      } else if (res.checkoutUrl) {
        setFeedback({
          type: "success",
          text: `Stripe Checkout session created! Opening checkout in new tab...`,
        });
        window.open(res.checkoutUrl, "_blank");
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Stripe test failed" });
    } finally {
      setIsLoading(null);
    }
  };

  const webhookBase = envFlags.appUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18181B]">
            Integrations
          </h1>
          <p className="mt-0.5 text-xs text-[#71717A]">
            External communications, payment gateways, and calendar synchronization.
          </p>
        </div>
      </div>

      {feedback && (
        <Feedback
          variant={feedback.type}
          title={feedback.type === "success" ? "Operation Successful" : "Integration Warning"}
        >
          {feedback.text}
        </Feedback>
      )}

      {/* 4 Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. TELEGRAM BOT (Escalation Alerts) */}
        <Card className="flex flex-col justify-between border-[#E5E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0088CC]/10 text-[#0088CC]">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#18181B]">
                    Telegram Escalation Bot
                  </CardTitle>
                  <CardDescription className="text-xs text-[#71717A]">
                    Automated on-call alerts for overdue SLA deadlines
                  </CardDescription>
                </div>
              </div>
              <Badge variant={envFlags.hasTelegramEnv || configs.telegram?.is_active ? "success" : "outline"}>
                {envFlags.hasTelegramEnv || configs.telegram?.is_active ? "Connected" : "Setup Needed"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <p className="text-xs text-[#71717A]">
              When an assigned employee misses their acknowledgement window, Relay CRM automatically dispatches an on-call alert to Telegram containing the lead title, customer contact, and tier.
            </p>

            <div className="space-y-2 rounded-lg bg-[#FAFAF8] p-3 border border-[#E5E5E0] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Bot Token:</span>
                <span className="font-mono text-[#18181B]">
                  {envFlags.hasTelegramEnv ? "•••••••••••• (Server Protected)" : "Not configured"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Target Chat ID:</span>
                <span className="font-mono text-[#18181B]">
                  {telegramChatId || "@relay_alerts (Default)"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#18181B]">
                Override Target Chat ID (e.g., @channel or numerical user ID)
              </label>
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-100123456789 or @relay_oncall"
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleTestTelegram}
              isLoading={isLoading === "telegram"}
            >
              <Send className="h-4 w-4 mr-1.5 text-[#0088CC]" />
              Send Test Telegram Notification
            </Button>
          </CardContent>
        </Card>

        {/* 2. TWILIO (WhatsApp & SMS) */}
        <Card className="flex flex-col justify-between border-[#E5E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F22F46]/10 text-[#F22F46]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#18181B]">
                    Twilio Messaging
                  </CardTitle>
                  <CardDescription className="text-xs text-[#71717A]">
                    Two-way WhatsApp Sandbox & SMS lead ingestion
                  </CardDescription>
                </div>
              </div>
              <Badge variant={envFlags.hasTwilioEnv || configs.twilio?.is_active ? "success" : "outline"}>
                {envFlags.hasTwilioEnv || configs.twilio?.is_active ? "Connected" : "Ready for Webhooks"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <p className="text-xs text-[#71717A]">
              Inbound messages create verified leads via universal intake. Outbound replies qualify as lead acknowledgements.
            </p>

            <div className="space-y-2 rounded-lg bg-[#FAFAF8] p-3 border border-[#E5E5E0] text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#71717A] shrink-0">Inbound Webhook:</span>
                <span className="font-mono text-[#18181B] truncate text-[11px]">
                  {webhookBase}/api/webhooks/twilio
                </span>
                <button
                  onClick={() => copyToClipboard(`${webhookBase}/api/webhooks/twilio`, "twilio-wh")}
                  className="p-1 hover:bg-[#E5E5E0] rounded text-[#71717A]"
                  title="Copy webhook URL"
                >
                  {copiedKey === "twilio-wh" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Signature Verification:</span>
                <span className="text-[#1E3A2F] font-semibold">HMAC-SHA1 Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[#71717A]">Channel</label>
                <select
                  value={twilioChannel}
                  onChange={(e) => setTwilioChannel(e.target.value as any)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-2 py-1 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
                >
                  <option value="whatsapp">WhatsApp Sandbox</option>
                  <option value="sms">Standard SMS</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#71717A]">Destination Phone</label>
                <input
                  type="text"
                  value={twilioToNumber}
                  onChange={(e) => setTwilioToNumber(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
                  placeholder="+15550199"
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleTestTwilio}
              isLoading={isLoading === "twilio"}
            >
              <MessageSquare className="h-4 w-4 mr-1.5 text-[#F22F46]" />
              Dispatch Test Twilio Message
            </Button>
          </CardContent>
        </Card>

        {/* 3. STRIPE (Test Payments) */}
        <Card className="flex flex-col justify-between border-[#E5E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#635BFF]/10 text-[#635BFF]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#18181B]">
                    Stripe Payments
                  </CardTitle>
                  <CardDescription className="text-xs text-[#71717A]">
                    Test Checkout Sessions & verified webhook revenue
                  </CardDescription>
                </div>
              </div>
              <Badge variant={envFlags.hasStripeEnv || configs.stripe?.is_active ? "success" : "outline"}>
                {envFlags.hasStripeEnv || configs.stripe?.is_active ? "Connected" : "Test Mode Ready"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <p className="text-xs text-[#71717A]">
              Live server-created Checkout Sessions in Stripe Test Sandbox. Payments are acknowledged only through cryptographic raw-body webhook verification.
            </p>

            <div className="space-y-2 rounded-lg bg-[#FAFAF8] p-3 border border-[#E5E5E0] text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#71717A] shrink-0">Stripe Webhook:</span>
                <span className="font-mono text-[#18181B] truncate text-[11px]">
                  {webhookBase}/api/webhooks/stripe
                </span>
                <button
                  onClick={() => copyToClipboard(`${webhookBase}/api/webhooks/stripe`, "stripe-wh")}
                  className="p-1 hover:bg-[#E5E5E0] rounded text-[#71717A]"
                  title="Copy webhook URL"
                >
                  {copiedKey === "stripe-wh" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Verification:</span>
                <span className="text-[#1E3A2F] font-semibold">stripe-signature (Raw Body)</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#18181B]">
                Test Payment Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-[#71717A]">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={stripeAmount}
                  onChange={(e) => setStripeAmount(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white pl-7 pr-3 py-1.5 text-sm text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleTestStripe}
              isLoading={isLoading === "stripe"}
            >
              <CreditCard className="h-4 w-4 mr-1.5 text-[#635BFF]" />
              Launch Stripe Test Checkout Session
            </Button>
          </CardContent>
        </Card>

        {/* 4. GOOGLE CALENDAR (OAuth 2.0 & Sync) */}
        <Card className="flex flex-col justify-between border-[#E5E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4285F4]/10 text-[#4285F4]">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#18181B]">
                    Google Calendar Sync
                  </CardTitle>
                  <CardDescription className="text-xs text-[#71717A]">
                    OAuth 2.0 calendar integration & appointment booking
                  </CardDescription>
                </div>
              </div>
              <Badge variant={configs.google_calendar?.is_active ? "success" : "outline"}>
                {configs.google_calendar?.is_active ? "Account Linked" : "OAuth 2.0 Ready"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <p className="text-xs text-[#71717A]">
              Connect your Google Workspace calendar via official OAuth 2.0. Bookings sync bidirectional appointment slots and automatically acknowledge leads.
            </p>

            <div className="space-y-2 rounded-lg bg-[#FAFAF8] p-3 border border-[#E5E5E0] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">OAuth Redirect URI:</span>
                <span className="font-mono text-[#18181B] truncate text-[11px]">
                  {webhookBase}/api/auth/google/callback
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Connected Account:</span>
                <span className="font-semibold text-[#18181B]">
                  {configs.google_calendar?.settings?.account_email || "No account linked"}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <a
                href={`/api/auth/google?workspace_id=${workspaceId}`}
                className="inline-flex items-center justify-center font-medium transition-colors border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#FAFAF8] h-9 px-4 text-xs rounded-lg gap-2 w-full shadow-sm"
              >
                <Calendar className="h-4 w-4 text-[#4285F4]" />
                {configs.google_calendar?.is_active ? "Reconnect Google Calendar" : "Connect with Google Calendar"}
                <ExternalLink className="h-3 w-3 ml-auto text-[#71717A]" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Delivery Log (Audit & Idempotency Ledger) */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-[#18181B]">
                Provider Webhook & Delivery Event Ledger
              </CardTitle>
              <CardDescription className="text-xs text-[#71717A]">
                Immutable record of inbound webhooks, outbound dispatches, and cryptographic signatures
              </CardDescription>
            </div>
            <Badge variant="outline">
              {initialEvents.length} Recent Events
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-y border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Provider</th>
                  <th className="py-2.5 px-4 font-semibold">Event Type</th>
                  <th className="py-2.5 px-4 font-semibold">Event ID / Hash</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                {initialEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#71717A]">
                      No external integration events recorded yet. Trigger a test alert or webhook above to generate sync logs.
                    </td>
                  </tr>
                ) : (
                  initialEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                      <td className="py-2.5 px-4 font-medium capitalize flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#1E3A2F]" />
                        {ev.provider}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#71717A]">
                        {ev.event_type}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#18181B]">
                        {ev.provider_event_id.slice(0, 24)}
                        {ev.provider_event_id.length > 24 ? "..." : ""}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            ev.status === "processed"
                              ? "success"
                              : ev.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {ev.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#71717A]">
                        {new Date(ev.processed_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
