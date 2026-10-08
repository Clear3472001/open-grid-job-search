import React from "react";
import { AlertTriangle } from "lucide-react";

export default function Oops() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We couldn't complete that request. Please try again in a moment.
        </p>
      </div>
    </main>
  );
}