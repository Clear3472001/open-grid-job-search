import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Builds a page list like [1, "…", 4, 5, 6, "…", 10]: first and last page always,
// plus a window of pages around the current one, with ellipsis gaps.
function buildPageList(currentPage, totalPages, windowSize = 1) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages]);
  for (let p = currentPage - windowSize; p <= currentPage + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const list = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) list.push("…");
    list.push(p);
    prev = p;
  }
  return list;
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageList = buildPageList(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {pageList.map((item, index) =>
        item === "…" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={
              item === currentPage
                ? "flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
                : "flex h-8 w-8 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            }
          >
            {item}
          </button>
        ),
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}