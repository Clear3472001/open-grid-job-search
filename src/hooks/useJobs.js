import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Reads the board entirely from the cached getBoardData backend function — no per-visitor Ashby
// hits. A scheduled workflow keeps JobCache fresh; companies without a cache record yet surface as
// "syncing" rather than triggering a client-side fetch.
export default function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("getBoardData", {});
      const payload = response?.data ?? response;
      setJobs(payload.jobs ?? []);
      setCompanies(payload.companies ?? []);
      setFetchedAt(new Date().toISOString());
    } catch (err) {
      setError(err?.message ?? "We couldn't load the job board.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { jobs, companies, fetchedAt, loading, error, reload: load };
}