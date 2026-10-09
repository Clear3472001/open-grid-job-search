// Shared ATS metadata + client-side slug helpers used by the Add Company form and filters.

export const ATS_OPTIONS = [
  { value: "ashby", label: "Ashby" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "smartrecruiters", label: "SmartRecruiters" },
  { value: "teamtailor", label: "Teamtailor" },
  { value: "breezy", label: "Breezy" },
  { value: "carex", label: "Carex" },
];

export const ATS_LABEL = {
  ashby: "Ashby",
  greenhouse: "Greenhouse",
  lever: "Lever",
  smartrecruiters: "SmartRecruiters",
  teamtailor: "Teamtailor",
  breezy: "Breezy",
  carex: "Carex",
};

// Extracts the board slug from a pasted URL or raw slug, per ATS.
export function slugFromInput(input, ats = "ashby") {
  if (!input) return "";
  const raw = String(input).trim();
  let candidate = raw;

  if (ats === "ashby") {
    const match = raw.match(/ashbyhq\.com\/([^/?#\s]+)/i);
    candidate = match ? match[1] : raw;
  } else if (ats === "greenhouse") {
    const match = raw.match(/greenhouse\.io\/(?:boards\/)?(?:candidates?\/)?([^/?#\s]+)/i)
      || raw.match(/boards\.greenhouse\.io\/([^/?#\s]+)/i)
      || raw.match(/job-boards\.greenhouse\.io\/([^/?#\s]+)/i);
    candidate = match ? match[1] : raw;
  } else if (ats === "lever") {
    const match = raw.match(/lever\.co\/([^/?#\s]+)/i)
      || raw.match(/jobs\.lever\.co\/([^/?#\s]+)/i);
    candidate = match ? match[1] : raw;
  }

  return candidate
    .replace(/^https?:\/\//i, "")
    .replace(/\s+/g, "")
    .replace(/[?#/].*$/, "")
    .toLowerCase();
}

const ASHBY_ENDPOINT =
  "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams";
const ASHBY_QUERY = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id } } }`;

// Validates a board slug against its ATS by hitting the public endpoint. Resolves to
// { valid: boolean, jobCount?: number, error?: string }.
export async function validateBoardSlug(ats, slug) {
  if (!slug) return { valid: false, error: "Enter a board slug." };
  try {
    if (ats === "ashby") {
      const res = await fetch(ASHBY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          operationName: "ApiJobBoardWithTeams",
          variables: { organizationHostedJobsPageName: slug },
          query: ASHBY_QUERY,
        }),
      });
      if (!res.ok) return { valid: false, error: `Ashby returned ${res.status}.` };
      const payload = await res.json();
      if (payload?.errors?.length) {
        return { valid: false, error: payload.errors[0]?.message ?? "Ashby rejected the slug." };
      }
      const count = payload?.data?.jobBoard?.jobPostings?.length ?? 0;
      return { valid: true, jobCount: count };
    }

    if (ats === "greenhouse") {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`);
      if (!res.ok) return { valid: false, error: `Greenhouse returned ${res.status}.` };
      const payload = await res.json();
      if (!Array.isArray(payload?.jobs)) return { valid: false, error: "No jobs array returned." };
      return { valid: true, jobCount: payload.jobs.length };
    }

    if (ats === "lever") {
      const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);
      if (!res.ok) return { valid: false, error: `Lever returned ${res.status}.` };
      const payload = await res.json();
      if (!Array.isArray(payload)) return { valid: false, error: "Expected an array of postings." };
      return { valid: true, jobCount: payload.length };
    }

    return { valid: false, error: "Unknown ATS." };
  } catch (err) {
    return { valid: false, error: err?.message ?? "Couldn't reach that board." };
  }
}