import React from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { ATS_OPTIONS } from "@/lib/ats";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPLOYMENT_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  ...ATS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const labelClass = "text-xs font-medium text-muted-foreground";

export default function BoardFilters({
  keyword,
  onKeywordChange,
  location,
  onLocationChange,
  employment,
  onEmploymentChange,
  remoteOnly,
  onRemoteOnlyChange,
  source,
  onSourceChange,
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr]">
        <div>
          <Label htmlFor="board-keyword" className={labelClass}>
            Keyword
          </Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="board-keyword"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Job title or company"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="board-location" className={labelClass}>
            Location
          </Label>
          <div className="relative mt-1.5">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="board-location"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              placeholder="City, region or country"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div>
          <Label className={labelClass}>Source</Label>
          <Select value={source} onValueChange={onSourceChange}>
            <SelectTrigger className="mt-1.5 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={labelClass}>Employment</Label>
          <Select value={employment} onValueChange={onEmploymentChange}>
            <SelectTrigger className="mt-1.5 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <div className="flex items-center gap-3">
          <Switch id="remote-only" checked={remoteOnly} onCheckedChange={onRemoteOnlyChange} />
          <Label htmlFor="remote-only" className="text-sm font-normal text-muted-foreground">
            Remote &amp; hybrid only
          </Label>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Results update as you type
        </span>
      </div>
    </div>
  );
}