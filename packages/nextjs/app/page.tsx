"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCipherProtocolWagmi } from "~~/hooks/useCipherProtocolWagmi";
import { useWalletHistory } from "~~/hooks/useWalletHistory";

// ---------- Utilities ----------

const fmtEth = (wei: bigint | number | string | undefined | null) => {
  if (wei === undefined || wei === null) return "0 ETH";
  try {
    const s = typeof wei === "bigint" ? formatEther(wei) : String(wei);
    const num = Number(s);
    if (Number.isNaN(num)) return "0 ETH";
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`;
  } catch {
    return "0 ETH";
  }
};

const fmtPct = (bps: bigint | number | string | undefined | null) => {
  if (bps === undefined || bps === null) return "0.0%";
  const num = Number(bps) / 100;
  if (Number.isNaN(num)) return "0.0%";
  return `${num.toFixed(1)}%`;
};

// ---------- UI Primitives ----------

const PillButton = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "dark" | "danger";
  title?: string;
}) => {
  const base =
    "inline-flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none font-medium";
  const styles =
    variant === "primary"
      ? "bg-apple-blue text-white rounded-full px-6 py-3 text-body shadow-sm hover:shadow-md"
      : variant === "secondary"
        ? "bg-transparent text-apple-blue border border-apple-blue rounded-full px-6 py-3 text-body hover:bg-apple-blue/5"
        : variant === "danger"
          ? "bg-red-500 text-white rounded-full px-6 py-3 text-body shadow-sm hover:bg-red-600"
          : "bg-apple-ink text-white rounded-lg px-4 py-2 text-caption";
  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
};

const DataRow = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
    <span className="text-caption text-white/60">{label}</span>
    <span className={`text-body text-white ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="text-center mb-12">
    <h2 className="text-display-lg text-white mb-3">{title}</h2>
    {subtitle && <p className="text-lead text-white/70 max-w-2xl mx-auto">{subtitle}</p>}
  </div>
);

const TierBadge = ({ tier }: { tier: number }) => {
  const config: Record<number, { label: string; color: string; desc: string }> = {
    1: { label: "A", color: "bg-emerald-500", desc: "Excellent" },
    2: { label: "B", color: "bg-apple-blue", desc: "Good" },
    3: { label: "C", color: "bg-amber-500", desc: "Fair" },
    4: { label: "D", color: "bg-red-500", desc: "Risky" },
  };
  const c = config[tier] || { label: "—", color: "bg-white/20", desc: "Unknown" };
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full ${c.color} flex items-center justify-center text-white font-bold text-sm`}
      >
        {c.label}
      </div>
      <div>
        <p className="text-body text-white font-semibold">{c.desc}</p>
        <p className="text-caption text-white/60">Tier {c.label}</p>
      </div>
    </div>
  );
};

const StepIndicator = ({ steps, current }: { steps: string[]; current: number }) => (
  <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
    {steps.map((s, i) => (
      <div key={s} className="flex items-center gap-2 shrink-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
            i < current
              ? "bg-emerald-500 text-white"
              : i === current
                ? "bg-apple-blue text-white"
                : "bg-white/10 text-white/50"
          }`}
        >
          {i < current ? "✓" : i + 1}
        </div>
        <span className={`text-caption ${i <= current ? "text-white/90" : "text-white/40"}`}>{s}</span>
        {i < steps.length - 1 && <div className="w-4 h-px bg-white/20" />}
      </div>
    ))}
  </div>
);

const InfoTooltip = ({ text }: { text: string }) => (
  <span className="group relative inline-block ml-1">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline text-white/30">
      <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
      <path d="M7 4V5.5M7 6.5V10" stroke="currentColor" strokeLinecap="round" />
    </svg>
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-apple-ink text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
      {text}
    </span>
  </span>
);

