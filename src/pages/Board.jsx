import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import BoardFilters from "@/components/BoardFilters";
import JobCard from "@/components/JobCard";
import useJobs from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 24;

export default function Board() {
  const { jobs, companies, fetchedAt, loading, error, reload } = useJobs();

  const [keyword, setKeyword] = useState(
    () => new URLSearchParams(window.location.search).get("q") ?? "",
  );
  const [location, setLocation] = useState("");
  const [employment, setEmployment] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [keyword, location, employment, remoteOnly]);

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const loc = location.trim().toLowerCase();

    return jobs.filter((job) => {
      if (kw && !`${job.title} ${job.company}`.toLowerCase().includes(kw)) return false;
      if (loc && !String(job.location ?? "").toLowerCase().includes(loc)) return false;
      if (employment !== "all" && job.employmentType !== employment) return false;
      if (remoteOnly && job.workplaceType !== "remote" && job.workplaceType !== "hybrid") return false;
      return true;
    });
  }, [jobs, keyword, location, employment, remoteOnly]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = results.slice(start, start + PAGE_SIZE);

  const goToPage = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setKeyword("");
    setLocation("");
    setEmployment("all");
    setRemoteOnly(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground">
              AB
            </span>
            <span className="font-display text-lg tracking-tight">Ashby Board</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={reload}
              disabled={loading}
              className="hidden rounded-full sm:inline-flex"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/add-company">
                <Plus className="mr-2 h-4 w-4" />
                Add a company
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Open roles, everywhere.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Live postings from {companies.length} Ashby job board{companies.length === 1 ? "" : "s"}
          {fetchedAt ? ` · updated ${new Date(fetchedAt).toLocaleString()}` : ""}
        </p>

        <div className="mt-8">
          <BoardFilters
            keyword={keyword}
            onKeywordChange={setKeyword}
            location={location}
            onLocationChange={setLocation}
            employment={employment}
            onEmploymentChange={setEmployment}
            remoteOnly={remoteOnly}
            onRemoteOnlyChange={setRemoteOnly}
          />
        </div>

        {loading ? (
          <div className="mt-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Gathering roles from every board…</p>
          </div>
        ) : error ? (
          <div className="mt-16 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-border bg-card p-12 text-center">
            <p className="font-display text-xl">No roles match those filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a broader keyword, or clear the filters.
            </p>
            <Button variant="outline" className="mt-5 rounded-full" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-8 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {results.length} role{results.length === 1 ? "" : "s"} match
            </p>

            <div className="mt-4 grid gap-3">
              {pageItems.map((job) => (
                <JobCard key={`${job.company}-${job.id}`} job={job} />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, results.length)} of{" "}
                {results.length} roles
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}