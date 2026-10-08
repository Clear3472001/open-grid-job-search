import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Loader2, Plus } from "lucide-react";
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
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [keyword, location, employment, remoteOnly, source]);

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const loc = location.trim().toLowerCase();

    return jobs.filter((job) => {
      if (kw && !`${job.title} ${job.company}`.toLowerCase().includes(kw)) return false;
      if (loc && !String(job.location ?? "").toLowerCase().includes(loc)) return false;
      if (employment !== "all" && job.employmentType !== employment) return false;
      if (source !== "all" && job.ats !== source) return false;
      if (remoteOnly && job.workplaceType !== "remote" && job.workplaceType !== "hybrid") return false;
      return true;
    });
  }, [jobs, keyword, location, employment, remoteOnly, source]);

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
    setSource("all");
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-4.5 w-4.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Open Grid</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/add-company">
                <Plus className="mr-1.5 h-4 w-4" />
                Add a company
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Open roles, everywhere.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {companies.length} compan{companies.length === 1 ? "y" : "ies"} on the grid
          {fetchedAt ? ` · updated ${new Date(fetchedAt).toLocaleString()}` : ""}
        </p>

        <div className="mt-6">
          <BoardFilters
            keyword={keyword}
            onKeywordChange={setKeyword}
            location={location}
            onLocationChange={setLocation}
            employment={employment}
            onEmploymentChange={setEmployment}
            remoteOnly={remoteOnly}
            onRemoteOnlyChange={setRemoteOnly}
            source={source}
            onSourceChange={setSource}
          />
        </div>

        {loading ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">Loading roles from the grid…</p>
          </div>
        ) : error ? (
          <div className="mt-20 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-20 rounded-lg border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No roles match those filters.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Try a broader keyword, or clear the filters.
            </p>
            <Button variant="outline" className="mt-5" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-xs font-medium text-muted-foreground">
              {results.length} role{results.length === 1 ? "" : "s"}
            </p>

            <div className="mt-3 grid gap-3">
              {pageItems.map((job) => (
                <JobCard key={`${job.ats}-${job.company}-${job.id}`} job={job} />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, results.length)} of {results.length}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
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