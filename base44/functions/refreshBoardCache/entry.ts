import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { fetchBoardForCompany, normalizeJobsForCompany, mapWithConcurrency } from "../../shared/ats.ts";

const STALE_MS = 12 * 60 * 60 * 1000; // 12 hours
const BATCH_SIZE = 40;
const CONCURRENCY = 3;

export default async function refreshBoardCache(req) {
  try {
    const base44 = createClientFromRequest(req);

    const companyPage = await base44.asServiceRole.entities.Company.filter(
      { active: true },
      { limit: 1000 },
    );
    // Support both the new ats_slug and legacy ashby_slug; every company needs at least one.
    const companies = (companyPage?.items ?? []).filter(
      (company) => company?.ats_slug || company?.ashby_slug,
    );

    if (companies.length === 0) {
      return Response.json({ refreshed: 0, remaining: 0, message: "No active companies." });
    }

    const cachePage = await base44.asServiceRole.entities.JobCache.filter(
      {},
      { limit: 2000, fields: ["company_slug", "fetched_at"] },
    );
    const cacheRecords = cachePage?.items ?? [];
    const cacheBySlug = new Map(cacheRecords.map((record) => [record.company_slug, record]));

    const slugOf = (company) => company.ats_slug || company.ashby_slug;

    const now = Date.now();
    const stale = companies
      .map((company) => {
        const slug = slugOf(company);
        const cached = cacheBySlug.get(slug);
        const fetchedAt = cached?.fetched_at ? new Date(cached.fetched_at).getTime() : 0;
        return { company, slug, cachedId: cached?.id ?? null, fetchedAt };
      })
      .filter((entry) => !entry.fetchedAt || now - entry.fetchedAt > STALE_MS)
      .sort((a, b) => a.fetchedAt - b.fetchedAt); // oldest/missing first

    const remaining = Math.max(0, stale.length - BATCH_SIZE);
    const batch = stale.slice(0, BATCH_SIZE);

    const settled = await mapWithConcurrency(batch, CONCURRENCY, async (entry) => {
      const board = await fetchBoardForCompany(entry.company);
      return { company: entry.company, slug: entry.slug, board };
    });

    let refreshed = 0;
    const upserts = [];

    for (const result of settled) {
      if (!result.ok) continue; // skip errored companies; retried next run
      const { company, slug, board } = result.value;
      const jobs = normalizeJobsForCompany(company, board);
      upserts.push({
        company_slug: slug,
        company_name: company.name,
        jobs,
        job_count: jobs.length,
        fetched_at: new Date().toISOString(),
      });
      refreshed += 1;
    }

    if (upserts.length > 0) {
      await base44.asServiceRole.entities.JobCache.upsert(upserts, { key: "company_slug" });
    }

    return Response.json({ refreshed, remaining, totalCompanies: companies.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}