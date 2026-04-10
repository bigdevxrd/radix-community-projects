"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  RadixDappToolkit,
  RadixNetwork,
  DataRequestBuilder,
} from "@radixdlt/radix-dapp-toolkit";
import { DAPP_DEF, NETWORK_ID } from "@/lib/constants";

interface WalletState {
  account: string | null;
  connected: boolean;
  rdt: RadixDappToolkit | null;
}

const WalletContext = createContext<WalletState>({
  account: null,
  connected: false,
  rdt: null,
});

export function useWallet() {
  return useContext(WalletContext);
}

function networkFromId(id: number): number {
  if (id === 2) return RadixNetwork.Stokenet;
  return RadixNetwork.Mainnet;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const rdtRef = useRef<RadixDappToolkit | null>(null);

  useEffect(() => {
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: DAPP_DEF,
      networkId: networkFromId(NETWORK_ID),
      applicationName: "Meme Grid",
      applicationVersion: "1.0.0",
    });

    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));

    rdt.walletApi.walletData$.subscribe((data) => {
      const accts = data?.accounts ?? [];
      setAccount(accts[0]?.address ?? null);
    });

    rdtRef.current = rdt;
    return () => rdt.destroy();
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, connected: !!account, rdt: rdtRef.current }}
    >
      {children}
    </WalletContext.Provider>
  );
}
