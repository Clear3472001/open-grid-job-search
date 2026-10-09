import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Accepts either an inline payload { boards: [...] } or { url: "<public file url>" } pointing
// to a JSON file in Base44 public storage. For each board it upserts the JobCache record keyed
// by the board's slug, storing the board's true total in job_count (not the fetched job count).
export default async function importWorkdayJobs(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Expected a JSON body." }, { status: 400 });
    }

    let boards;
    if (Array.isArray(body.boards)) {
      boards = body.boards;
    } else if (typeof body.url === "string" && body.url.trim()) {
      const fileRes = await fetch(body.url.trim(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (!fileRes.ok) {
        return Response.json({ error: `Failed to fetch file: ${fileRes.status}` }, { status: 502 });
      }
      const payload = await fileRes.json();
      boards = Array.isArray(payload?.boards) ? payload.boards : null;
    }

    if (!Array.isArray(boards)) {
      return Response.json({ error: "Payload must contain a 'boards' array (inline or at 'url')." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const upserts = [];
    let totalJobs = 0;

    for (const board of boards) {
      const slug = String(board?.slug ?? "").trim();
      const name = String(board?.name ?? "").trim();
      const jobs = Array.isArray(board?.jobs) ? board.jobs : [];
      if (!slug) continue; // skip boards without a slug; can't key the cache record
      const total = typeof board?.total === "number" ? board.total : jobs.length;
      totalJobs += jobs.length;
      upserts.push({
        company_slug: slug,
        company_name: name,
        jobs,
        job_count: total, // the board's true total, not the fetched count
        fetched_at: now,
      });
    }

    let updated = 0;
    if (upserts.length > 0) {
      const result = await base44.asServiceRole.entities.JobCache.upsert(upserts, { key: "company_slug" });
      updated = (result?.records ?? upserts).length;
    }

    return Response.json({ updated, total_jobs: totalJobs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}