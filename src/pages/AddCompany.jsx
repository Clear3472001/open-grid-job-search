import React from "react";
import { Link } from "react-router-dom";
import { Building2, Loader2, RefreshCw } from "lucide-react";
import CompanyAdd from "@/components/company/CompanyAdd";
import useJobs from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";

export default function AddCompany() {
  const { jobs, companies, loading, reload } = useJobs();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/board"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to the board
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Add a company</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Give us the company's name and its Ashby slug or job board link. We verify the board with
          Ashby before it goes live on the site.
        </p>

        <div className="mt-8">
          <CompanyAdd onAdded={reload} />
        </div>

        <section className="mt-12">
          <h2 className="font-display text-xl tracking-tight">
            On the board right now
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {companies.length} companies · {jobs.length} roles
            </span>
          </h2>

          {loading ? (
            <div className="mt-6 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading companies…</span>
            </div>
          ) : companies.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No companies yet — add the first one above.
            </p>
          ) : (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {companies.map((company) => (
                <li
                  key={company.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{company.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {company.syncing ? (
                      <span className="inline-flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        syncing
                      </span>
                    ) : (
                      `${company.count} role${company.count === 1 ? "" : "s"}`
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/board">See every role</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}