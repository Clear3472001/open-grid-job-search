import React from "react";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      className="group flex items-start justify-between gap-6 rounded-2xl border border-border/70 bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_22px_45px_-32px_rgba(20,24,45,0.55)]"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{job.company}</span>
        </p>
        <h3 className="mt-2 font-display text-lg leading-snug text-foreground">{job.title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {job.location ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          ) : null}
          {job.workplaceType ? (
            <Badge variant="secondary" className="rounded-full font-medium">
              {WORKPLACE_LABEL[job.workplaceType]}
            </Badge>
          ) : null}
          {job.employmentType ? (
            <Badge variant="outline" className="rounded-full font-medium">
              {EMPLOYMENT_LABEL[job.employmentType]}
            </Badge>
          ) : null}
        </div>
      </div>
      <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </a>
  );
}