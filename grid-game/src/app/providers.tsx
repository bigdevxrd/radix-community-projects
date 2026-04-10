"use client";

import { WalletProvider } from "@/hooks/useWallet";
import { GameProvider } from "@/hooks/useGame";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <GameProvider>{children}</GameProvider>
    </WalletProvider>
  );
}
