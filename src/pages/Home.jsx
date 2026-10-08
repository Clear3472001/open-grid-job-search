import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Radar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantAccess } from "@/lib/access";

const HIGHLIGHTS = [
  { icon: Radar, label: "Live from Ashby boards" },
  { icon: Zap, label: "Refreshed hourly" },
  { icon: Building2, label: "Many companies, one search" },
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

    grantAccess();
    navigate("/board");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-56 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[26rem] w-[26rem] translate-x-1/3 translate-y-1/3 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground">
              AB
            </span>
            <span className="font-display text-lg tracking-tight">Ashby Board</span>
          </div>

          <h1 className="mt-8 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Every Ashby job board, in one search.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Open roles pulled live from the companies hiring on Ashby. Search by title, company,
            location, work style and employment type — then apply on the original posting.
          </p>

          <ul className="mt-8 flex flex-wrap gap-2">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-3xl border border-border/70 bg-card/85 p-6 shadow-[0_34px_80px_-50px_rgba(20,24,45,0.6)] backdrop-blur sm:p-8"
          >
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Enter the board
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight">Tell us who's looking</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No account, no password — just your name to step inside.
            </p>

            <div className="mt-6 space-y-3">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                aria-label="Enter your name"
                className="h-12 rounded-xl"
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

              <Button type="submit" className="h-12 w-full rounded-xl text-base">
                Enter the board <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              We don't store your name — it's just the way in.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}