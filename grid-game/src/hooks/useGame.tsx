"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { GAME_API } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface PlayerData {
  radix_address: string;
  meme_coins: number;
  level: number;
  xp: number;
  total_rolls: number;
  total_wins: number;
  jackpots: number;
  nfts_earned: number;
  level_name: string;
  level_emoji: string;
  next_level_xp: number;
}

export interface BoardData {
  id: string;
  grid: string[][];
  score: number;
  rolls_used: number;
  status: string;
  wild_cards: number;
  extra_turns: number;
}

export interface NFTData {
  id: string;
  nft_type: string;
  name: string;
  rarity: string;
  image_emoji: string;
  earned_at: string;
  metadata: Record<string, unknown>;
}

export interface RollResult {
  dice: number[];
  matched: boolean;
  points_earned: number;
  xp_earned: number;
  cell_type: string;
  message: string;
  nft_earned?: NFTData;
  extra_turn?: boolean;
  board: BoardData;
  player: PlayerData;
}

interface GameState {
  player: PlayerData | null;
  board: BoardData | null;
  nfts: NFTData[];
  loading: boolean;
  rolling: boolean;
  lastRoll: RollResult | null;
  error: string | null;
  toast: string | null;
  registerPlayer: () => Promise<void>;
  buyCoins: (xrdAmount: number) => Promise<void>;
  newBoard: () => Promise<void>;
  rollDice: () => Promise<void>;
  useWild: (row: number, col: number) => Promise<void>;
  refreshPlayer: () => Promise<void>;
  refreshBoard: () => Promise<void>;
  refreshNfts: () => Promise<void>;
}

const GameContext = createContext<GameState>({
  player: null,
  board: null,
  nfts: [],
  loading: false,
  rolling: false,
  lastRoll: null,
  error: null,
  toast: null,
  registerPlayer: async () => {},
  buyCoins: async () => {},
  newBoard: async () => {},
  rollDice: async () => {},
  useWild: async () => {},
  refreshPlayer: async () => {},
  refreshBoard: async () => {},
  refreshNfts: async () => {},
});

export function useGame() {
  return useContext(GameContext);
}

/* ── Helpers ───────────────────────────────────────────────────────── */

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${GAME_API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `API error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

/* ── Provider ──────────────────────────────────────────────────────── */

export function GameProvider({ children }: { children: ReactNode }) {
  const { account } = useWallet();

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Refresh helpers ──────────────────────────────────────────── */

  const refreshPlayer = useCallback(async () => {
    if (!account) return;
    try {
      const data = await api<PlayerData>(`/player/${account}`);
      setPlayer(data);
    } catch {
      setPlayer(null);
    }
  }, [account]);

  const refreshBoard = useCallback(async () => {
    if (!account) return;
    try {
      const data = await api<BoardData>(`/board/${account}`);
      setBoard(data);
    } catch {
      setBoard(null);
    }
  }, [account]);

  const refreshNfts = useCallback(async () => {
    if (!account) return;
    try {
      const data = await api<NFTData[]>(`/nfts/${account}`);
      setNfts(data);
    } catch {
      setNfts([]);
    }
  }, [account]);

  /* ── Actions ──────────────────────────────────────────────────── */

  const registerPlayer = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<PlayerData>("/register", {
        method: "POST",
        body: JSON.stringify({ radix_address: account }),
      });
      setPlayer(data);
      showToast("Welcome to Meme Grid! 🎮");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [account, showToast]);

  const buyCoins = useCallback(
    async (xrdAmount: number) => {
      if (!account) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api<PlayerData>("/buy-coins", {
          method: "POST",
          body: JSON.stringify({ radix_address: account, xrd_amount: xrdAmount }),
        });
        setPlayer(data);
        showToast(`Bought coins! 🪙`);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [account, showToast],
  );

  const newBoard = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ board: BoardData; player: PlayerData }>(
        "/new-board",
        {
          method: "POST",
          body: JSON.stringify({ radix_address: account }),
        },
      );
      setBoard(data.board);
      setPlayer(data.player);
      setLastRoll(null);
      showToast("New board ready! 🎲");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [account, showToast]);

  const rollDice = useCallback(async () => {
    if (!account) return;
    setRolling(true);
    setError(null);
    try {
      const data = await api<RollResult>("/roll", {
        method: "POST",
        body: JSON.stringify({ radix_address: account }),
      });
      setLastRoll(data);
      setBoard(data.board);
      setPlayer(data.player);

      if (data.nft_earned) {
        showToast(`NFT earned: ${data.nft_earned.name} 🏆`);
        refreshNfts();
      } else if (data.matched) {
        showToast(data.message || `+${data.points_earned} points!`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRolling(false);
    }
  }, [account, showToast, refreshNfts]);

  const useWild = useCallback(
    async (row: number, col: number) => {
      if (!account) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api<{ board: BoardData; player: PlayerData }>(
          "/use-wild",
          {
            method: "POST",
            body: JSON.stringify({ radix_address: account, row, col }),
          },
        );
        setBoard(data.board);
        setPlayer(data.player);
        showToast("Wild card used! 🃏");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [account, showToast],
  );

  /* ── Auto-load on wallet connect ─────────────────────────────── */

  useEffect(() => {
    if (!account) {
      setPlayer(null);
      setBoard(null);
      setNfts([]);
      setLastRoll(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await api<PlayerData>(`/player/${account}`);
        if (!cancelled) setPlayer(data);
      } catch {
        // Player doesn't exist yet — auto-register
        if (!cancelled) {
          try {
            const data = await api<PlayerData>("/register", {
              method: "POST",
              body: JSON.stringify({ radix_address: account }),
            });
            if (!cancelled) {
              setPlayer(data);
              showToast("Welcome to Meme Grid! 🎮");
            }
          } catch (e) {
            if (!cancelled) setError((e as Error).message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, showToast]);

  // Fetch board & NFTs once player is loaded
  useEffect(() => {
    if (player) {
      refreshBoard();
      refreshNfts();
    }
  }, [player, refreshBoard, refreshNfts]);

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <GameContext.Provider
      value={{
        player,
        board,
        nfts,
        loading,
        rolling,
        lastRoll,
        error,
        toast,
        registerPlayer,
        buyCoins,
        newBoard,
        rollDice,
        useWild,
        refreshPlayer,
        refreshBoard,
        refreshNfts,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
