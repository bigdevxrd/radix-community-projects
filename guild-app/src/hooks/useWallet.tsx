"use client";
import { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
import { RadixDappToolkit, RadixNetwork, DataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";
import { DAPP_DEF, BADGE_NFT } from "@/lib/constants";
import { loadUserBadge } from "@/lib/gateway";
import type { BadgeInfo } from "@/lib/types";

interface WalletState {
  account: string | null;
  connected: boolean;
  rdt: RadixDappToolkit | null;
  badge: BadgeInfo | null;
  badgeLoading: boolean;
  refreshBadge: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  account: null,
  connected: false,
  rdt: null,
  badge: null,
  badgeLoading: false,
  refreshBadge: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [badge, setBadge] = useState<BadgeInfo | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const rdtRef = useRef<RadixDappToolkit | null>(null);
  const accountRef = useRef<string | null>(null);

  const doLoadBadge = useCallback(async (addr: string) => {
    setBadgeLoading(true);
    const result = await loadUserBadge(addr, BADGE_NFT);
    setBadge(result);
    setBadgeLoading(false);
  }, []);

  const refreshBadge = useCallback(async () => {
    if (accountRef.current) await doLoadBadge(accountRef.current);
  }, [doLoadBadge]);

  useEffect(() => {
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: DAPP_DEF,
      networkId: RadixNetwork.Mainnet,
      applicationName: "Radix Guild",
      applicationVersion: "1.0.0",
    });
    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));
    rdt.walletApi.walletData$.subscribe((data) => {
      const accts = data?.accounts ?? [];
      const addr = accts[0]?.address ?? null;
      setAccount(addr);
      accountRef.current = addr;
      if (addr) doLoadBadge(addr);
      else setBadge(null);
    });
    rdtRef.current = rdt;
    return () => rdt.destroy();
  }, [doLoadBadge]);

  return (
    <WalletContext.Provider
      value={{
        account,
        connected: !!account,
        rdt: rdtRef.current,
        badge,
        badgeLoading,
        refreshBadge,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
