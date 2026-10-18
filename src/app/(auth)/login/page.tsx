"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signInAction,
    {}
  );

  return (
    <div className="flex min-h-screen w-full bg-[#FAFAF8]">
      {/* Left 50%: Clean Authentication Interface */}
      <div className="flex w-full lg:w-1/2 flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 overflow-y-auto min-h-screen">
        {/* Top: Wordmark */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3A2F] text-white text-sm font-semibold tracking-tight">
              R
            </div>
            <span className="text-base font-semibold tracking-tight text-[#18181B]">
              Relay CRM
            </span>
          </div>
        </div>

        {/* Center: Auth Form (360-400px comfortable width) */}
        <div className="w-full max-w-[380px] mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181B]">
              Welcome back.
            </h1>
          </div>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-700">
                {state.error}
              </div>
            )}

            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="operator@company.com"
              required
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full h-10 mt-2 text-sm font-medium bg-[#1E3A2F] hover:bg-[#162B23] text-white"
              isLoading={isPending}
            >
              Sign in
            </Button>

            <p className="text-center text-xs text-[#71717A] pt-4">
              Don&apos;t have a workspace?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#1E3A2F] hover:underline"
              >
                Create workspace
              </Link>
            </p>
          </form>
        </div>

        {/* Quiet baseline alignment */}
        <div className="hidden sm:block h-6" />
      </div>

      {/* Right 50%: Sophisticated, Restrained Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A2F] text-white flex-col justify-between p-12 xl:p-20 relative overflow-hidden select-none">
        <div className="text-xs uppercase tracking-widest text-[#8FB79E] font-medium font-mono">
          Relay Operational Engine
        </div>

        <div className="my-auto max-w-md space-y-4">
          <h2 className="text-3xl xl:text-4xl font-normal tracking-tight text-[#FAFAF8] leading-[1.2]">
            Every lead answered.<br />
            <span className="text-[#8FB79E]">Every SLA honored.</span>
          </h2>
          <p className="text-sm text-[#E8EFE9]/75 leading-relaxed font-light">
            Engineered for high-velocity service businesses where sub-minute response speed and team accountability drive client retention.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-[#E8EFE9]/40 font-mono">
          <span>Zero Lead Leakage</span>
          <span>Autonomous Dispatch</span>
        </div>
      </div>
    </div>
  );
}
