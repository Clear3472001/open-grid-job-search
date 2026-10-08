// Multi-ATS job-board fetcher. Each ATS (Ashby, Greenhouse, Lever) has its own fetch + normalize
// path; fetchBoardForCompany dispatches by company.ats and always returns the same cached job
// shape so downstream code is ATS-agnostic.

export const JOB_SHAPE_FIELDS = [
  "id", "title", "company", "location", "workplaceType", "employmentType", "department", "team", "url", "ats",
];

const EMPLOYMENT_TYPES = {
  fulltime: "full_time",
  parttime: "part_time",
  contract: "contract",
  temporary: "temporary",
  internship: "internship",
};

const WORKPLACE_TYPES = ["remote", "hybrid", "onsite"];

// ── Ashby ─────────────────────────────────────────────────────────────────────
const ASHBY_ENDPOINT =
  "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams";
const ASHBY_QUERY = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName workplaceType employmentType secondaryLocations { locationName } teamId } } }`;
const ASHBY_POSTING_BASE = "https://jobs.ashbyhq.com";

async function fetchAshby(slug) {
  const response = await fetch(ASHBY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      operationName: "ApiJobBoardWithTeams",
      variables: { organizationHostedJobsPageName: slug },
      query: ASHBY_QUERY,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Ashby responded with ${response.status}`);
  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "Ashby rejected the request");
  }
  return payload?.data?.jobBoard ?? null;
}

function normalizeAshby(posting, companyName, slug) {
  const workplace = String(posting?.workplaceType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const employment = String(posting?.employmentType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const workplaceType = WORKPLACE_TYPES.includes(workplace) ? workplace : null;
  const locations = [posting?.locationName, ...(posting?.secondaryLocations ?? []).map((e) => e?.locationName)]
    .map((v) => (v ? String(v).trim() : ""))
    .filter((v, i, a) => v && a.indexOf(v) === i);
  const location = locations.length
    ? locations.join(" · ")
    : workplaceType === "remote" ? "Remote" : "";
  return {
    id: String(posting?.id ?? ""),
    title: posting?.title ?? "Untitled role",
    company: companyName,
    location,
    workplaceType,
    employmentType: EMPLOYMENT_TYPES[employment] ?? null,
    department: null,
    team: null,
    url: posting?.id ? `${ASHBY_POSTING_BASE}/${slug}/${posting.id}` : `${ASHBY_POSTING_BASE}/${slug}`,
    ats: "ashby",
  };
}

// ── Greenhouse ───────────────────────────────────────────────────────────────
// GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs → { jobs: [{ id, title, absolute_url, location: { name }, updated_at, metadata }] }
async function fetchGreenhouse(slug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Greenhouse responded with ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.jobs)) throw new Error("Greenhouse response had no jobs array");
  return payload;
}

function greenhouseMeta(metadata, fieldName) {
  if (!Array.isArray(metadata)) return null;
  const entry = metadata.find((m) => m?.field_name === fieldName || m?.name === fieldName);
  return entry?.value ?? null;
}

function normalizeGreenhouse(job, companyName) {
  const locationName = job?.location && typeof job.location === "object"
    ? String(job.location.name ?? "").trim()
    : String(job?.location ?? "").trim();
  return {
    id: String(job?.id ?? ""),
    title: job?.title ?? "Untitled role",
    company: companyName,
    location: locationName || "",
    workplaceType: null,
    employmentType: greenhouseMeta(job?.metadata, "Employment Type") ?? greenhouseMeta(job?.metadata, "employment_type"),
    department: greenhouseMeta(job?.metadata, "Department") ?? greenhouseMeta(job?.metadata, "department"),
    team: greenhouseMeta(job?.metadata, "Team") ?? greenhouseMeta(job?.metadata, "team") ?? null,
    url: job?.absolute_url ?? "",
    ats: "greenhouse",
  };
}

// ── Lever ──────────────────────────────────────────────────────────────────────
// GET https://api.lever.co/v0/postings/{slug}?mode=json → [{ id, text, hostedUrl, categories: { team, location, commitment, department }, workplaceType }]
async function fetchLever(slug) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Lever responded with ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("Lever response was not an array");
  return payload;
}

function normalizeLever(posting, companyName) {
  const cats = posting?.categories ?? {};
  const workplaceRaw = String(posting?.workplaceType ?? "").toLowerCase();
  const workplaceType = WORKPLACE_TYPES.includes(workplaceRaw) ? workplaceRaw : null;
  return {
    id: String(posting?.id ?? ""),
    title: posting?.text ?? "Untitled role",
    company: companyName,
    location: String(cats.location ?? "").trim() || null,
    workplaceType,
    employmentType: cats.commitment ?? null,
    department: cats.department ?? null,
    team: cats.team ?? null,
    url: posting?.hostedUrl ?? "",
    ats: "lever",
  };
}

// ── Dispatcher ─────────────────────────────────────────────────────────────────
export async function fetchBoardForCompany(company) {
  const slug = company.ats_slug || company.ashby_slug;
  const ats = company.ats || "ashby";
  if (!slug) throw new Error("Company has no ATS slug");
  if (ats === "ashby") return { ats, raw: await fetchAshby(slug) };
  if (ats === "greenhouse") return { ats, raw: await fetchGreenhouse(slug) };
  if (ats === "lever") return { ats, raw: await fetchLever(slug) };
  throw new Error(`Unknown ATS: ${ats}`);
}

export function normalizeJobsForCompany(company, board) {
  const slug = company.ats_slug || company.ashby_slug;
  const ats = company.ats || "ashby";
  if (ats === "ashby") {
    const raw = board?.jobPostings ? board : board?.raw;
    const postings = raw?.jobPostings ?? [];
    return postings.map((p) => normalizeAshby(p, company.name, slug));
  }
  if (ats === "greenhouse") {
    const raw = board?.jobs ? board : board?.raw;
    const jobs = raw?.jobs ?? [];
    return jobs.map((j) => normalizeGreenhouse(j, company.name));
  }
  if (ats === "lever") {
    const postings = Array.isArray(board) ? board : board?.raw ?? [];
    return postings.map((p) => normalizeLever(p, company.name));
  }
  return [];
}

// ── Concurrency pool ───────────────────────────────────────────────────────────
// Runs an async worker over items with a fixed concurrency pool. Resolves every item
// (never throws) so a single company's error doesn't abort the batch.
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        try {
          results[index] = { ok: true, value: await worker(items[index], index) };
        } catch (reason) {
          results[index] = { ok: false, reason };
        }
      }
    },
  );
  await Promise.all(runners);
  return results;
}