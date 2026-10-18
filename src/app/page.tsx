// ==============================================================================
// RELAY CRM — PUBLIC LANDING ROOT
// 
// TEAMMATE NOTICE:
// Teammates independently own and build the public landing page.
// You can freely replace, redesign, or extend this file for the landing page.
// The core application runs in isolated routes:
// - App Dashboard: /dashboard
// - Authentication: /login and /signup
// ==============================================================================

import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8] text-[#18181B]">
      {/* Navigation Bar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-[#E5E5E0] bg-white px-6 sm:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3A2F] text-white shadow-sm font-semibold text-sm">
            R
          </div>
          <span className="font-bold text-sm tracking-tight text-[#18181B]">
            Relay CRM
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-[#52525B] hover:text-[#18181B] px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-8 px-3.5 text-xs font-medium rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-colors shadow-sm gap-1.5"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D2E0D5] bg-[#E8EFE9] px-3 py-1 text-xs font-semibold text-[#1E3A2F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A2F]" />
            National University Hackathon · Production Foundation
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-[#18181B]">
            Never let a high-value customer lead go unanswered.
          </h1>

          <p className="text-sm text-[#71717A] leading-relaxed max-w-xl mx-auto">
            Relay CRM is the unified operational management platform for service businesses. Round-robin dispatching, strict acknowledgement deadlines, and automated recovery.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-5 text-sm font-medium rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-colors shadow-sm gap-2"
            >
              Enter Application Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-5 text-sm font-medium rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#F4F4F0] transition-colors"
            >
              Create Company Workspace
            </Link>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 text-left">
            <div className="p-4 rounded-xl border border-[#E5E5E0] bg-white">
              <Clock className="h-5 w-5 text-[#1E3A2F] mb-2" />
              <h3 className="text-xs font-semibold text-[#18181B]">15-Min Response SLA</h3>
              <p className="text-[11px] text-[#71717A] mt-1">Postgres-backed deadline timers monitoring team response.</p>
            </div>
            <div className="p-4 rounded-xl border border-[#E5E5E0] bg-white">
              <Users className="h-5 w-5 text-[#1E3A2F] mb-2" />
              <h3 className="text-xs font-semibold text-[#18181B]">On-Call Round-Robin</h3>
              <p className="text-[11px] text-[#71717A] mt-1">Atomic lead locking to prevent duplicate assignment.</p>
            </div>
            <div className="p-4 rounded-xl border border-[#E5E5E0] bg-white">
              <ShieldCheck className="h-5 w-5 text-[#1E3A2F] mb-2" />
              <h3 className="text-xs font-semibold text-[#18181B]">Workspace Isolation</h3>
              <p className="text-[11px] text-[#71717A] mt-1">Row Level Security ensuring complete tenant privacy.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Teammate banner */}
      <footer className="border-t border-[#E5E5E0] bg-white py-4 px-6 text-center text-xs text-[#71717A]">
        <p>
          Relay CRM · Dedicated to service businesses with 5–30 employees.
        </p>
      </footer>
    </div>
  );
}
