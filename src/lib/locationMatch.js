// Alias-aware location matching for the board's Location filter.
// ATS feeds use free-text locations ("New York, NY", "Remote (United States | Canada)",
// "US-Remote-CA"), so a literal substring match on "USA" misses most US roles.

const US_ALIASES = new Set([
  "usa",
  "us",
  "u.s.",
  "u.s",
  "united states",
  "united states of america",
  "america",
]);

const US_STATES_FULL = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire",
  "new jersey", "new mexico", "new york", "north carolina", "north dakota",
  "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
  "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "west virginia", "wisconsin", "wyoming",
  "district of columbia", "puerto rico",
];

const US_STATE_ABBRS = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
  "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms",
  "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok",
  "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
  "wi", "wy", "dc", "pr",
];

// \b with 2-letter abbrevs is unreliable for trailing boundary on punctuation
// like "NY," — use explicit non-word lookahead instead.
const US_STATE_ABBR_RE = new RegExp(
  `(?:^|[^a-z])(${US_STATE_ABBRS.join("|")})(?=[^a-z]|$)`,
  "i",
);

const US_MARKERS = ["united states", "usa", "u.s.", "us-"];

function isUSQuery(query) {
  return US_ALIASES.has(query);
}

function matchesUS(locationLower) {
  if (US_MARKERS.some((marker) => locationLower.includes(marker))) return true;
  if (US_STATES_FULL.some((state) => locationLower.includes(state))) return true;
  if (US_STATE_ABBR_RE.test(locationLower)) return true;
  return false;
}

// Returns true if `jobLocation` matches the user's location `query`.
// `query` is the raw user input; it is normalized inside.
export function locationMatches(jobLocation, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const loc = String(jobLocation ?? "").toLowerCase();
  if (isUSQuery(q)) return matchesUS(loc);
  return loc.includes(q);
}