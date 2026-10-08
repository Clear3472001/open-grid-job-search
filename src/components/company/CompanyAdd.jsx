import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { fetchBoard, slugFromInput, titleizeSlug } from "@/lib/ashby";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CompanyAdd({ onAdded }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const input = value.trim();
    if (!input || saving) return;

    setSaving(true);
    setError(null);
    setResult(null);

    try {
      const slug = slugFromInput(input);
      if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        throw new Error("Enter a company name or a link to its Ashby job board.");
      }

      const existingPage = await base44.entities.Company.filter({ slug }, { limit: 1 });
      const existing = Array.isArray(existingPage) ? existingPage : existingPage?.items ?? [];
      if (existing.length) {
        throw new Error(`${existing[0].name} is already on the board.`);
      }

      let board = null;
      try {
        board = await fetchBoard(slug);
      } catch (err) {
        throw new Error(`We couldn't reach that Ashby board right now (${err.message}).`);
      }
      if (!board) {
        throw new Error("That doesn't look like an active Ashby job board.");
      }

      const looksLikeUrl = /ashbyhq\.com|^https?:/i.test(input);
      const name = looksLikeUrl ? titleizeSlug(slug) : input;

      await base44.entities.Company.create({ name, slug, active: true });

      setResult({ name, jobCount: (board.jobPostings ?? []).length });
      setValue("");
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
      <Label
        htmlFor="company-input"
        className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        Company name or Ashby jobs URL
      </Label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Input
          id="company-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="vanta — or https://jobs.ashbyhq.com/vanta"
          className="h-12 rounded-xl"
          disabled={saving}
        />
        <Button type="submit" className="h-12 shrink-0 rounded-xl px-6" disabled={saving || !value.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add company"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        We check the board on Ashby first, so only live job boards make it onto the site.
      </p>

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