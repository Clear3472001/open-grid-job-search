import React from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
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

const labelClass = "text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground";

export default function BoardFilters({
  keyword,
  onKeywordChange,
  location,
  onLocationChange,
  employment,
  onEmploymentChange,
  remoteOnly,
  onRemoteOnlyChange,
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-[0_24px_55px_-45px_rgba(20,24,45,0.6)] sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_0.9fr]">
        <div>
          <Label htmlFor="board-keyword" className={labelClass}>
            Keyword
          </Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="board-keyword"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Job title or company"
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="board-location" className={labelClass}>
            Location
          </Label>
          <div className="relative mt-2">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="board-location"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              placeholder="City, region or country"
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>

        <div>
          <Label className={labelClass}>Employment type</Label>
          <Select value={employment} onValueChange={onEmploymentChange}>
            <SelectTrigger className="mt-2 h-11 rounded-xl">
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="flex items-center gap-3">
          <Switch id="remote-only" checked={remoteOnly} onCheckedChange={onRemoteOnlyChange} />
          <Label htmlFor="remote-only" className="text-sm font-normal text-muted-foreground">
            Remote &amp; hybrid only
          </Label>
        </div>
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Results update as you type
        </span>
      </div>
    </div>
  );
}