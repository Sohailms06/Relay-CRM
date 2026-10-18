"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Feedback } from "@/components/ui/feedback";
import { CheckCircle2, Clock, ShieldCheck, Send } from "lucide-react";

interface IntakeFormClientProps {
  workspaceId: string;
  workspaceName: string;
}

export function IntakeFormClient({ workspaceId, workspaceName }: IntakeFormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const company = formData.get("company") as string;
    const inquiry = formData.get("inquiry") as string;

    if (!name || (!email && !phone)) {
      setError("Please provide your name and either an email or phone number.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name,
          email,
          phone,
          company,
          inquiry,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Submission failed");
      }

      setTicketId(data.leadId ? data.leadId.slice(0, 8).toUpperCase() : null);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-[#D2E0D5] bg-white shadow-sm p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EFE9] text-[#1E3A2F]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#18181B]">Inquiry Received</h3>
          <p className="text-xs text-[#71717A] max-w-sm mx-auto">
            Thank you for reaching out to {workspaceName}. An on-call representative has been assigned and will contact you shortly.
          </p>
        </div>
        {ticketId && (
          <div className="inline-block rounded-lg bg-[#FAFAF8] border border-[#E5E5E0] px-3 py-1.5 text-xs font-mono text-[#52525B]">
            Reference Ticket: <span className="font-semibold text-[#18181B]">#{ticketId}</span>
          </div>
        )}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[#3D6452]">
          <Clock className="h-4 w-4" />
          <span>SLA acknowledgement window active</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-[#E5E5E0] bg-white shadow-sm">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          {error && (
            <Feedback variant="error" title="Submission Error">
              {error}
            </Feedback>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              id="name"
              name="name"
              placeholder="Alex Morgan"
              required
            />
            <Input
              label="Company / Organization"
              id="company"
              name="company"
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              placeholder="alex@company.com"
            />
            <Input
              label="Phone Number"
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="inquiry" className="block text-xs font-medium text-[#18181B]">
              Inquiry / Service Details *
            </label>
            <textarea
              id="inquiry"
              name="inquiry"
              rows={4}
              required
              placeholder="Describe what services or assistance your team requires..."
              className="flex w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#18181B] shadow-sm placeholder:text-[#A1A1AA] transition-colors focus:border-[#1E3A2F] focus:outline-none focus:ring-1 focus:ring-[#1E3A2F]"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
          >
            Submit Service Inquiry
            <Send className="h-3.5 w-3.5 ml-1.5" />
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1AA] pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1E3A2F]" />
            <span>Secure automated intake routed directly to active on-call staff</span>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
