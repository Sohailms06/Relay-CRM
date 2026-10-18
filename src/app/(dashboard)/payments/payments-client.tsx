"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { testStripeCheckoutAction } from "@/app/actions/integrations";
import { CreditCard, DollarSign, TrendingUp, CheckCircle2, Clock, ExternalLink, Plus } from "lucide-react";

export interface PaymentRecordItem {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_payment_intent_id: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  created_at: string;
  contacts?: { first_name: string; last_name?: string | null; email?: string | null } | null;
  opportunities?: { title: string } | null;
}

interface PaymentsClientProps {
  workspaceId: string;
  payments: PaymentRecordItem[];
  totalCollected: number;
  succeededCount: number;
  pendingCount: number;
}

export function PaymentsClient({
  workspaceId,
  payments: initialPayments,
  totalCollected,
  succeededCount,
  pendingCount,
}: PaymentsClientProps) {
  const [payments] = useState<PaymentRecordItem[]>(initialPayments);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [customAmount, setCustomAmount] = useState("250.00");
  const [serviceName, setServiceName] = useState("Commercial HVAC Maintenance Agreement");

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await testStripeCheckoutAction({
        workspaceId,
        amount: parseFloat(customAmount) || 250.0,
        serviceTitle: serviceName,
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else if (res.checkoutUrl) {
        setFeedback({
          type: "success",
          text: "Stripe test checkout session initialized. Opening payment portal...",
        });
        window.open(res.checkoutUrl, "_blank");
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create checkout session" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E5E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
            Payments & Billing
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Real Stripe payment intent reconciliation, client retainers, and webhook-verified collected revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="sage">Stripe Test Mode</Badge>
          <Badge variant="success">Webhook Protected</Badge>
        </div>
      </div>

      {feedback && (
        <Feedback
          variant={feedback.type}
          title={feedback.type === "success" ? "Checkout Initialized" : "Payment Gateway Notice"}
        >
          {feedback.text}
        </Feedback>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E5E5E0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
              Total Collected Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#1E3A2F]">
                ${totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-[#71717A]">USD</span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717A]">
              Confirmed via cryptographic webhook
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E5E0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
              Succeeded Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#18181B]">
                {succeededCount}
              </span>
              <span className="text-xs text-green-700 font-medium">Completed</span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717A]">
              Zero duplicate payment guarantee
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E5E0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#18181B]">
                {pendingCount}
              </span>
              <span className="text-xs text-amber-600 font-medium">In Checkout</span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717A]">
              Awaiting customer checkout completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Initiation Drawer / Form */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#18181B] flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#1E3A2F]" />
            Generate Stripe Test Invoice / Checkout Session
          </CardTitle>
          <CardDescription className="text-xs text-[#71717A]">
            Create a real Stripe payment session. Upon successful test payment, the webhook verifies the intent and credits workspace revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCheckout} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-[#18181B]">Service Description</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                className="mt-1 flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#18181B]">Amount (USD)</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-xs text-[#71717A]">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-lg border border-[#E5E5E0] bg-white pl-7 pr-3 py-1.5 text-xs text-[#18181B] focus:border-[#1E3A2F] focus:outline-none"
                />
              </div>
            </div>
            <Button type="submit" variant="primary" className="h-9 text-xs" isLoading={isCreating}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Launch Stripe Checkout
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-[#E5E5E0]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#18181B]">
              Payment Transaction Ledger
            </CardTitle>
            <Badge variant="outline">{payments.length} Records</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-y border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Payment Intent ID</th>
                  <th className="py-2.5 px-4 font-semibold">Customer / Contact</th>
                  <th className="py-2.5 px-4 font-semibold">Amount</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#71717A]">
                      No payments recorded yet. Generate a test checkout session above or process a webhook to register revenue.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#18181B]">
                        {p.provider_payment_intent_id ? p.provider_payment_intent_id.slice(0, 22) + "..." : "Pending Session"}
                      </td>
                      <td className="py-2.5 px-4 text-[#71717A]">
                        {p.contacts
                          ? `${p.contacts.first_name} ${p.contacts.last_name || ""}`.trim()
                          : "Direct Invoice"}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#18181B]">
                        ${Number(p.amount).toFixed(2)} {p.currency}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            p.status === "succeeded"
                              ? "success"
                              : p.status === "pending"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#71717A]">
                        {new Date(p.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(p.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
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
