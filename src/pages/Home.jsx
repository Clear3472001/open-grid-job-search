import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Layers, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HIGHLIGHTS = [
  { icon: Layers, label: "Ashby, Greenhouse & Lever in one feed" },
  { icon: RefreshCw, label: "Refreshed every 15 minutes" },
  { icon: ShieldCheck, label: "No sign-up, just search" },
];

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [trap, setTrap] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (trap.trim()) {
      navigate("/oops", { replace: true });
      return;
    }

    sessionStorage.setItem("opengrid_access", "granted");
    navigate("/board");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <section className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">Open Grid</span>
          </div>

          <h1 className="mx-auto mt-10 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Every open role, straight from the source.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            One searchable feed of live jobs from companies hiring on Ashby, Greenhouse, and Lever.
            Search by title, company, location, or work style, then apply on the original posting.
          </p>

          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </li>
            ))}
          </ul>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-12 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-left shadow-sm"
          >
            <label htmlFor="visitor-name" className="text-xs font-medium text-muted-foreground">
              Your name
            </label>
            <Input
              id="visitor-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name to continue"
              className="mt-2 h-11"
              autoComplete="name"
            />

            {/* Honeypot — hidden from people via CSS, tempting to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={trap}
              onChange={(event) => setTrap(event.target.value)}
              className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px opacity-0"
            />

            <Button type="submit" className="mt-4 h-11 w-full">
              Enter the board
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              We don't store your name — it's just the way in.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}