const UtilizationBar = ({ bps }: { bps: bigint }) => {
  const pct = Math.min(Number(bps) / 100, 100);
  const color = pct < 30 ? "bg-emerald-500" : pct < 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full">
      <div className="flex justify-between text-caption text-white/60 mb-1">
        <span>Utilization</span>
        <span className="font-mono">{fmtPct(bps)}</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ---------- Dashboard Panels ----------

const ApplyPanel = ({ cipher }: { cipher: ReturnType<typeof useCipherProtocolWagmi> }) => {
  const [txCount, setTxCount] = useState("0");
  const [volume, setVolume] = useState("0");
  const [age, setAge] = useState("0");

  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
  const { history, scan } = useWalletHistory(apiKey);
  const { address } = useAccount();

  useEffect(() => {
    if (history.isScanned) {
      setTxCount(String(history.txCount));
      setVolume(history.totalVolumeEth);
      setAge(String(history.walletAgeDays));
    }
  }, [history]);

  useEffect(() => {
    if (address && apiKey && !history.isScanned && !history.isLoading) {
      scan(address);
    }
  }, [address, apiKey, history.isScanned, history.isLoading, scan]);

  const canRefresh = Boolean(apiKey && address);
  const inputBase =
    "w-full bg-apple-tile-3 text-white rounded-lg px-4 py-3 text-body border border-white/10 opacity-60 cursor-not-allowed";

  return (
    <div className="bg-apple-tile-2 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-tagline text-white">Apply for Score</h3>
          <p className="text-caption text-white/50 mt-1">Encrypted credit scoring via FHE</p>
        </div>
        {canRefresh && (
          <PillButton variant="secondary" onClick={() => scan(address!)} disabled={history.isLoading}>
            {history.isLoading ? "Scanning..." : "Refresh"}
          </PillButton>
        )}
      </div>

      {history.error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-caption text-red-300">{history.error}</p>
        </div>
      )}

      {!history.isScanned && !history.isLoading && (
        <div className="mb-4 bg-apple-blue/10 border border-apple-blue/30 rounded-lg px-4 py-2">
          <p className="text-caption text-apple-blue">Click Refresh to load your on-chain history from Alchemy.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-caption text-white/60 block mb-2">
            Transactions <InfoTooltip text="Total unique transactions on Sepolia. Read-only from Alchemy." />
          </label>
          <input type="number" value={txCount} readOnly className={inputBase} />
        </div>
        <div>
          <label className="text-caption text-white/60 block mb-2">
            Volume (ETH) <InfoTooltip text="Sum of all ETH transferred in + out. Read-only from Alchemy." />
          </label>
          <input type="number" value={volume} readOnly className={inputBase} />
        </div>
        <div>
          <label className="text-caption text-white/60 block mb-2">
            Wallet Age (days) <InfoTooltip text="Days since first transaction. Read-only from Alchemy." />
          </label>
          <input type="number" value={age} readOnly className={inputBase} />
        </div>
        <div>
          <label className="text-caption text-white/60 block mb-2">
            Defaults{" "}
            <InfoTooltip text="Recorded on-chain when a loan is liquidated after 30 days overdue. Read-only." />
          </label>
          <input type="number" value={cipher.defaultCount} readOnly className={inputBase} />
        </div>
      </div>

      <PillButton
        onClick={() => cipher.applyForScore(Number(txCount), Number(volume), Number(age))}
        disabled={cipher.isProcessing}
      >
        {cipher.isProcessing ? "Computing in FHE..." : "Submit Encrypted Application"}
      </PillButton>
      <p className="text-caption text-white/40 mt-3">
        Data is encrypted in-browser before reaching the blockchain. The contract never sees raw values.
      </p>
    </div>
  );
};

const ScorePanel = ({ cipher }: { cipher: ReturnType<typeof useCipherProtocolWagmi> }) => {
  const hasScore = cipher.hasScore;
  const isDecrypted = cipher.isScoreDecrypted;
  const awaiting = cipher.awaitingScore;
  const stepIndex = !hasScore && !awaiting ? 0 : awaiting ? 1 : !isDecrypted ? 1 : 2;

  return (
    <div className="bg-apple-tile-2 rounded-2xl p-6 md:p-8">
      <div className="mb-2">
        <h3 className="text-tagline text-white">My Credit Score</h3>
        <p className="text-caption text-white/50 mt-1">Confidential score computed on-chain</p>
      </div>
      <StepIndicator steps={["Apply", "Decrypt", "Reveal"]} current={stepIndex} />

      {awaiting && !hasScore ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-apple-blue">
              <path
                d="M12 15V17M6 21H18M19 10V8C19 6.89543 18.1046 6 17 6H7C5.89543 6 5 6.89543 5 8V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-body text-white/60 mb-2">Encrypted score arriving...</p>
          <p className="text-caption text-white/40">
            Your score is being written on-chain. This may take a few seconds.
          </p>
        </div>
      ) : !hasScore ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
              <path
                d="M12 15V17M6 21H18M19 10V8C19 6.89543 18.1046 6 17 6H7C5.89543 6 5 6.89543 5 8V10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-body text-white/60 mb-2">No encrypted score yet</p>
          <p className="text-caption text-white/40">
            Submit an application to generate your confidential credit score.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1 mb-6">
            <DataRow
              label="Encrypted Handle"
              value={
                cipher.scoreHandle ? <span className="font-mono text-[10px] break-all">{cipher.scoreHandle}</span> : "—"
              }
              mono
            />
            <DataRow
              label="Decrypted Score"
              value={
                cipher.isScoreDecrypted ? (
                  <span className="text-2xl font-bold text-white">{String(cipher.decryptedScore)}</span>
                ) : cipher.isDecrypting ? (
                  <span className="text-apple-blue animate-pulse">Decrypting via KMS...</span>
                ) : (
                  <span className="text-white/30">???</span>
                )
              }
            />
            <DataRow
              label="Tier"
              value={
                cipher.isTierDecrypted ? (
                  <TierBadge tier={Number(cipher.decryptedTier)} />
                ) : cipher.isDecrypting ? (
                  <span className="text-apple-blue animate-pulse">Decrypting...</span>
                ) : (
                  <span className="text-white/30">???</span>
                )
              }
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <PillButton
              onClick={cipher.requestDecryption}
              disabled={!cipher.canDecrypt || cipher.isDecrypting}
              title={
                !hasScore
                  ? "Submit an application first"
                  : cipher.isDecrypting
                    ? "Waiting for KMS..."
                    : "Decrypt your score"
              }
            >
              {cipher.isDecrypting
                ? "Waiting for KMS..."
                : cipher.isScoreDecrypted
                  ? "Re-decrypt"
                  : "Decrypt Score & Tier"}
            </PillButton>
            {cipher.isTierDecrypted && cipher.decryptedTier && cipher.userTier === 0 && (
              <PillButton
                variant="secondary"
                onClick={() => cipher.revealTier(Number(cipher.decryptedTier))}
                disabled={cipher.isProcessing}
              >
                Reveal Tier On-Chain
              </PillButton>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const LoanPanel = ({ cipher }: { cipher: ReturnType<typeof useCipherProtocolWagmi> }) => {
  const [borrowAmount, setBorrowAmount] = useState("0.5");

  const tierName = cipher.userTier > 0 ? ["", "A", "B", "C", "D"][cipher.userTier] : null;
  const limitEth = cipher.tierLimit > 0n ? formatEther(cipher.tierLimit) : "0";
  const feeRate = Number(cipher.borrowFeeBps) / 100;
  const interestRate = Number(cipher.interestBps) / 100;

  const borrowPrincipal = parseFloat(borrowAmount) || 0;
  const borrowFee = borrowPrincipal * (feeRate / 100);
  const received = borrowPrincipal - borrowFee;
  const interest = borrowPrincipal * (interestRate / 100);

  return (
    <div className="bg-apple-tile-2 rounded-2xl p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-tagline text-white">Micro-Lending</h3>
        <p className="text-caption text-white/50 mt-1">
          {feeRate}% origination fee · {interestRate}% interest
        </p>
      </div>

      {!tierName ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
              <path
                d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-body text-white/60 mb-2">Tier not revealed</p>
          <p className="text-caption text-white/40">Decrypt your score and reveal your tier to access loans.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <TierBadge tier={cipher.userTier} />
          </div>

          <div className="space-y-1 mb-6">
            <DataRow label="Borrow Limit" value={fmtEth(cipher.tierLimit)} />
            <DataRow label="Active Loan" value={cipher.loanActive ? fmtEth(cipher.loanPrincipal) : "None"} />
            {cipher.loanActive && (
              <>
                <DataRow label="Repaid" value={fmtEth(cipher.loanRepaid)} />
                <DataRow label="Interest Due" value={fmtEth(cipher.repaymentDue.remaining)} />
                <DataRow label="Total to Close" value={fmtEth(cipher.repaymentDue.totalDue)} />
              </>
            )}
          </div>

          {!cipher.loanActive && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  step="0.01"
                  max={limitEth}
                  value={borrowAmount}
                  onChange={e => setBorrowAmount(e.target.value)}
                  className="flex-1 bg-apple-tile-3 text-white rounded-lg px-4 py-3 text-body border border-white/10 focus:border-apple-blue focus:outline-none"
                />
                <PillButton onClick={() => cipher.borrow(borrowAmount)} disabled={cipher.isProcessing}>
                  {cipher.isProcessing ? "Processing..." : "Borrow"}
                </PillButton>
              </div>
              {borrowPrincipal > 0 && (
                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-caption">
                    <span className="text-white/50">Principal</span>
                    <span className="text-white font-mono">{borrowPrincipal.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-caption">
                    <span className="text-white/50">Origination Fee ({feeRate}%)</span>
                    <span className="text-amber-400 font-mono">-{borrowFee.toFixed(4)} ETH</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-body">
                    <span className="text-white/70">You Receive</span>
                    <span className="text-emerald-400 font-mono font-semibold">{received.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-caption">
                    <span className="text-white/50">Interest ({interestRate}%)</span>
                    <span className="text-white/70 font-mono">{interest.toFixed(4)} ETH due on repay</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {cipher.loanActive && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-caption text-white/50 mb-2">Repay to close loan</p>
                <div className="flex justify-between text-body mb-1">
                  <span className="text-white/70">Total Due</span>
                  <span className="text-white font-mono font-semibold">{fmtEth(cipher.repaymentDue.totalDue)}</span>
                </div>
                <div className="flex justify-between text-caption">
                  <span className="text-white/50">Remaining</span>
                  <span className="text-amber-400 font-mono">{fmtEth(cipher.repaymentDue.remaining)}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <PillButton
                  onClick={() => {
                    const remaining = cipher.repaymentDue?.remaining ?? 0n;
                    if (remaining > 0n) cipher.repayLoan(formatEther(remaining));
                  }}
                  disabled={cipher.isProcessing || (cipher.repaymentDue?.remaining ?? 0n) === 0n}
                >
                  {cipher.isProcessing
                    ? "Processing..."
                    : `Repay ${fmtEth(cipher.repaymentDue?.remaining).replace(" ETH", "").slice(0, 6)} ETH`}
                </PillButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PoolPanel = ({ cipher }: { cipher: ReturnType<typeof useCipherProtocolWagmi> }) => {
  const [depositAmount, setDepositAmount] = useState("1");
  const [withdrawAmount, setWithdrawAmount] = useState("0.5");
  const hasPosition = cipher.userDeposits > 0n;

  return (
    <div className="bg-apple-canvas border border-apple-hairline rounded-2xl p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-tagline text-apple-ink">Lending Pool</h3>
        <p className="text-caption text-apple-ink-muted-48 mt-1">Deposit ETH to earn yield from borrower fees</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-apple-divider">
          <span className="text-caption text-apple-ink-muted-48">Total Assets</span>
          <span className="text-body text-apple-ink font-mono">{fmtEth(cipher.totalAssets)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-apple-divider">
          <span className="text-caption text-apple-ink-muted-48">Cash Reserves</span>
          <span className="text-body text-apple-ink font-mono">{fmtEth(cipher.poolBalance)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-apple-divider">
          <span className="text-caption text-apple-ink-muted-48">Total Borrows</span>
          <span className="text-body text-apple-ink font-mono">{fmtEth(cipher.totalBorrows)}</span>
        </div>
        <div className="pt-1">
          <UtilizationBar bps={cipher.utilizationBps} />
        </div>
        {hasPosition && (
          <div className="flex justify-between items-center py-2 border-b border-apple-divider">
            <span className="text-caption text-apple-ink-muted-48">Your Position</span>
            <span className="text-body text-emerald-600 font-mono">{fmtEth(cipher.userDepositValue)}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-caption text-apple-ink-muted-48">Contract</span>
          <a
            href={`https://sepolia.etherscan.io/address/${cipher.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body text-apple-blue font-mono text-xs hover:underline"
          >
            {cipher.contractAddress
              ? `${cipher.contractAddress.slice(0, 8)}...${cipher.contractAddress.slice(-6)}`
              : "—"}
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            step="0.1"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            className="flex-1 bg-apple-pearl text-apple-ink rounded-lg px-4 py-3 text-body border border-apple-hairline focus:border-apple-blue focus:outline-none"
          />
          <PillButton onClick={() => cipher.depositLiquidity(depositAmount)} disabled={cipher.isProcessing}>
            {cipher.isProcessing ? "Processing..." : "Deposit"}
          </PillButton>
        </div>

        {hasPosition && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number"
              step="0.1"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              className="flex-1 bg-apple-pearl text-apple-ink rounded-lg px-4 py-3 text-body border border-apple-hairline focus:border-apple-blue focus:outline-none"
            />
            <PillButton
              variant="secondary"
              onClick={() => cipher.withdrawLiquidity(withdrawAmount)}
              disabled={cipher.isProcessing}
            >
              {cipher.isProcessing ? "Processing..." : "Withdraw"}
            </PillButton>
          </div>
        )}
      </div>

      <p className="text-caption text-apple-ink-muted-48 mt-3">
        Yield comes from 2.5% origination fees and 5% repayment interest. Funds are non-custodial.
      </p>
    </div>
  );
};

// ---------- Main Page ----------

export default function Home() {
  const { isConnected } = useAccount();
  const cipher = useCipherProtocolWagmi();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-apple-tile-1 text-white py-24 md:py-32 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-hero mb-4">Cipher</h1>
          <p className="text-lead text-white/90 mb-2">Confidential credit. Built on FHE.</p>
          <p className="text-body text-white/60 max-w-xl mx-auto mb-8">
            The first privacy-preserving on-chain credit scoring and micro-lending protocol. Your financial data stays
            encrypted—even while the protocol computes your score.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="#dashboard">
              <PillButton>Launch App</PillButton>
            </a>
            <a href="#how-it-works">
              <PillButton variant="secondary">Learn more</PillButton>
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-apple-parchment py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display-lg text-apple-ink mb-3">How it works</h2>
            <p className="text-body text-apple-ink-muted-48 max-w-xl mx-auto">
              Fully Homomorphic Encryption makes it possible to compute on encrypted data without ever decrypting it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Scan & Encrypt",
                desc: "We read your wallet history from Alchemy and encrypt it in-browser. The smart contract never sees your raw transactions.",
              },
              {
                step: "02",
                title: "Compute on FHE",
                desc: "The contract runs a weighted scoring formula on ciphertext using 7 different FHE operations—add, mul, div, ge, lt, select.",
              },
              {
                step: "03",
                title: "Decrypt & Borrow",
                desc: "Only you can decrypt your score via the Zama KMS. Reveal your tier to access ETH loans from the community pool.",
              },
            ].map(item => (
              <div
                key={item.step}
                className="bg-apple-canvas rounded-xl border border-apple-hairline p-6 md:p-8 hover:shadow-lg transition-shadow"
              >
                <span className="text-caption-strong text-apple-blue mb-3 block">{item.step}</span>
                <h3 className="text-tagline text-apple-ink mb-2">{item.title}</h3>
                <p className="text-body text-apple-ink-muted-48">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section id="dashboard" className="bg-apple-tile-1 py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            title="Dashboard"
            subtitle="Interact with the Cipher protocol. All score computations happen on encrypted data via Zama's FHEVM."
          />

          {!isConnected ? (
            <div className="bg-apple-tile-2 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/30">
                  <path
                    d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-lead text-white mb-6">Connect your wallet to use Cipher.</p>
              <RainbowKitCustomConnectButton />
            </div>
          ) : (
            <div className="space-y-6">
              {cipher.message && (
                <div className="bg-apple-blue/10 border border-apple-blue/30 rounded-xl px-6 py-4 flex items-start gap-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="text-apple-blue shrink-0 mt-0.5"
                  >
                    <path
                      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path d="M10 6V10M10 14V14.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="text-body text-white">{cipher.message}</p>
                </div>
              )}

              {/* Protocol Stats Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Assets", value: fmtEth(cipher.totalAssets) },
                  { label: "Utilization", value: fmtPct(cipher.utilizationBps) },
                  { label: "Total Borrows", value: fmtEth(cipher.totalBorrows) },
                  { label: "Pool Cash", value: fmtEth(cipher.poolBalance) },
                ].map(stat => (
                  <div key={stat.label} className="bg-apple-tile-2 rounded-xl p-4 text-center">
                    <p className="text-caption text-white/50 mb-1">{stat.label}</p>
                    <p className="text-body text-white font-mono font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ApplyPanel cipher={cipher} />
                <ScorePanel cipher={cipher} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LoanPanel cipher={cipher} />
                <PoolPanel cipher={cipher} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Architecture */}
      <section className="bg-apple-parchment py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display-lg text-apple-ink mb-3">Architecture</h2>
            <p className="text-body text-apple-ink-muted-48 max-w-xl mx-auto">
              A simple but powerful stack: Zama FHEVM for confidential compute, Foundry for contracts, and Next.js for
              the frontend.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                title: "FHEVM Smart Contract",
                desc: "Solidity contract using Zama's TFHE library. Computes encrypted credit scores with add, mul, div, ge, lt, and select operations.",
              },
              {
                title: "Encrypted Inputs",
                desc: "User data is encrypted in-browser via the Zama SDK before ever reaching the blockchain.",
              },
              {
                title: "Programmable Decryption",
                desc: "Only the wallet owner can decrypt their score. The contract enforces ACL permissions on every encrypted handle.",
              },
              {
                title: "Micro-Lending Pool",
                desc: "Community-funded ETH pool with real yield from origination fees (2.5%) and repayment interest (5%). Borrowers access tier-based loans after proving creditworthiness.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-apple-canvas rounded-xl border border-apple-hairline p-6 md:p-8 flex flex-col md:flex-row md:items-start gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-apple-blue text-white flex items-center justify-center text-caption-strong shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-tagline text-apple-ink mb-1">{item.title}</h3>
                  <p className="text-body text-apple-ink-muted-48">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="bg-apple-tile-1 py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-display-lg text-white mb-4">Our Vision</h2>
          <p className="text-lead text-white/80 mb-6">
            Credit scoring should not require surrendering your entire financial history to a black box.
          </p>
          <p className="text-body text-white/60">
            Cipher is a step toward a world where on-chain reputation is private by default—where lenders can assess
            risk without seeing raw data, and where borrowers retain sovereignty over their financial identity. Fully
            Homomorphic Encryption is the key that unlocks this future.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-apple-parchment border-t border-apple-hairline py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-caption-strong text-apple-ink mb-1">Cipher</p>
            <p className="text-fine-print text-apple-ink-muted-48">
              Built for the Zama Developer Program. Confidential Finance is the next frontier.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://docs.zama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-apple-ink-muted-48 hover:text-apple-blue transition-colors"
            >
              Zama Docs
            </a>
            <a
              href="https://github.com/zama-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-apple-ink-muted-48 hover:text-apple-blue transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
