"use client";

// ==============================================================================
// RELAY CRM — PUBLIC LANDING PAGE
// Complete Production Presentation & Interactive Architecture Showcase
// ==============================================================================

import * as React from "react";
import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  Eye,
  TrendingUp,
  Sparkles,
  PhoneCall,
  Calendar,
  CreditCard,
  Building2,
  Zap,
  Award,
  ChevronDown,
  ChevronRight,
  Star,
  Check,
  Layers,
  Bot,
  Send,
  Database,
  HelpCircle,
  Menu,
  X,
  ArrowUpRight,
  Activity,
  ArrowRightLeft,
  Briefcase,
  UserCheck,
  BellRing,
} from "lucide-react";

// Dynamically load the WebGL / R3F particle scene on client with SSR fallback
const InteractiveParticleField = dynamic(
  () =>
    import("@/components/landing/interactive-particle-field").then(
      (mod) => mod.InteractiveParticleField
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(#274A3D_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />
    ),
  }
);

export default function HomePage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "leads" | "crm">("dashboard");
  const [demoRole, setDemoRole] = useState<"owner" | "admin" | "user">("owner");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const screenshots = {
    dashboard: {
      title: "Operational Command Center",
      subtitle: "Live response velocity, 24-hour lead trend, on-call capacity, and SLA compliance.",
      src: "/landing/dashboard-overview.png",
      alt: "Relay CRM Executive Dashboard with SLA response charts and metrics",
      bullets: [
        "Real-time calculation of team average response speed (83s hackathon verified)",
        "On-call dispatch roster monitoring active vs maximum lead capacity",
        "Direct one-click access to Public Intake Forms and manual lead entry",
      ],
    },
    leads: {
      title: "Real-Time SLA Intake & Dispatch Queue",
      subtitle: "Atomic round-robin dispatching, strict countdown timers, and automated recovery.",
      src: "/landing/leads-queue.png",
      alt: "Relay CRM Inbound Lead Queue with live SLA countdowns and one-click acknowledgement",
      bullets: [
        "15-minute countdown timers tracking response deadlines down to the second",
        "Atomic PostgreSQL locking to prevent double-dispatch or concurrent assignment",
        "One-click response logging that instantly halts the SLA clock and records audit history",
      ],
    },
    crm: {
      title: "CRM Deals Pipeline & Server-Side Financial Masking",
      subtitle: "Multi-stage Kanban pipelines with enforced privacy for field staff.",
      src: "/landing/crm-pipeline.png",
      alt: "Relay CRM Deal Pipeline with server-side masked financial deal values",
      bullets: [
        "Drag-and-drop opportunity pipelines mapped to service business stages",
        "Server-side financial masking: deal values stripped to null for standard field technicians",
        "Full contact and company account linking with custom field flexibility",
      ],
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8] text-[#18181B] selection:bg-[#1E3A2F] selection:text-white">
      {/* ===================================================================== */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E3A2F] text-white shadow-sm font-bold text-sm tracking-tight transition-transform group-hover:scale-105">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#18181B]">
                Relay CRM
              </span>
              <span className="text-[10px] text-[#71717A] tracking-wider uppercase font-medium">
                Unified Operations
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#52525B]">
            <a href="#showcase" className="hover:text-[#18181B] transition-colors">
              Platform
            </a>
            <a href="#pillars" className="hover:text-[#18181B] transition-colors">
              Core Pillars
            </a>
            <a href="#role-security" className="hover:text-[#18181B] transition-colors">
              Role Security & Switching
            </a>
            <a href="#testimonials" className="hover:text-[#18181B] transition-colors">
              Case Studies
            </a>
            <a href="#pricing" className="hover:text-[#18181B] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#18181B] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Header Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-[#52525B] hover:text-[#18181B] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-8 px-3.5 text-xs font-medium rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#F4F4F0] transition-colors shadow-2xs gap-1.5"
            >
              Live Demo
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-8 px-3.5 text-xs font-medium rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-colors shadow-sm gap-1.5"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#52525B] hover:bg-[#F4F4F0]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E5E5E0] bg-white px-4 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-xs font-medium text-[#52525B]">
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#18181B]"
              >
                Platform
              </a>
              <a
                href="#pillars"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#18181B]"
              >
                Core Pillars
              </a>
              <a
                href="#role-security"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#18181B]"
              >
                Role Security & Switching
              </a>
              <a
                href="#testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#18181B]"
              >
                Case Studies
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#18181B]"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#18181B]"
              >
                FAQ
              </a>
            </div>
            <div className="pt-3 border-t border-[#EFEFEA] flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full text-center py-2 text-xs font-medium rounded-lg border border-[#E5E5E0] bg-white text-[#18181B]"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="w-full text-center py-2 text-xs font-medium rounded-lg bg-[#1E3A2F] text-white"
              >
                Create Workspace
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 2. HERO SECTION */}
      {/* ===================================================================== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#E5E5E0] bg-gradient-to-b from-[#FAFAF8] via-white to-[#FAFAF8]"
      >
        {/* Interactive Forest Green Three.js Particle Scene */}
        <InteractiveParticleField containerRef={heroRef} />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-8 text-center space-y-6">
          {/* Top Pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#D2E0D5] bg-[#E8EFE9]/90 backdrop-blur-xs px-3.5 py-1 text-xs font-semibold text-[#1E3A2F] shadow-2xs"
          >
            <span className="h-2 w-2 rounded-full bg-[#1E3A2F] animate-pulse" />
            National University Hackathon · 15-Minute Response SLA System
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.65,
              delay: shouldReduceMotion ? 0 : 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-[#18181B] max-w-4xl mx-auto leading-[1.12]"
          >
            Never let a high-value customer lead go unanswered.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.65,
              delay: shouldReduceMotion ? 0 : 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-base sm:text-lg text-[#52525B] leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Relay CRM is the unified operational management platform built for service businesses with 5–30 employees.
            Atomic round-robin dispatch, strict 15-minute response deadlines, and automated recovery — with server-side financial masking.
          </motion.p>

          {/* Dual CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.65,
              delay: shouldReduceMotion ? 0 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 text-sm font-semibold rounded-xl bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-all shadow-md hover:shadow-lg gap-2"
              >
                Start Free Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 text-sm font-semibold rounded-xl border border-[#D2E0D5] bg-white/90 backdrop-blur-xs text-[#18181B] hover:bg-[#F4F4F0] transition-colors shadow-2xs gap-2"
              >
                Explore Live Dashboard
                <ArrowUpRight className="h-4 w-4 text-[#71717A]" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Verification Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.65,
              delay: shouldReduceMotion ? 0 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-10 max-w-3xl mx-auto text-left"
          >
            <div className="rounded-xl border border-[#E5E5E0] bg-white/95 backdrop-blur-xs p-3.5 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A2F]">
                <Clock className="h-3.5 w-3.5" />
                <span>Response Speed</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#18181B] mt-1">83s Avg</div>
              <p className="text-[10px] text-[#71717A] mt-0.5">Tested across live acknowledgements</p>
            </div>

            <div className="rounded-xl border border-[#E5E5E0] bg-white/95 backdrop-blur-xs p-3.5 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A2F]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Hard SLA</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#18181B] mt-1">15 Mins</div>
              <p className="text-[10px] text-[#71717A] mt-0.5">Automated manager escalation</p>
            </div>

            <div className="rounded-xl border border-[#E5E5E0] bg-white/95 backdrop-blur-xs p-3.5 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A2F]">
                <Lock className="h-3.5 w-3.5" />
                <span>Data Isolation</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#18181B] mt-1">100% RLS</div>
              <p className="text-[10px] text-[#71717A] mt-0.5">Multi-tenant PostgreSQL policies</p>
            </div>

            <div className="rounded-xl border border-[#E5E5E0] bg-white/95 backdrop-blur-xs p-3.5 shadow-2xs hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A2F]">
                <Zap className="h-3.5 w-3.5" />
                <span>Lead Races</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#18181B] mt-1">0 Duplicates</div>
              <p className="text-[10px] text-[#71717A] mt-0.5">Atomic stored procedures</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. INTERACTIVE PLATFORM SHOWCASE (Screenshots with Tabs) */}
      {/* ===================================================================== */}
      <section id="showcase" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-b border-[#E5E5E0]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl space-y-8"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#1E3A2F]">
              Real Operational Software
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              See Relay CRM in action.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              Switch tabs to explore authentic screens captured directly from the live production build.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl bg-[#FAFAF8] p-1.5 border border-[#E5E5E0] gap-1 shadow-2xs overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "dashboard"
                    ? "bg-[#1E3A2F] text-white shadow-sm"
                    : "text-[#52525B] hover:text-[#18181B]"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Executive Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("leads")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "leads"
                    ? "bg-[#1E3A2F] text-white shadow-sm"
                    : "text-[#52525B] hover:text-[#18181B]"
                }`}
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>SLA Queue & Dispatch</span>
              </button>
              <button
                onClick={() => setActiveTab("crm")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "crm"
                    ? "bg-[#1E3A2F] text-white shadow-sm"
                    : "text-[#52525B] hover:text-[#18181B]"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Deals Pipeline & Masking</span>
              </button>
            </div>
          </div>

          {/* Screenshot Display Window */}
          <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-2.5 sm:p-4 shadow-xl">
            {/* Top Browser Window Simulation Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5E0] bg-white rounded-t-xl mb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E5E0]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E5E0]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E5E0]" />
              </div>
              <div className="text-[11px] font-mono text-[#71717A] bg-[#FAFAF8] px-3 py-0.5 rounded-md border border-[#E5E5E0]">
                https://app.relaycrm.com/{activeTab === "dashboard" ? "dashboard" : activeTab === "leads" ? "leads" : "crm"}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#1E3A2F] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A2F]" />
                Live Demo
              </div>
            </div>

            {/* Selected Screenshot Container */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-[#E5E5E0] bg-white shadow-inner">
              <img
                src={screenshots[activeTab].src}
                alt={screenshots[activeTab].alt}
                className="w-full h-full object-cover object-top transition-opacity duration-300"
              />
            </div>

            {/* Description & Engineering Highlights */}
            <div className="mt-4 p-4 rounded-xl bg-white border border-[#E5E5E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#18181B]">
                  {screenshots[activeTab].title}
                </h4>
                <p className="text-xs text-[#71717A]">
                  {screenshots[activeTab].subtitle}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] text-[#52525B]">
                {screenshots[activeTab].bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1E3A2F] shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 4. THE BROKEN WAY VS THE RELAY WAY */}
      {/* ===================================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-[#FAFAF8] border-b border-[#E5E5E0]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-5xl space-y-10"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#991B1B]">
              The Core Problem in Field Services
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              Why service businesses lose 40% of their inbound deals.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              Fast response times win 78% of service jobs. Yet traditional dispatching is broken.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Broken Old Way */}
            <div className="rounded-2xl border border-[#FCA5A5] bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#FEE2E2]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#991B1B]">
                    <X className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#991B1B]">
                    The Broken Old Way (Shared Inboxes & Chat)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-[#991B1B] uppercase bg-[#FEF2F2] px-2 py-0.5 rounded">
                  Revenue Leak
                </span>
              </div>

              <ul className="space-y-3 text-xs text-[#52525B]">
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span><strong>3.5 Hour Average Response:</strong> Inbound quote inquiries sit in a cluttered Gmail inbox until someone checks it between jobs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span><strong>Double Calling & Collisions:</strong> Two technicians reach out to the same commercial lead, confusing the customer and wasting labor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span><strong>Unintended Financial Exposure:</strong> Field technicians can see corporate contract amounts, profit margins, and revenue figures.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span><strong>Silent Sick Leave Loss:</strong> When a technician calls in sick or goes on leave, their pending leads sit unacknowledged for days.</span>
                </li>
              </ul>
            </div>

            {/* The Relay Way */}
            <div className="rounded-2xl border border-[#A7F3D0] bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#D1FAE5]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                    <Check className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#059669]">
                    The Relay CRM Way (Automated Operations)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-[#059669] uppercase bg-[#ECFDF5] px-2 py-0.5 rounded">
                  Guaranteed SLA
                </span>
              </div>

              <ul className="space-y-3 text-xs text-[#52525B]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>83-Second Response Velocity:</strong> Round-robin engine dispatches to on-call staff instantly with atomic row locking.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>Strict 15-Min Hard SLA:</strong> Unacknowledged leads escalate automatically to managers and quarantine into the Recovery Queue.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>Server-Side Deal Masking:</strong> Technicians see project scopes and customer notes; financial deal values are masked to null.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>F3.6 Absence Redistribution:</strong> Marking yourself on leave instantly redistributes unacknowledged leads to available staff.</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 5. THE 4 OPERATIONAL PILLARS */}
      {/* ===================================================================== */}
      <section id="pillars" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-b border-[#E5E5E0]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl space-y-12"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#1E3A2F]">
              Engineering Architecture
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              Built on 4 unshakeable operational pillars.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              Engineered with PostgreSQL atomic transactions, row-level security, and background worker queues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-3 hover:border-[#1E3A2F] transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-white">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[#18181B]">
                1. Atomic Round-Robin Dispatch & Concurrency Control
              </h4>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Relay CRM executes the custom PostgreSQL stored procedure <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E5E0] font-mono text-[11px] text-[#1E3A2F]">assign_lead_atomic()</code>.
                It enforces round-robin order, evaluates team member lead limits (<code className="font-mono text-[11px]">max_active_leads</code>), and locks records with row-level mutexes to eliminate race conditions.
              </p>
              <div className="pt-2 text-[11px] text-[#1E3A2F] font-semibold flex items-center gap-1">
                <span>Verified concurrency test: Exactly 1 worker wins race condition</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-3 hover:border-[#1E3A2F] transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-white">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[#18181B]">
                2. 15-Minute Response SLA Timers & Automated Recovery
              </h4>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Every newly dispatched lead starts an immutable 15-minute response deadline. If the assigned employee does not click <em>Acknowledge</em> within 15 minutes, Tier 1 automated escalation notifies management and reassigns to the next available teammate. Repeated breaches automatically isolate into the Recovery Queue.
              </p>
              <div className="pt-2 text-[11px] text-[#1E3A2F] font-semibold flex items-center gap-1">
                <span>Halts timer immediately upon acknowledgement with SLA duration audit</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-3 hover:border-[#1E3A2F] transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-white">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[#18181B]">
                3. Role-Based Access Control & Server-Side Financial Masking
              </h4>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Service owners should never have to worry about field crew leaking contract margins. Relay CRM enforces <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E5E0] font-mono text-[11px] text-[#1E3A2F]">applyFinancialMasking()</code> directly on the server before transmitting JSON. Deal values are returned as <code className="font-mono text-[11px]">null</code> with an indicator flag, making DevTools snooping impossible.
              </p>
              <div className="pt-2 text-[11px] text-[#1E3A2F] font-semibold flex items-center gap-1">
                <span>Multi-tenant RLS guarantees zero cross-workspace data leakage</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-3 hover:border-[#1E3A2F] transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-white">
                <Bot className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[#18181B]">
                4. Production Omnichannel Integrations (Phase 3 Verified)
              </h4>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Seamlessly connects to the tools service teams rely on daily: Telegram instant bot push alerts, Twilio SMS fallbacks for urgent escalations, Stripe payment invoice checkouts with webhook reconciliation, and Google Calendar two-way scheduling synchronization.
              </p>
              <div className="pt-2 text-[11px] text-[#1E3A2F] font-semibold flex items-center gap-1">
                <span>Webhook signature validation & secret key encryption in place</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 6. INTERACTIVE ROLE SWITCHER DEMONSTRATION */}
      {/* (Directly addressing: "tell us the switching roles, like how one can switch?") */}
      {/* ===================================================================== */}
      <section id="role-security" className="py-16 sm:py-24 px-4 sm:px-8 bg-[#FAFAF8] border-b border-[#E5E5E0]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-5xl space-y-10"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D2E0D5] bg-[#E8EFE9] px-3 py-0.5 text-xs font-semibold text-[#1E3A2F]">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Role Switching & Governance
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              How role switching works in Relay CRM.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              Click between the personas below to see how our multi-tenant authorization and financial masking dynamically adapt in real time.
            </p>
          </div>

          {/* Interactive Role Toggle Switcher */}
          <div className="rounded-2xl border border-[#E5E5E0] bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFEFEA]">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                  Test Role Perspective
                </span>
                <p className="text-xs text-[#71717A]">
                  Select a persona to inspect their exact dashboard visibility and permissions:
                </p>
              </div>

              {/* Persona Buttons */}
              <div className="inline-flex rounded-xl bg-[#FAFAF8] p-1 border border-[#E5E5E0] gap-1">
                <button
                  onClick={() => setDemoRole("owner")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    demoRole === "owner"
                      ? "bg-[#1E3A2F] text-white shadow-xs"
                      : "text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  👑 Owner
                </button>
                <button
                  onClick={() => setDemoRole("admin")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    demoRole === "admin"
                      ? "bg-[#1E3A2F] text-white shadow-xs"
                      : "text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  🛡️ Admin
                </button>
                <button
                  onClick={() => setDemoRole("user")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    demoRole === "user"
                      ? "bg-[#1E3A2F] text-white shadow-xs"
                      : "text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  👷 Field Staff (User)
                </button>
              </div>
            </div>

            {/* Simulated Live View comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Authority Level */}
              <div className="p-4 rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#71717A] uppercase">Authority Level</span>
                  <span className="rounded bg-[#E8EFE9] px-2 py-0.5 text-[10px] font-bold text-[#1E3A2F] uppercase">
                    {demoRole}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#18181B]">
                  {demoRole === "owner" && "Full Workspace Authority"}
                  {demoRole === "admin" && "Operational & Team Dispatch"}
                  {demoRole === "user" && "Field Operations & Intake"}
                </div>
                <p className="text-xs text-[#52525B]">
                  {demoRole === "owner" && "Full administrative power: workspace billing, Stripe checkout, audit logs, team invites, and unmasked financials."}
                  {demoRole === "admin" && "Team management: capacity adjustments, lead reassignments, audit inspection, and unmasked financials."}
                  {demoRole === "user" && "Operational execution: on-call intake, lead acknowledgement, customer communication, and masked deal values."}
                </p>
              </div>

              {/* Card 2: CRM Pipeline Visibility (Simulating applyFinancialMasking) */}
              <div className="p-4 rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#71717A] uppercase">Pipeline Deal Value</span>
                  {demoRole === "user" ? (
                    <span className="rounded bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#854D0E] uppercase flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> Masked
                    </span>
                  ) : (
                    <span className="rounded bg-[#E8EFE9] px-2 py-0.5 text-[10px] font-bold text-[#1E3A2F] uppercase">
                      Unmasked
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-[#18181B] font-mono">
                  {demoRole === "user" ? (
                    <span className="text-[#854D0E]">$— (Restricted on Server)</span>
                  ) : (
                    <span className="text-[#1E3A2F]">$75,000.00</span>
                  )}
                </div>
                <p className="text-xs text-[#52525B]">
                  {demoRole === "user"
                    ? "Server removes monetary_value before API transmission. Field technician cannot see total company contract margin."
                    : "Owner/Admin receives full unmasked deal volume, revenue totals, and pipeline velocity metrics."}
                </p>
              </div>

              {/* Card 3: System Access Boundary */}
              <div className="p-4 rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#71717A] uppercase">System Access</span>
                  <span className="text-[11px] font-semibold text-[#1E3A2F]">
                    {demoRole === "user" ? "Restricted" : "Full Access"}
                  </span>
                </div>
                <ul className="text-xs space-y-1 text-[#52525B]">
                  <li className="flex items-center gap-1.5">
                    {demoRole === "user" ? (
                      <X className="h-3.5 w-3.5 text-[#991B1B]" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    )}
                    <span>Audit Trail Log Inspection</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    {demoRole === "user" ? (
                      <X className="h-3.5 w-3.5 text-[#991B1B]" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    )}
                    <span>Team Management & Capacity</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    {demoRole === "owner" ? (
                      <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-[#991B1B]" />
                    )}
                    <span>Workspace Billing & Stripe Plan</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Detailed Instructions on How To Switch in Relay CRM */}
            <div className="rounded-xl border border-[#D2E0D5] bg-[#E8EFE9]/40 p-4 space-y-3">
              <h4 className="text-xs font-bold text-[#1E3A2F] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                How One Can Switch Roles in Relay CRM:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#52525B]">
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E5E0]">
                  <span className="font-bold text-[#18181B] block mb-0.5">1. Team Management Console</span>
                  <span>Navigate to <strong className="text-[#18181B]">/team</strong>. Owners and Admins can click <em>Edit</em> next to any member to promote or demote their role between Owner, Admin, and User.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E5E0]">
                  <span className="font-bold text-[#18181B] block mb-0.5">2. One-Click Role Switcher</span>
                  <span>Inside the <strong className="text-[#18181B]">/team</strong> view, click the <em>Switch To</em> buttons to test your active role in real-time without ever getting locked out of ownership.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E5E0]">
                  <span className="font-bold text-[#18181B] block mb-0.5">3. Database Level Security</span>
                  <span>Roles are stored in <code className="font-mono text-[10px]">workspace_members.role</code>. RLS policies and server actions immediately enforce the updated boundary across all API endpoints.</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 7. SOCIAL PROOF & CONTRACTOR TESTIMONIALS */}
      {/* ===================================================================== */}
      <section id="testimonials" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-b border-[#E5E5E0]">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#1E3A2F]">
              Trusted By Service Fleets
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              Real results for real service contractors.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              From commercial HVAC technicians to emergency plumbing crews, Relay CRM eliminates lost revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-[#F59E0B]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-[#52525B] leading-relaxed italic">
                  "Our average quote response time plunged from 4 hours to 72 seconds. Customers constantly tell us they chose us simply because we answered before our competitors even saw the inquiry."
                </p>
              </div>
              <div className="pt-4 border-t border-[#EFEFEA] flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A2F] text-white font-bold text-xs">
                  M
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#18181B]">Marcus Vance</h5>
                  <p className="text-[10px] text-[#71717A]">Apex Mechanical Systems · 24 Employees</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-[#F59E0B]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-[#52525B] leading-relaxed italic">
                  "The automatic absence reassignment (F3.6) saved us multiple times. When an electrician is on a ladder or marks themselves busy, the lead instantly shifts to the next on-call tech without missing a beat."
                </p>
              </div>
              <div className="pt-4 border-t border-[#EFEFEA] flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A2F] text-white font-bold text-xs">
                  S
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#18181B]">Sarah Jenkins</h5>
                  <p className="text-[10px] text-[#71717A]">Beacon Electrical Contractors · 14 Employees</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-[#FAFAF8] p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-[#F59E0B]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-[#52525B] leading-relaxed italic">
                  "Server-side financial masking is essential for us. Our subcontractors and field techs get exact project scopes and customer notes, but they never see total contract margin numbers."
                </p>
              </div>
              <div className="pt-4 border-t border-[#EFEFEA] flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A2F] text-white font-bold text-xs">
                  D
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#18181B]">David Chen</h5>
                  <p className="text-[10px] text-[#71717A]">Benchmark Commercial Roofing · 19 Employees</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. TRANSPARENT PRICING GRID */}
      {/* ===================================================================== */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-8 bg-[#FAFAF8] border-b border-[#E5E5E0]">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#1E3A2F]">
              Simple, Predictable Plans
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              Invest in response speed. Pay for results.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              All plans include atomic round-robin dispatching, strict 15-minute response SLA tracking, and multi-tenant security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-white p-6 space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#18181B]">Starter Workspace</h4>
                  <p className="text-xs text-[#71717A]">For evaluation and small dispatch teams.</p>
                </div>
                <div className="text-3xl font-black text-[#18181B]">$0 <span className="text-xs font-normal text-[#71717A]">/ month</span></div>
                <ul className="space-y-2.5 text-xs text-[#52525B]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Up to 5 team members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>15-Minute response SLA countdown</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>CRM contacts & account linking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Server-side financial masking</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center py-2 text-xs font-semibold rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#F4F4F0] transition-colors"
              >
                Create Free Workspace
              </Link>
            </div>

            {/* Growth / Pro (Featured) */}
            <div className="rounded-2xl border-2 border-[#1E3A2F] bg-white p-6 space-y-6 shadow-lg relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1E3A2F] text-white px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Most Popular for Fleets
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#18181B]">Pro Operations</h4>
                  <p className="text-xs text-[#71717A]">For active service crews (5–20 staff).</p>
                </div>
                <div className="text-3xl font-black text-[#18181B]">$49 <span className="text-xs font-normal text-[#71717A]">/ month</span></div>
                <ul className="space-y-2.5 text-xs text-[#52525B]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Up to 20 team members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Atomic round-robin dispatch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Automated Tier 1 & Tier 2 SLA escalation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Telegram & Twilio SMS push alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Stripe & Google Calendar sync</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center py-2 text-xs font-semibold rounded-lg bg-[#1E3A2F] text-white hover:bg-[#162C24] transition-colors shadow-sm"
              >
                Start 14-Day Pro Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-[#E5E5E0] bg-white p-6 space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#18181B]">Enterprise Fleet</h4>
                  <p className="text-xs text-[#71717A]">High volume multi-location service brands.</p>
                </div>
                <div className="text-3xl font-black text-[#18181B]">$129 <span className="text-xs font-normal text-[#71717A]">/ month</span></div>
                <ul className="space-y-2.5 text-xs text-[#52525B]">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Unlimited team seats & branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Customizable SLA threshold deadlines</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Immutable Audit Trail CSV export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#1E3A2F]" />
                    <span>Dedicated Recovery Queue SLA manager</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center py-2 text-xs font-semibold rounded-lg border border-[#E5E5E0] bg-white text-[#18181B] hover:bg-[#F4F4F0] transition-colors"
              >
                Contact Fleet Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 9. FREQUENTLY ASKED QUESTIONS (Interactive Accordion) */}
      {/* ===================================================================== */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-8 bg-white border-b border-[#E5E5E0]">
        <div className="mx-auto max-w-4xl space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#1E3A2F]">
              Clear Answers
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
              Frequently asked questions.
            </h3>
            <p className="text-xs sm:text-sm text-[#71717A]">
              Everything you need to know about SLA timers, role switching, and multi-tenant security.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How does the 15-minute response SLA timer operate?",
                a: "When a lead enters through the public intake form or API, Relay CRM atomically assigns it to the on-call employee with capacity. A 15-minute deadline is written to the database. If the employee does not acknowledge the lead before the timer expires, an automated background worker triggers Tier 1 escalation, notifies management via Telegram/Twilio, and re-routes the lead. Acknowledging immediately halts the timer and saves the response duration to the audit log.",
              },
              {
                q: "How can someone switch roles in the application?",
                a: "Relay CRM supports three primary workspace roles: Owner, Admin, and User. Inside the Team view (/team), an Owner or Admin can click 'Edit' next to any member to promote or demote their role or toggle financial masking. Additionally, authorized users can use the built-in 'Role Perspective Switcher' on /team to test what standard field staff see vs what administrators see in real time.",
              },
              {
                q: "How does server-side financial masking work? Can DevTools see the numbers?",
                a: "No. Unlike tools that simply hide text using CSS, Relay CRM enforces applyFinancialMasking() directly on the server before transmitting JSON. For users marked with restricted financial permissions, monetary_value is replaced with null on the wire and flagged with _financials_masked: true. Inspecting the network payload in Chrome DevTools reveals zero sensitive financial margin data.",
              },
              {
                q: "What happens when an employee goes on leave or calls in sick?",
                a: "Under our F3.6 Absence Reassignment Policy, when a team member sets their status to 'On Leave' or 'Offline', the system instantly identifies all of their unacknowledged leads and reassigns them to other active, on-duty team members below capacity. Leads that have already been acknowledged remain with the employee so ongoing customer conversations are not abruptly interrupted.",
              },
              {
                q: "Can Relay CRM integrate with my existing Stripe and Google Calendar accounts?",
                a: "Yes. Phase 3 integrations include complete Stripe Checkout payment link creation with webhook verification, as well as bi-directional Google Calendar scheduling. You can manage and test these connections directly in /integrations.",
              },
              {
                q: "Is each business workspace isolated and secure?",
                a: "Yes. Multi-tenancy is enforced at the database level with PostgreSQL Row Level Security (RLS) policies. Every query requires an authenticated workspace_id match. Cross-tenant leakage tests verify that unauthorized workspaces cannot read or manipulate another business's leads, contacts, or pipelines.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(i)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-[#18181B] hover:bg-[#F4F4F0]"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#71717A] shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180 text-[#1E3A2F]" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="p-4 pt-0 text-xs text-[#52525B] leading-relaxed border-t border-[#EFEFEA] bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 10. PRE-FOOTER FINAL CTA BANNER */}
      {/* ===================================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-[#1E3A2F] text-white">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-[#A7F3D0]" />
            Launch in under 60 seconds
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop losing five-figure contracts to slow response times.
          </h2>

          <p className="text-xs sm:text-sm text-[#D2E0D5] max-w-xl mx-auto leading-relaxed">
            Equip your service business with autonomous round-robin dispatch, strict response deadlines, and server-side financial protection today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 text-sm font-semibold rounded-xl bg-white text-[#1E3A2F] hover:bg-[#FAFAF8] transition-colors shadow-md gap-2"
            >
              Create Free Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 text-sm font-semibold rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors gap-2"
            >
              Enter Live Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ===================================================================== */}
      {/* 11. FOOTER */}
      {/* ===================================================================== */}
      <footer className="border-t border-[#E5E5E0] bg-white py-12 px-4 sm:px-8 text-xs text-[#71717A]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3A2F] text-white font-bold text-xs">
              R
            </div>
            <div>
              <span className="font-bold text-[#18181B] block">Relay CRM</span>
              <span className="text-[10px]">Autonomous Operations for Service Fleets</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] text-[#52525B]">
            <a href="#showcase" className="hover:text-[#18181B]">Platform</a>
            <a href="#pillars" className="hover:text-[#18181B]">Architecture</a>
            <a href="#role-security" className="hover:text-[#18181B]">Role Security</a>
            <a href="#pricing" className="hover:text-[#18181B]">Pricing</a>
            <a href="#faq" className="hover:text-[#18181B]">FAQ</a>
            <Link href="/login" className="hover:text-[#18181B]">Sign In</Link>
            <Link href="/signup" className="hover:text-[#18181B]">Create Workspace</Link>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#52525B]">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            <span>National University Hackathon · Production Build</span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl mt-8 pt-6 border-t border-[#EFEFEA] text-center text-[10px] text-[#A1A1AA]">
          © {new Date().getFullYear()} Relay CRM. Multi-Tenant Enterprise Architecture with PostgreSQL Row Level Security.
        </div>
      </footer>
    </div>
  );
}
