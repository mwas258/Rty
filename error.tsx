"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] route error", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 text-center text-fg">
      <div>
        <AlertTriangle className="mx-auto h-12 w-12 text-danger" />
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">An unexpected error occurred. It has been logged{error.digest ? ` (ref ${error.digest})` : ""}.</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
