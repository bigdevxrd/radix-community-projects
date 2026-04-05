"use client";
import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/constants";
import type {
  AnalyticsSummary,
  TimelineEntry,
  VoterBucket,
  XpDistribution,
  CharterProgressAnalytics,
  TopVoter,
} from "@/lib/types";

export type DateRange = "7d" | "30d" | "90d" | "all";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 60_000; // 1 minute

async function fetchCached<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T;
  const res = await fetch(url);
  const json = await res.json();
  const data = json.data ?? json;
  cache.set(url, { data, ts: Date.now() });
  return data as T;
}

export function useAnalyticsSummary() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchCached<AnalyticsSummary>(API_URL + "/analytics/summary")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function useAnalyticsTimeline() {
  const [data, setData] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCached<TimelineEntry[]>(API_URL + "/analytics/proposals-timeline")
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useAnalyticsVoters() {
  const [data, setData] = useState<VoterBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCached<VoterBucket[]>(API_URL + "/analytics/voters-histogram")
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useAnalyticsXp() {
  const [data, setData] = useState<XpDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCached<XpDistribution>(API_URL + "/analytics/xp-distribution")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useAnalyticsCharter() {
  const [data, setData] = useState<CharterProgressAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCached<CharterProgressAnalytics>(API_URL + "/analytics/charter-progress")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useTopVoters() {
  const [data, setData] = useState<TopVoter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCached<TopVoter[]>(API_URL + "/analytics/top-voters")
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
