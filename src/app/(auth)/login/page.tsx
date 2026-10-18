"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signInAction,
    {}
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-white shadow-sm font-bold text-base">
            R
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#18181B]">
            Sign in to Relay CRM
          </h2>
          <p className="text-xs text-[#71717A]">
            Enter your credentials to access your company workspace.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-[#E5E5E0] shadow-sm">
          <form action={formAction}>
            <CardContent className="space-y-4 pt-6">
              {state?.error && (
                <Feedback variant="error" title="Sign In Error">
                  {state.error}
                </Feedback>
              )}

              <Input
                label="Email Address"
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
                className="w-full mt-2"
                isLoading={isPending}
              >
                Access Workspace
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2 text-center text-xs text-[#71717A]">
              <div>
                Don&apos;t have a workspace yet?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#1E3A2F] hover:underline"
                >
                  Create one now
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Footnote */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1AA]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1E3A2F]" />
          <span>Role-isolated multi-tenant workspace architecture</span>
        </div>
      </div>
    </div>
  );
}
