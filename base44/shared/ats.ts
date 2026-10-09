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

// ── SmartRecruiters ────────────────────────────────────────────────────────────
// GET https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100&offset=0
// Paginate with offset until totalFound is reached.
async function fetchSmartRecruiters(slug) {
  const all = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`SmartRecruiters responded with ${response.status}`);
    const payload = await response.json();
    const postings = Array.isArray(payload?.content) ? payload.content : [];
    all.push(...postings);
    const total = payload?.totalFound ?? all.length;
    if (postings.length === 0 || all.length >= total) break;
    offset += limit;
  }
  return all;
}

function normalizeSmartRecruiters(posting, companyName, slug) {
  const loc = posting?.location ?? {};
  const remote = loc.remote === true;
  let location = "";
  if (remote && !loc.city) {
    location = "Remote";
  } else {
    const parts = [loc.city, loc.country].map((v) => (v ? String(v).trim() : "")).filter(Boolean);
    location = parts.join(", ");
  }
  const employmentType = posting?.typeOfEmployment?.label ? snakeCase(posting.typeOfEmployment.label) : null;
  const wpRaw = String(posting?.workplaceType ?? "").toLowerCase();
  let workplaceType;
  if (wpRaw === "hybrid") workplaceType = "hybrid";
  else if (remote) workplaceType = "remote";
  else workplaceType = "onsite";
  return {
    id: String(posting?.id ?? ""),
    title: posting?.name ?? "Untitled role",
    company: companyName,
    location,
    workplaceType,
    employmentType,
    department: posting?.department?.label ?? null,
    team: null,
    url: posting?.id ? `https://jobs.smartrecruiters.com/${slug}/${posting.id}` : "",
    ats: "smartrecruiters",
  };
}

// ── Teamtailor ────────────────────────────────────────────────────────────────
// GET https://{slug}.teamtailor.com/jobs.json (JSON Feed) → { items: [...] }
async function fetchTeamtailor(slug) {
  const url = `https://${encodeURIComponent(slug)}.teamtailor.com/jobs.json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Teamtailor responded with ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.items)) throw new Error("Teamtailor response had no items array");
  return payload;
}

function normalizeTeamtailor(item, companyName) {
  const jp = item?._jobposting ?? {};
  const address = jp?.jobLocation?.address ?? {};
  const locality = address.addressLocality ? String(address.addressLocality).trim() : "";
  const country = address.addressCountry ? String(address.addressCountry).trim() : "";
  const location = (locality || country) ? [locality, country].filter(Boolean).join(", ") : "Remote";
  const employmentType = jp?.employmentType ? String(jp.employmentType).toLowerCase() : null;
  return {
    id: String(item?.id ?? ""),
    title: item?.title ?? "Untitled role",
    company: companyName,
    location,
    workplaceType: null,
    employmentType,
    department: null,
    team: null,
    url: item?.url ?? "",
    ats: "teamtailor",
  };
}

// ── Breezy ────────────────────────────────────────────────────────────────────
// GET https://{slug}.breezy.hr/json → bare JSON array of positions
async function fetchBreezy(slug) {
  const url = `https://${encodeURIComponent(slug)}.breezy.hr/json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Breezy responded with ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("Breezy response was not an array");
  return payload;
}

function normalizeBreezy(p, companyName) {
  const locName = p?.location?.name ? String(p.location.name).trim() : "Not specified";
  const locLower = locName.toLowerCase();
  let workplaceType = "onsite";
  if (locLower.includes("remote")) workplaceType = "remote";
  else if (locLower.includes("hybrid")) workplaceType = "hybrid";
  const employmentType = p?.type?.name ? snakeCase(p.type.name) : null;
  return {
    id: String(p?.id ?? ""),
    title: p?.name ?? "Untitled role",
    company: companyName,
    location: locName,
    workplaceType,
    employmentType,
    department: null,
    team: null,
    url: p?.url ?? "",
    ats: "breezy",
  };
}

