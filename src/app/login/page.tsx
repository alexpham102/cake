"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithEmail, signUpWithEmail, signOut } from "@/lib/auth";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (params.get("logout") === "1") {
      (async () => {
        try {
          await signOut();
          setSuccess("You have been logged out.");
        } catch (e: any) {
          setError(e?.message || "Failed to log out");
        }
      })();
    }
  }, [params]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailValue = email.trim();
    const passwordValue = password.trim();
    if (!emailValue || !passwordValue) {
      setError("Email and password are required.");
      return;
    }
    (async () => {
      try {
        if (mode === "signup") {
          await signUpWithEmail(emailValue, passwordValue);
        } else {
          await signInWithEmail(emailValue, passwordValue);
        }
        router.replace("/");
      } catch (e: any) {
        setError(e?.message || "Authentication failed");
      }
    })();
  }

  return (
    <div className="min-h-screen p-6 sm:p-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{mode === "signup" ? "Create account" : "Sign in"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  value={email}
                  placeholder="Email"
                  aria-label="Email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="password"
                  value={password}
                  placeholder="Password"
                  aria-label="Password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
              {success ? (
                <div className="text-sm text-green-600">{success}</div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Have an account? Sign in" : "New here? Sign up"}</Button>
                <Button type="submit">{mode === "signup" ? "Sign up" : "Sign in"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}


