import React from "react";

export default function Oops() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <p className="font-display text-5xl tracking-tight">Something went wrong.</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          This page couldn't be loaded. Please try again later.
        </p>
      </div>
    </main>
  );
}