"use client";

import { useCallback, useState } from "react";
import { parseEther } from "viem";

const ALCHEMY_RPC = "https://eth-sepolia.g.alchemy.com/v2/";

export interface WalletHistory {
  txCount: number;
  totalVolumeEth: string;
  walletAgeDays: number;
  isLoading: boolean;
  isScanned: boolean;
  error?: string;
}

async function alchemyFetch(apiKey: string, method: string, params: unknown[]) {
  const res = await fetch(`${ALCHEMY_RPC}${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

/** Convert Alchemy's decimal value (e.g. 0.08 ETH) to wei BigInt safely via viem. */
function ethToWei(val: string | number | undefined): bigint {
  if (!val) return 0n;
  const str = String(val).trim();
  if (!str || str === "0") return 0n;
  try {
    return parseEther(str);
  } catch {
    return 0n;
  }
}

export function useWalletHistory(apiKey: string) {
  const [history, setHistory] = useState<WalletHistory>({
    txCount: 0,
    totalVolumeEth: "0",
    walletAgeDays: 0,
    isLoading: false,
    isScanned: false,
  });

  const scan = useCallback(
    async (address: string) => {
      if (!apiKey || !address) return;
      setHistory(h => ({ ...h, isLoading: true, error: undefined }));
      try {
        const [sent, received] = await Promise.all([
          alchemyFetch(apiKey, "alchemy_getAssetTransfers", [
            {
              fromAddress: address,
              category: ["external"],
              withMetadata: false,
            },
          ]),
          alchemyFetch(apiKey, "alchemy_getAssetTransfers", [
            {
              toAddress: address,
              category: ["external"],
              withMetadata: false,
            },
          ]),
        ]);

        const sentTxs = sent?.transfers || [];
        const receivedTxs = received?.transfers || [];
        const allTxs = [...sentTxs, ...receivedTxs];

        const uniqueHashes = new Set(allTxs.map((t: any) => t.hash));
        const txCount = uniqueHashes.size;

        // Sum volume in wei safely (handles decimal values from Alchemy)
        const totalWei = allTxs.reduce((sum: bigint, t: any) => sum + ethToWei(t.value), 0n);
        const totalVolumeEth = (Number(totalWei) / 1e18).toFixed(4);

        let walletAgeDays = 0;
        if (allTxs.length > 0) {
          const earliestBlock = Math.min(...allTxs.map((t: any) => parseInt(t.blockNum, 16) || Infinity));
          if (earliestBlock !== Infinity) {
            const block = await alchemyFetch(apiKey, "eth_getBlockByNumber", [
              "0x" + earliestBlock.toString(16),
              false,
            ]);
            const ts = parseInt(block?.timestamp, 16);
            if (ts) {
              walletAgeDays = Math.floor((Date.now() / 1000 - ts) / 86400);
            }
          }
        }

        setHistory({
          txCount,
          totalVolumeEth,
          walletAgeDays,
          isLoading: false,
          isScanned: true,
        });
      } catch (err) {
        setHistory(h => ({
          ...h,
          isLoading: false,
          error: err instanceof Error ? err.message : "Scan failed",
        }));
      }
    },
    [apiKey],
  );

  return { history, scan };
}
