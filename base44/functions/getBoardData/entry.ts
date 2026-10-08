import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

export default async function getBoardData(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Board reads are public (the gate is a honeypot, not a login), so the service role reads the
    // cache without needing an app user token.
    const cachePage = await base44.asServiceRole.entities.JobCache.filter(
      {},
      { limit: 2000, sort: "company_slug" },
    );
    const cacheRecords = cachePage?.items ?? [];

    const companyPage = await base44.asServiceRole.entities.Company.filter(
      { active: true },
      { limit: 1000 },
    );
    const companies = (companyPage?.items ?? []).filter(
      (company) => company?.ats_slug || company?.ashby_slug,
    );

    const cacheBySlug = new Map(cacheRecords.map((record) => [record.company_slug, record]));
    const slugOf = (company) => company.ats_slug || company.ashby_slug;

    const jobs = [];
    const summaries = [];

    for (const company of companies) {
      const slug = slugOf(company);
      const cached = cacheBySlug.get(slug);
      const ats = company.ats || "ashby";
      if (cached && Array.isArray(cached.jobs)) {
        for (const job of cached.jobs) {
          jobs.push({
            ...job,
            company: company.name, // always the current display name
            ats, // ensure the ATS tag is current even on older cache records
          });
        }
        summaries.push({
          name: company.name,
          slug,
          ats,
          count: cached.job_count ?? cached.jobs.length,
          syncing: false,
        });
      } else {
        summaries.push({
          name: company.name,
          slug,
          ats,
          count: 0,
          syncing: true,
        });
      }
    }

    jobs.sort((a, b) =>
      a.company === b.company ? a.title.localeCompare(b.title) : a.company.localeCompare(b.company),
    );
    summaries.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      jobs,
      companies: summaries,
      total: jobs.length,
      companyCount: companies.length,
      syncingCount: summaries.filter((summary) => summary.syncing).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}