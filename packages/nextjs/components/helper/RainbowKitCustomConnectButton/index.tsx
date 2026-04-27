"use client";

import { useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address, formatEther } from "viem";
import { useDisconnect } from "wagmi";
import { useOutsideClick } from "~~/hooks/helper";
import { useWatchBalance } from "~~/hooks/helper/useWatchBalance";
import { getTargetNetworks } from "~~/utils/helper";

const allowedNetworks = getTargetNetworks();

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function AppleWalletButton({
  account,
  chain,
  openConnectModal,
}: {
  account?: { address: string; displayName: string; ensAvatar?: string };
  chain?: { id: number; name?: string; unsupported?: boolean };
  openConnectModal: () => void;
}) {
  const { disconnect } = useDisconnect();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useOutsideClick(dropdownRef, () => setOpen(false));

  if (!account || !chain || !chain.name) {
    return (
      <button
        onClick={openConnectModal}
        className="bg-apple-blue text-white text-sm font-medium rounded-full px-5 py-2 transition-transform active:scale-95"
      >
        Connect Wallet
      </button>
    );
  }

  if (chain.unsupported) {
    return (
      <button
        onClick={openConnectModal}
        className="bg-red-600 text-white text-sm font-medium rounded-full px-5 py-2 transition-transform active:scale-95"
      >
        Wrong Network
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white rounded-full pl-3 pr-4 py-1.5 transition-colors"
      >
        <WalletAvatar address={account.address} ensAvatar={account.ensAvatar} />
        <span className="text-sm font-medium">{shortenAddress(account.address)}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-apple-hairline overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-apple-divider">
            <p className="text-caption text-apple-ink-muted-48">Connected</p>
            <p className="text-body-strong text-apple-ink">{account.displayName}</p>
          </div>

          <div className="px-4 py-2 border-b border-apple-divider">
            <WalletBalance address={account.address as Address} />
            <p className="text-caption text-apple-ink-muted-48 mt-1">{chain.name ?? "Unknown"}</p>
          </div>

          {allowedNetworks.length > 1 && (
            <div className="px-4 py-2 border-b border-apple-divider space-y-1">
              <p className="text-caption text-apple-ink-muted-48 mb-1">Switch Network</p>
              {allowedNetworks.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    // RainbowKit handles network switching via its own modal
                    // This is a simplified display
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    n.id === chain.id ? "bg-apple-blue text-white" : "text-apple-ink hover:bg-apple-parchment"
                  }`}
                >
                  {n.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function WalletAvatar({ address, ensAvatar }: { address: string; ensAvatar?: string }) {
  if (ensAvatar) {
    return <img src={ensAvatar} alt="" className="w-6 h-6 rounded-full" />;
  }
  // Simple blockie-like colored circle
  const hue = parseInt(address.slice(2, 10), 16) % 360;
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
    >
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
}

function WalletBalance({ address }: { address: Address }) {
  const { data: balance, isLoading } = useWatchBalance({ address });
  if (isLoading || !balance) {
    return <div className="h-5 w-20 bg-apple-divider rounded animate-pulse" />;
  }
  const val = Number(formatEther(balance.value));
  return (
    <p className="text-body text-apple-ink font-mono">
      {val.toFixed(4)} {balance.symbol}
    </p>
  );
}

export const RainbowKitCustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        if (!mounted) return null;
        return <AppleWalletButton account={account} chain={chain} openConnectModal={openConnectModal} />;
      }}
    </ConnectButton.Custom>
  );
};
