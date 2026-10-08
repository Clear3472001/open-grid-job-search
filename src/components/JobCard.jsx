import React from "react";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { ATS_LABEL } from "@/lib/ats";

const WORKPLACE_LABEL = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const EMPLOYMENT_LABEL = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
};

export default function JobCard({ job }) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="truncate">{job.company}</span>
          </span>
          {job.ats ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {ATS_LABEL[job.ats] ?? job.ats}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1.5 text-base font-medium leading-snug text-foreground">{job.title}</h3>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {job.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          ) : null}
          {job.workplaceType ? <span>{WORKPLACE_LABEL[job.workplaceType]}</span> : null}
          {job.employmentType ? <span>{EMPLOYMENT_LABEL[job.employmentType]}</span> : null}
        </div>
      </div>
      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}