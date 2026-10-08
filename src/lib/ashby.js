export const ASHBY_ENDPOINT =
  "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams";

// Ashby's live public schema exposes locationName / secondaryLocations.locationName and has no
// company, jobUrl or applyUrl fields — the posting URL is built from the slug plus the job id.
export const JOB_BOARD_QUERY = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName workplaceType employmentType secondaryLocations { locationName } teamId } } }`;

export const POSTING_BASE_URL = "https://jobs.ashbyhq.com";
export const CACHE_TTL_MS = 60 * 60 * 1000;

const CACHE_KEY = "ashby_board_jobs_v1";

const EMPLOYMENT_TYPES = {
  fulltime: "full_time",
  parttime: "part_time",
  contract: "contract",
  temporary: "temporary",
  internship: "internship",
};

const WORKPLACE_TYPES = ["remote", "hybrid", "onsite"];

export function slugFromInput(input) {
  if (!input) return "";
  const raw = String(input).trim();
  const fromUrl = raw.match(/ashbyhq\.com\/([^/?#\s]+)/i);
  const candidate = fromUrl ? fromUrl[1] : raw;
  return candidate
    .replace(/^https?:\/\//i, "")
    .replace(/\s+/g, "")
    .replace(/[?#/].*$/, "")
    .toLowerCase();
}

export function titleizeSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchBoard(slug) {
  const response = await fetch(ASHBY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      operationName: "ApiJobBoardWithTeams",
      variables: { organizationHostedJobsPageName: slug },
      query: JOB_BOARD_QUERY,
    }),
  });
  if (!response.ok) throw new Error(`Ashby responded with ${response.status}`);
  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "Ashby rejected the request");
  }
  return payload?.data?.jobBoard ?? null;
}

function normalizePosting(posting, companyName, slug) {
  const workplace = String(posting?.workplaceType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const employment = String(posting?.employmentType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const workplaceType = WORKPLACE_TYPES.includes(workplace) ? workplace : null;

  const locations = [
    posting?.locationName,
    ...(posting?.secondaryLocations ?? []).map((entry) => entry?.locationName),
  ]
    .map((value) => (value ? String(value).trim() : ""))
    .filter((value, index, all) => value && all.indexOf(value) === index);

  const location = locations.length
    ? locations.join(" · ")
    : workplaceType === "remote"
      ? "Remote"
      : "";

  return {
    id: String(posting?.id ?? ""),
    title: posting?.title ?? "Untitled role",
    company: companyName,
    location,
    workplaceType,
    employmentType: EMPLOYMENT_TYPES[employment] ?? null,
    url: posting?.id
      ? `${POSTING_BASE_URL}/${slug}/${posting.id}`
      : `${POSTING_BASE_URL}/${slug}`,
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

let memoryCache = null;

function readCache(key) {
  if (memoryCache && memoryCache.key === key && memoryCache.expiresAt > Date.now()) {
    return memoryCache.payload;
  }
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.key === key && parsed.expiresAt > Date.now()) {
        memoryCache = parsed;
        return parsed.payload;
      }
    }
  } catch (error) {
    return null;
  }
  return null;
}

function writeCache(key, payload) {
  const entry = { key, expiresAt: Date.now() + CACHE_TTL_MS, payload };
  memoryCache = entry;
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    // storage full or unavailable — the in-memory copy still serves this session
  }
}

// Pulls every active company's Ashby board at once, normalizes the postings into a single list,
// and caches the merged result for an hour so repeat visits and filter changes stay instant.
// Companies that error or return a null board are skipped and reported, never fatal.
export async function fetchAllBoards(companies) {
  const active = companies
    .filter((company) => company?.ashby_slug)
    .sort((a, b) => a.ashby_slug.localeCompare(b.ashby_slug));
  const cacheKey = active.map((company) => company.ashby_slug).join("|");

  const cached = readCache(cacheKey);
  if (cached) return { ...cached, cached: true };

  const settled = await mapWithConcurrency(active, 8, async (company) => {
    const board = await fetchBoard(company.ashby_slug);
    return { postings: board?.jobPostings ?? [] };
  });

  const jobs = [];
  const summaries = [];
  const errors = [];

  settled.forEach((result, index) => {
    const company = active[index];
    if (result.status === "fulfilled") {
      const postings = result.value.postings;
      summaries.push({ name: company.name, slug: company.ashby_slug, count: postings.length });
      postings.forEach((posting) => {
        jobs.push(normalizePosting(posting, company.name, company.ashby_slug));
      });
    } else {
      summaries.push({ name: company.name, slug: company.ashby_slug, count: 0 });
      errors.push({ slug: company.ashby_slug, message: String(result.reason?.message ?? result.reason) });
    }
  });

  jobs.sort((a, b) =>
    a.company === b.company ? a.title.localeCompare(b.title) : a.company.localeCompare(b.company),
  );

  const payload = {
    jobs,
    companies: summaries.sort((a, b) => a.name.localeCompare(b.name)),
    errors,
    total: jobs.length,
    fetchedAt: new Date().toISOString(),
  };

  writeCache(cacheKey, payload);
  return { ...payload, cached: false };
}