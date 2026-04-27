"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const targetChainId = scaffoldConfig.targetNetworks[0]?.id;

export function useAutoSwitchNetwork() {
  const [mounted, setMounted] = useState(false);
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isConnected || !chain || !targetChainId) return;
    if (chain.id !== targetChainId) {
      switchChain?.({ chainId: targetChainId });
    }
  }, [mounted, isConnected, chain, switchChain]);
}
