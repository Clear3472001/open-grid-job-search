import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ATS_OPTIONS, slugFromInput, validateBoardSlug } from "@/lib/ats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const labelClass = "text-xs font-medium text-muted-foreground";

export default function CompanyAdd({ onAdded }) {
  const [name, setName] = useState("");
  const [ats, setAts] = useState("ashby");
  const [slugOrUrl, setSlugOrUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    setResult(null);

    try {
      const companyName = name.trim();
      const atsSlug = slugFromInput(slugOrUrl, ats);

      if (!companyName) throw new Error("Enter the company's name.");
      if (!atsSlug || !/^[a-z0-9][a-z0-9-]*$/.test(atsSlug)) {
        throw new Error("Enter the board slug or link for this ATS.");
      }

      const existingPage = await base44.entities.Company.filter(
        { ats, ats_slug: atsSlug },
        { limit: 1 },
      );
      const existing = Array.isArray(existingPage) ? existingPage : existingPage?.items ?? [];
      if (existing.length) {
        throw new Error(`${existing[0].name} is already on the board.`);
      }

      const validation = await validateBoardSlug(ats, atsSlug);
      if (!validation.valid) {
        throw new Error(`We couldn't verify that board (${validation.error}).`);
      }

      await base44.entities.Company.create({
        name: companyName,
        ats,
        ats_slug: atsSlug,
        ashby_slug: ats === "ashby" ? atsSlug : atsSlug, // keep ashby_slug populated for backward compat
        active: true,
      });

      setResult({ name: companyName, jobCount: validation.jobCount });
      setName("");
      setSlugOrUrl("");
      onAdded?.();
    } catch (err) {
      setError(err?.message ?? "We couldn't add that company.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="company-name" className={labelClass}>
            Company name
          </Label>
          <Input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Headway"
            className="mt-1.5 h-10"
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="company-ats" className={labelClass}>
            ATS
          </Label>
          <Select value={ats} onValueChange={setAts} disabled={saving}>
            <SelectTrigger id="company-ats" className="mt-1.5 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="company-slug" className={labelClass}>
            Board slug or URL
          </Label>
          <Input
            id="company-slug"
            value={slugOrUrl}
            onChange={(event) => setSlugOrUrl(event.target.value)}
            placeholder={
              ats === "ashby"
                ? "e.g. headway"
                : ats === "greenhouse"
                  ? "e.g. sandbox"
                  : "e.g. lever"
            }
            className="mt-1.5 h-10"
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="h-10"
          disabled={saving || !name.trim() || !slugOrUrl.trim()}
        >
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Add company
        </Button>
        <p className="text-xs text-muted-foreground">
          We verify the board on the ATS first, so only live boards make it onto the grid.
        </p>
      </div>

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent p-3 text-sm text-accent-foreground">
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {result.name} added — {result.jobCount} open role{result.jobCount === 1 ? "" : "s"} found.
          </span>
          <Link
            to="/board"
            className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            Open the board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </form>
  );
}