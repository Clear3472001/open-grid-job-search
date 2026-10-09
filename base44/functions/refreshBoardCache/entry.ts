import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  fetchBoardForCompany,
  normalizeJobsForCompany,
  mapWithConcurrency,
  fetchAllPages,
  workdayTotal,
} from "../../shared/ats.ts";

const STALE_MS = 12 * 60 * 60 * 1000; // 12 hours
const BATCH_SIZE = 40;
const CONCURRENCY = 3;

export default async function refreshBoardCache(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Paginate through every active Company and every JobCache record. A single list() call
    // silently truncates past the SDK's page cap, which would leave late-alphabet companies
    // unrefreshed forever as the company list grows past 400.
    const companies = (await fetchAllPages(
      base44.asServiceRole.entities.Company,
      { active: true },
    )).filter((company) => company?.ats_slug || company?.ashby_slug);

    if (companies.length === 0) {
      return Response.json({ refreshed: 0, remaining: 0, message: "No active companies." });
    }

    const cacheRecords = await fetchAllPages(
      base44.asServiceRole.entities.JobCache,
      {},
      { fields: ["company_slug", "fetched_at"] },
    );
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
      const realCount = (company.ats || "ashby") === "workday" ? workdayTotal(board) : jobs.length;
      upserts.push({
        company_slug: slug,
        company_name: company.name,
        jobs,
        job_count: realCount,
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