import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { fetchBoard, slugFromInput } from "@/lib/ashby";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const labelClass =
  "text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground";

export default function CompanyAdd({ onAdded }) {
  const [name, setName] = useState("");
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
      const ashbySlug = slugFromInput(slugOrUrl);

      if (!companyName) throw new Error("Enter the company's name.");
      if (!ashbySlug || !/^[a-z0-9][a-z0-9-]*$/.test(ashbySlug)) {
        throw new Error("Enter the company's Ashby slug or the link to its job board.");
      }

      const existingPage = await base44.entities.Company.filter(
        { ashby_slug: ashbySlug },
        { limit: 1 },
      );
      const existing = Array.isArray(existingPage) ? existingPage : existingPage?.items ?? [];
      if (existing.length) {
        throw new Error(`${existing[0].name} is already on the board.`);
      }

      let board = null;
      try {
        board = await fetchBoard(ashbySlug);
      } catch (err) {
        throw new Error(`We couldn't reach that Ashby board right now (${err.message}).`);
      }
      if (!board) {
        throw new Error("That doesn't look like an active Ashby job board.");
      }

      await base44.entities.Company.create({
        name: companyName,
        ashby_slug: ashbySlug,
        active: true,
      });

      setResult({ name: companyName, jobCount: (board.jobPostings ?? []).length });
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
      className="rounded-3xl border border-border/70 bg-card p-6 shadow-[0_24px_55px_-45px_rgba(20,24,45,0.6)] sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="company-name" className={labelClass}>
            Company name
          </Label>
          <Input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Headway"
            className="mt-2 h-12 rounded-xl"
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="company-slug" className={labelClass}>
            Ashby slug or jobs URL
          </Label>
          <Input
            id="company-slug"
            value={slugOrUrl}
            onChange={(event) => setSlugOrUrl(event.target.value)}
            placeholder="headway — or https://jobs.ashbyhq.com/headway"
            className="mt-2 h-12 rounded-xl"
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="h-12 rounded-xl px-6"
          disabled={saving || !name.trim() || !slugOrUrl.trim()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add company"}
        </Button>
        <p className="text-xs text-muted-foreground">
          We check the board on Ashby first, so only live job boards make it onto the site.
        </p>
      </div>

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
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