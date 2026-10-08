export const ASHBY_ENDPOINT =
  "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams";

// Ashby's public schema exposes locationName / secondaryLocations.locationName (no `location`,
// `company`, `jobUrl` or `applyUrl` fields). team/department come back as ids on teamId, so we keep
// them only when Ashby actually returns a readable name. The posting URL is built from slug + id.
export const JOB_BOARD_QUERY = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName workplaceType employmentType secondaryLocations { locationName } teamId } } }`;

export const POSTING_BASE_URL = "https://jobs.ashbyhq.com";

const EMPLOYMENT_TYPES = {
  fulltime: "full_time",
  parttime: "part_time",
  contract: "contract",
  temporary: "temporary",
  internship: "internship",
};

const WORKPLACE_TYPES = ["remote", "hybrid", "onsite"];

export async function fetchBoard(slug) {
  const response = await fetch(ASHBY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      operationName: "ApiJobBoardWithTeams",
      variables: { organizationHostedJobsPageName: slug },
      query: JOB_BOARD_QUERY,
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

export function normalizePosting(posting, companyName, slug) {
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
    department: null,
    team: null,
    url: posting?.id ? `${POSTING_BASE_URL}/${slug}/${posting.id}` : `${POSTING_BASE_URL}/${slug}`,
  };
}

// Runs an async worker over items with a fixed concurrency pool — keeps Ashby requests at 3 in
// flight so we stay under its ~2-3 req/s throttle. Resolves every item (never throws) so a single
// company's error doesn't abort the batch.
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