// ── Carex (custom HTML scraper) ────────────────────────────────────────────────
// Carex blocks bots with a 403 unless the request looks like a browser.
const CAREX_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchCarex() {
  const all = [];
  for (let page = 1; page <= 4; page++) {
    const url = page === 1
      ? "https://www.carexconsulting.com/see-job-openings/"
      : `https://www.carexconsulting.com/see-job-openings/page/${page}/`;
    const response = await fetch(url, {
      headers: { "User-Agent": CAREX_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (page > 1) break; // stop at the first missing page
      throw new Error(`Carex responded with ${response.status}`);
    }
    const html = await response.text();
    const jobs = parseCarexHtml(html);
    if (jobs.length === 0) break;
    all.push(...jobs);
  }
  return all;
}

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Pulls "Location: X", "Remote: X", "Type: X" out of the <li> items in a job block.
function parseCarexLiFields(block) {
  const fields = {};
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(block)) !== null) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]*>/g, "").trim());
    const colonIdx = text.indexOf(":");
    if (colonIdx === -1) continue;
    const key = text.slice(0, colonIdx).trim().toLowerCase();
    const value = text.slice(colonIdx + 1).trim();
    if (key === "location") fields.location = value;
    else if (key === "remote") fields.remote = value;
    else if (key === "type") fields.type = value;
  }
  return fields;
}

function parseCarexHtml(html) {
  const jobs = [];
  const articleRe = /<article[^>]*class="[^"]*matador-job[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articleRe.exec(html)) !== null) {
    const block = match[1];
    const linkMatch = block.match(/<a[^>]*href="([^"]*\/jobs\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const url = linkMatch[1];
    const title = decodeHtmlEntities(linkMatch[2].replace(/<[^>]*>/g, "").trim());
    const id = url.split("/").filter(Boolean).pop() ?? url;
    const fields = parseCarexLiFields(block);
    let workplaceType = "onsite";
    if (fields.remote) {
      const r = fields.remote.toLowerCase();
      if (r === "remote") workplaceType = "remote";
      else if (r === "hybrid") workplaceType = "hybrid";
    }
    const employmentType = fields.type ? snakeCase(fields.type) : null;
    jobs.push({
      id: String(id),
      title: title || "Untitled role",
      company: "Carex Consulting Group",
      location: fields.location || "",
      workplaceType,
      employmentType,
      department: null,
      team: null,
      url,
      ats: "carex",
    });
  }
  return jobs;
}

function normalizeCarex(parsed, companyName) {
  return { ...parsed, company: companyName, ats: "carex" };
}

// ── Workday ────────────────────────────────────────────────────────────────────
// ats_slug format: "{tenant}.{wd}|{site}" (e.g. "geisinger.wd5|GeisingerExternal").
// The cxs jobs endpoint returns 20 postings per request and rejects any other limit.
const WORKDAY_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const WORKDAY_PAGE_LIMIT = 20;
const WORKDAY_CAP = 400; // cap fetched postings per company to keep the refresh fast

function parseWorkdaySlug(atsSlug) {
  const raw = String(atsSlug ?? "").trim();
  const sepIdx = raw.indexOf("|");
  if (sepIdx === -1) throw new Error(`Workday slug "${raw}" is missing the "|site" segment`);
  const tenantWd = raw.slice(0, sepIdx).trim();
  const site = raw.slice(sepIdx + 1).trim();
  const dotIdx = tenantWd.lastIndexOf(".");
  if (dotIdx === -1) throw new Error(`Workday slug "${raw}" is missing the ".wd" segment`);
  const tenant = tenantWd.slice(0, dotIdx).trim();
  const wd = tenantWd.slice(dotIdx + 1).trim();
  if (!tenant || !wd || !site) throw new Error(`Workday slug "${raw}" could not be parsed`);
  return { tenant, wd, site };
}

async function fetchWorkday(atsSlug) {
  const { tenant, wd, site } = parseWorkdaySlug(atsSlug);
  const base = `https://${tenant}.${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
  const all = [];
  let offset = 0;
  let total = 0;
  for (;;) {
    const response = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": WORKDAY_UA,
      },
      body: JSON.stringify({ appliedFacets: {}, limit: WORKDAY_PAGE_LIMIT, offset, searchText: "" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Workday responded with ${response.status}`);
    const payload = await response.json();
    const data = payload?.data ?? {};
    const postings = Array.isArray(data?.jobPostings) ? data.jobPostings : [];
    if (postings.length === 0) break;
    total = typeof data?.total === "number" ? data.total : total;
    all.push(...postings);
    offset += WORKDAY_PAGE_LIMIT;
    if (offset >= WORKDAY_CAP) break; // cap at 400 postings per company
    await new Promise((resolve) => setTimeout(resolve, 300)); // be polite between pages
  }
  return { jobs: all, total };
}

