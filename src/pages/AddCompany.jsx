import React from "react";
import { Link } from "react-router-dom";
import { Building2, Layers, Loader2, RefreshCw } from "lucide-react";
import { ATS_LABEL } from "@/lib/ats";
import CompanyAdd from "@/components/company/CompanyAdd";
import useJobs from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";

export default function AddCompany() {
  const { jobs, companies, loading, reload } = useJobs();

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
          <Link
            to="/board"
            className="flex items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-4.5 w-4.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Open Grid</span>
          </Link>
          <Link
            to="/board"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to the board
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Add a company</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Give us the company's name, which ATS it uses, and its board slug or link. We verify the
          board is live before it appears on the grid.
        </p>

        <div className="mt-8">
          <CompanyAdd onAdded={reload} />
        </div>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            On the grid right now
            <span className="text-sm font-normal text-muted-foreground">
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
                  key={`${company.ats}-${company.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{company.name}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                      {ATS_LABEL[company.ats] ?? company.ats}
                    </span>
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
          <Button asChild variant="outline">
            <Link to="/board">See every role</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}