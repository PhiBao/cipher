"use client";

import { useEffect, useMemo, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { IndexedDBStorage, RelayerWeb, SepoliaConfig, type ZamaSDKEvent } from "@zama-fhe/sdk";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/helper";
import { useAutoSwitchNetwork } from "~~/hooks/helper/useAutoSwitchNetwork";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { WagmiSigner } from "~~/services/web3/wagmiSigner";

const signer = new WagmiSigner({ config: wagmiConfig });
const storage = new IndexedDBStorage("KeypairStore", 1);
const sessionStorage = new IndexedDBStorage("SignatureStore", 1);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const ZamaRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const relayer = useMemo(
    () =>
      new RelayerWeb({
        getChainId: () => signer.getChainId(),
        transports: {
          [SepoliaConfig.chainId]: SepoliaConfig,
        },
      }),
    [],
  );

  useEffect(() => {
    return () => {
      relayer.terminate();
    };
  }, [relayer]);

  function dispatchEvent(event: ZamaSDKEvent) {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }

  return (
    <ZamaProvider
      relayer={relayer}
      signer={signer}
      storage={storage}
      sessionStorage={sessionStorage}
      onEvent={dispatchEvent}
    >
      {children}
    </ZamaProvider>
  );
};

function AutoSwitchNetwork() {
  useAutoSwitchNetwork();
  return null;
}

export const DappWrapperWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ZamaRuntimeProvider>
            <AutoSwitchNetwork />
            <ProgressBar height="3px" color="#0066cc" />
            <div className={`flex flex-col min-h-screen`}>
              <Header />
              <main className="relative flex flex-col flex-1">{children}</main>
            </div>
            <Toaster />
          </ZamaRuntimeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