function normalizeWorkday(p, atsSlug) {
  const { tenant, wd, site } = parseWorkdaySlug(atsSlug);
  const externalPath = String(p?.externalPath ?? "");
  const locationsText = String(p?.locationsText ?? "").trim();
  const haystack = `${locationsText} ${externalPath}`.toLowerCase();
  let workplaceType = "onsite";
  if (haystack.includes("remote") || haystack.includes("work-from-home")) workplaceType = "remote";
  else if (haystack.includes("hybrid")) workplaceType = "hybrid";
  const timeRaw = String(p?.timeType ?? "").trim();
  const employmentType = timeRaw ? timeRaw.toLowerCase().replace(/\s+/g, "_") : null;
  const id = externalPath.split("/").filter(Boolean).pop() ?? externalPath;
  return {
    id: String(id),
    title: p?.title ?? "Untitled role",
    company: "",
    location: locationsText || "Not specified",
    workplaceType,
    employmentType,
    department: null,
    team: null,
    url: `https://${tenant}.${wd}.myworkdayjobs.com/${site}${externalPath}`,
    ats: "workday",
  };
}

function normalizeWorkdayJobs(company, board) {
  const raw = board?.jobs ? board : board?.raw ?? { jobs: [], total: 0 };
  const postings = raw?.jobs ?? [];
  const total = typeof raw?.total === "number" ? raw.total : postings.length;
  const slug = company.ats_slug || company.ashby_slug;
  return postings.map((p) => ({ ...normalizeWorkday(p, slug), company: company.name }));
}

// Expose the API total so the cache stores the real board size, not the capped count.
export function workdayTotal(board) {
  const raw = board?.raw ?? board ?? {};
  return typeof raw?.total === "number" ? raw.total : (raw?.jobs ?? []).length;
}

// ── Shared helper ──────────────────────────────────────────────────────────────
function snakeCase(value) {
  return String(value ?? "").trim().toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// ── Dispatcher ─────────────────────────────────────────────────────────────────
export async function fetchBoardForCompany(company) {
  const slug = company.ats_slug || company.ashby_slug;
  const ats = company.ats || "ashby";
  if (!slug) throw new Error("Company has no ATS slug");
  if (ats === "ashby") return { ats, raw: await fetchAshby(slug) };
  if (ats === "greenhouse") return { ats, raw: await fetchGreenhouse(slug) };
  if (ats === "lever") return { ats, raw: await fetchLever(slug) };
  if (ats === "smartrecruiters") return { ats, raw: await fetchSmartRecruiters(slug) };
  if (ats === "teamtailor") return { ats, raw: await fetchTeamtailor(slug) };
  if (ats === "breezy") return { ats, raw: await fetchBreezy(slug) };
  if (ats === "carex") return { ats, raw: await fetchCarex() };
  if (ats === "workday") return { ats, raw: await fetchWorkday(slug) };
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
  if (ats === "smartrecruiters") {
    const postings = Array.isArray(board) ? board : board?.raw ?? [];
    return postings.map((p) => normalizeSmartRecruiters(p, company.name, slug));
  }
  if (ats === "teamtailor") {
    const raw = board?.items ? board : board?.raw;
    const items = raw?.items ?? [];
    return items.map((i) => normalizeTeamtailor(i, company.name));
  }
  if (ats === "breezy") {
    const postings = Array.isArray(board) ? board : board?.raw ?? [];
    return postings.map((p) => normalizeBreezy(p, company.name));
  }
  if (ats === "carex") {
    const postings = Array.isArray(board) ? board : board?.raw ?? [];
    return postings.map((p) => normalizeCarex(p, company.name));
  }
  if (ats === "workday") return normalizeWorkdayJobs(company, board);
  return [];
}

// ── Pagination helper ──────────────────────────────────────────────────────────
// The entity SDK may cap the page size below the requested limit, so a single
// list()/filter() call silently truncates when a collection grows past the cap.
// This loops with the cursor until has_more is false, returning every record.
export async function fetchAllPages(entity, query, options = {}) {
  const all = [];
  let cursor;
  for (;;) {
    const page = await entity.filter(query, { ...options, cursor });
    const items = page?.items ?? [];
    for (const item of items) all.push(item);
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return all;
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