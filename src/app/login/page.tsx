"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_COOKIE_NAME, isValidPassword, clearUserCookieInBrowser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("logout") === "1") {
      clearUserCookieInBrowser();
      setSuccess("You have been logged out.");
    }
  }, [params]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = password.trim();
    if (!isValidPassword(value)) {
      setError("Incorrect password. Please try again.");
      return;
    }
    const encoded = encodeURIComponent(value);
    document.cookie = `${USER_COOKIE_NAME}=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.replace("/");
  }

  return (
    <div className="min-h-screen p-6 sm:p-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Enter Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-end">
                <Button type="submit">Continue</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


