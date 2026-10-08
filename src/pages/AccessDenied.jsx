import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl tracking-tight">Access unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This session can't continue, and no job data has been loaded. Nothing else will open from
          here.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          Start over
        </Link>
      </div>
    </main>
  );
}