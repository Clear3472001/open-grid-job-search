import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAllBoards } from "@/lib/ashby";

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
      const page = await base44.entities.Company.filter({ active: true }, { limit: 500 });
      const records = Array.isArray(page) ? page : page?.items ?? [];
      const payload = await fetchAllBoards(records.filter((company) => company?.ashby_slug));
      setJobs(payload.jobs);
      setCompanies(payload.companies);
      setFetchedAt(payload.fetchedAt);
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