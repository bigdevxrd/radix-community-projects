"use client";
import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://156-67-219-105.sslip.io/api";

export interface FederationStatus {
  cv2_synced: boolean;
  crumbsup_synced: boolean;
  cv2_proposals: number;
  crumbsup_proposals: number;
  health: string;
  last_check: number;
}

export interface FederationHealth {
  cv2_api: string;
  crumbsup_api: string;
  gateway_api: string;
  db: string;
  last_check: number;
}

export interface CV2Status {
  cv2_enabled: boolean;
  sync_health: string;
  last_sync: number | null;
  proposals_synced: number;
}

export interface CrumbsUpStatus {
  crumbsup_enabled: boolean;
  dao_id: string;
  member_count: number;
  proposals_synced: number;
  synced_at: number;
}

export interface FederationVoter {
  address: string;
  guild_xp: number;
  crumbsup_reputation: number;
  crumbsup_user_id: string | null;
  total_weight: number;
}

export interface FederationProposal {
  guild_proposal: { id: number; title: string; status: string };
  cv2: { cv2_id: string; cv2_url: string; synced: boolean } | null;
  crumbsup: { crumbsup_id: string; crumbsup_url: string; synced: boolean } | null;
  combined_vote_count: number;
  result: string;
}

export interface VoteWeights {
  member: number;
  contributor: number;
  builder: number;
  steward: number;
  elder: number;
  timestamp: number;
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(API_URL + path);
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

export function useCV2Status() {
  const [data, setData] = useState<CV2Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<CV2Status>("/cv2/status");
    if (result) setData(result);
    else setError("Failed to load CV2 status");
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export function useCrumbsUpSync() {
  const [status, setStatus] = useState<CrumbsUpStatus | null>(null);
  const [members, setMembers] = useState<FederationVoter[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const [statusData, membersData] = await Promise.all([
      apiFetch<CrumbsUpStatus>("/crumbsup/status"),
      apiFetch<FederationVoter[]>("/crumbsup/members"),
    ]);
    if (statusData) setStatus(statusData);
    if (membersData) setMembers(membersData);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { status, members, loading, refetch };
}

export function useFederationVoters() {
  const [voters, setVoters] = useState<FederationVoter[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<FederationVoter[]>("/federation/voters");
    if (result) setVoters(result);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { voters, loading, refetch };
}

export function useSyncHealth() {
  const [health, setHealth] = useState<FederationHealth | null>(null);
  const [status, setStatus] = useState<FederationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const [healthData, statusData] = await Promise.all([
      apiFetch<FederationHealth>("/federation/health"),
      apiFetch<FederationStatus>("/federation/status"),
    ]);
    if (healthData) setHealth(healthData);
    if (statusData) setStatus(statusData);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { health, status, loading, refetch };
}

export function useFederationProposals() {
  const [proposals, setProposals] = useState<FederationProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<FederationProposal[]>("/federation/proposals");
    if (result) setProposals(result);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { proposals, loading, refetch };
}

export function useVoteWeights() {
  const [weights, setWeights] = useState<VoteWeights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<VoteWeights>("/cv2/vote-weights").then(data => {
      if (data) setWeights(data);
      setLoading(false);
    });
  }, []);

  return { weights, loading };
}
