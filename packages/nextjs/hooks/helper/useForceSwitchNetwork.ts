"use client";

import { useCallback, useEffect, useState } from "react";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
const SEPOLIA_CHAIN_ID_NUM = 11155111;

export function useForceSwitchNetwork() {
  const [walletChainId, setWalletChainId] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleChainChanged = (chainId: string) => {
      setWalletChainId(chainId);
    };

    if (ethereum.chainId) {
      setWalletChainId(ethereum.chainId);
    }

    ethereum.on("chainChanged", handleChainChanged);
    return () => ethereum.removeListener("chainChanged", handleChainChanged);
  }, []);

  const needsSwitch = Boolean(walletChainId && walletChainId !== SEPOLIA_CHAIN_ID);

  const forceSwitchToSepolia = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added to MetaMask
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org", "https://sepolia.drpc.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  return { needsSwitch, forceSwitchToSepolia, walletChainId, sepoliaChainId: SEPOLIA_CHAIN_ID_NUM };
}
