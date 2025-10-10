"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isValidPassword, readUserIdFromBrowser } from "@/lib/auth";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(() => isValidPassword(readUserIdFromBrowser()));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLoggedIn(isValidPassword(readUserIdFromBrowser()));
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogout() {
    router.push("/login?logout=1");
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="mx-auto max-w-5xl h-16 flex items-center justify-between">
        <Link href="/" className="text-base font-semibold">
          Cake Pricing
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/saved">Saved Cakes</Link>
          </Button>
          {mounted && (
            loggedIn ? (
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">Login</Link>
              </Button>
            )
          )}
        </nav>
      </div>
    </div>
  );
}


