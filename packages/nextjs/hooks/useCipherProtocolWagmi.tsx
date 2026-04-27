"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAllow, useEncrypt, useIsAllowed, useUserDecrypt } from "@zama-fhe/react-sdk";
import { ZERO_HANDLE, ZamaSDKEvents } from "@zama-fhe/sdk";
import { bytesToHex, parseEther } from "viem";
import { useAccount, useBalance, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { CipherProtocol } from "~~/contracts/CipherProtocol";
import { deploymentFor } from "~~/utils/contract";

/** Normalize caught errors into a clean user-facing string. */
function formatError(e: unknown): string {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (
      msg.includes("user rejected") ||
      msg.includes("request denied") ||
      msg.includes("rejected") ||
      msg.includes("cancelled")
    ) {
      return "Transaction rejected by user.";
    }
    if (msg.includes("insufficient funds")) {
      return "Insufficient ETH for gas.";
    }
    return e.message;
  }
  return String(e);
}

export const useCipherProtocolWagmi = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const cipher = useMemo(() => deploymentFor(CipherProtocol, chainId), [chainId]);

  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [awaitingScore, setAwaitingScore] = useState(false);
  const [polledScoreHandle, setPolledScoreHandle] = useState<string | undefined>(undefined);
  const [polledTierHandle, setPolledTierHandle] = useState<string | undefined>(undefined);

  const hasContract = Boolean(cipher?.address && cipher?.abi);
  const contractAddr = (cipher?.address ?? "0x0") as `0x${string}`;

  const MAX_EUINT64 = (1n << 64n) - 1n;
  const MAX_EUINT32 = (1n << 32n) - 1n;

  // ---------- Read: Encrypted Score ----------
  const scoreResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getEncryptedScore" as const,
    account: address,
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const scoreHandle = useMemo(
    () => polledScoreHandle || (scoreResult.data as string | undefined) || undefined,
    [polledScoreHandle, scoreResult.data],
  );

  // ---------- Read: Encrypted Tier ----------
  const tierResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getEncryptedTier" as const,
    account: address,
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const tierHandle = useMemo(
    () => polledTierHandle || (tierResult.data as string | undefined) || undefined,
    [polledTierHandle, tierResult.data],
  );

  // ---------- Read: User Tier ----------
  const userTierResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "userTier" as const,
    args: [address ?? "0x0"],
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const userTier = useMemo(() => (userTierResult.data as number | undefined) ?? 0, [userTierResult.data]);

  // ---------- Read: Default Count ----------
  const defaultCountResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getDefaultCount" as const,
    args: [address ?? "0x0"],
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const defaultCount = useMemo(() => (defaultCountResult.data as number | undefined) ?? 0, [defaultCountResult.data]);

  // ---------- Read: Loan Info ----------
  const loanResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getLoanInfo" as const,
    args: [address ?? "0x0"],
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const loanInfo = useMemo(() => {
    const data = loanResult.data as
      | { principal: bigint; repaid: bigint; active: boolean; startTime: bigint }
      | undefined;
    return data ?? { principal: 0n, repaid: 0n, active: false, startTime: 0n };
  }, [loanResult.data]);

  // ---------- Read: Repayment Due ----------
  const repaymentDueResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getRepaymentDue" as const,
    args: [address ?? "0x0"],
    query: { enabled: Boolean(hasContract && isConnected && address && loanInfo.active), refetchOnWindowFocus: false },
  });
  const repaymentDue = useMemo(() => {
    const data = repaymentDueResult.data as [bigint, bigint] | { totalDue: bigint; remaining: bigint } | undefined;
    if (!data) return { totalDue: 0n, remaining: 0n };
    if (Array.isArray(data)) return { totalDue: data[0], remaining: data[1] };
    return { totalDue: data.totalDue, remaining: data.remaining };
  }, [repaymentDueResult.data]);

  // ---------- Read: Tier Limit ----------
  const tierLimitResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getTierLimit" as const,
    args: [userTier],
    query: { enabled: Boolean(hasContract && isConnected && userTier > 0), refetchOnWindowFocus: false },
  });
  const tierLimit = useMemo(() => (tierLimitResult.data as bigint | undefined) ?? 0n, [tierLimitResult.data]);

  // ---------- Read: Pool Metrics ----------
  const poolBalanceResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getPoolBalance" as const,
    query: { enabled: Boolean(hasContract && isConnected), refetchOnWindowFocus: false },
  });
  const poolBalance = useMemo(() => (poolBalanceResult.data as bigint | undefined) ?? 0n, [poolBalanceResult.data]);

  const totalAssetsResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getTotalAssets" as const,
    query: { enabled: Boolean(hasContract && isConnected), refetchOnWindowFocus: false },
  });
  const totalAssets = useMemo(() => (totalAssetsResult.data as bigint | undefined) ?? 0n, [totalAssetsResult.data]);

  const totalBorrowsResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "totalBorrows" as const,
    query: { enabled: Boolean(hasContract && isConnected), refetchOnWindowFocus: false },
  });
  const totalBorrows = useMemo(() => (totalBorrowsResult.data as bigint | undefined) ?? 0n, [totalBorrowsResult.data]);

  const utilizationResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getUtilization" as const,
    query: { enabled: Boolean(hasContract && isConnected), refetchOnWindowFocus: false },
  });
  const utilizationBps = useMemo(() => (utilizationResult.data as bigint | undefined) ?? 0n, [utilizationResult.data]);

  const userDepositValueResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "getUserDepositValue" as const,
    args: [address ?? "0x0"],
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const userDepositValue = useMemo(
    () => (userDepositValueResult.data as bigint | undefined) ?? 0n,
    [userDepositValueResult.data],
  );

  const userDepositsResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "deposits" as const,
    args: [address ?? "0x0"],
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const userDeposits = useMemo(() => (userDepositsResult.data as bigint | undefined) ?? 0n, [userDepositsResult.data]);

  const borrowFeeBpsResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "BORROW_FEE_BPS" as const,
    query: { enabled: hasContract },
  });
  const borrowFeeBps = useMemo(
    () => (borrowFeeBpsResult.data as bigint | undefined) ?? 250n,
    [borrowFeeBpsResult.data],
  );

  const interestBpsResult = useReadContract({
    address: hasContract ? cipher!.address : undefined,
    abi: hasContract ? cipher!.abi : undefined,
    functionName: "INTEREST_BPS" as const,
    query: { enabled: hasContract },
  });
  const interestBps = useMemo(() => (interestBpsResult.data as bigint | undefined) ?? 500n, [interestBpsResult.data]);

  // ---------- Contract Balance ----------
  const { data: contractBalance } = useBalance({
    address: hasContract ? cipher!.address : undefined,
    query: { enabled: hasContract },
  });

  // ---------- Encrypt / Write ----------
  const encrypt = useEncrypt();
  const { writeContractAsync } = useWriteContract();

  // ---------- Wait-for-receipt helper ----------
  const waitForReceipt = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) return null;
      setMessage("Waiting for block confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
      return receipt;
    },
    [publicClient],
  );

  // ---------- Direct-read polling ----------
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPollingScore = useCallback(() => {
    if (!publicClient || !cipher?.address || !address) return;
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;

    const readDirect = async () => {
      try {
        const [s, t] = await Promise.all([
          publicClient.readContract({
            address: cipher.address,
            abi: cipher.abi,
            functionName: "getEncryptedScore",
            account: address,
          }) as Promise<string>,
          publicClient.readContract({
            address: cipher.address,
            abi: cipher.abi,
            functionName: "getEncryptedTier",
            account: address,
          }) as Promise<string>,
        ]);
        if (s && s !== ZERO_HANDLE) setPolledScoreHandle(s);
        if (t && t !== ZERO_HANDLE) setPolledTierHandle(t);
      } catch {
        /* ignore */
      }
    };

    readDirect();
    pollRef.current = setInterval(() => {
      attempts++;
      readDirect();
      if (attempts >= 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 3000);
  }, [publicClient, cipher, address]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    setPolledScoreHandle(undefined);
    setPolledTierHandle(undefined);
  }, [address]);

  // ---------- Decrypt Setup ----------
  const { mutateAsync: allowAsync, isPending: isAllowing } = useAllow();
  const { data: isAllowed } = useIsAllowed({ contractAddresses: [contractAddr] });

  const [decryptEnabled, setDecryptEnabled] = useState(false);

  const decryptHandles = useMemo(() => {
    const handles: { handle: `0x${string}`; contractAddress: `0x${string}` }[] = [];
    if (scoreHandle && scoreHandle !== ZERO_HANDLE)
      handles.push({ handle: scoreHandle as `0x${string}`, contractAddress: contractAddr });
    if (tierHandle && tierHandle !== ZERO_HANDLE)
      handles.push({ handle: tierHandle as `0x${string}`, contractAddress: contractAddr });
    return handles;
  }, [scoreHandle, tierHandle, contractAddr]);

  const decrypt = useUserDecrypt({ handles: decryptHandles }, { enabled: decryptEnabled && !!isAllowed });

  const decryptedScore = useMemo(() => {
    if (!scoreHandle || !decrypt.data) return undefined;
    return decrypt.data[scoreHandle as `0x${string}`];
  }, [scoreHandle, decrypt.data]);

  const decryptedTier = useMemo(() => {
    if (!tierHandle || !decrypt.data) return undefined;
    return decrypt.data[tierHandle as `0x${string}`];
  }, [tierHandle, decrypt.data]);

  const isScoreDecrypted = decryptedScore !== undefined;
  const isTierDecrypted = decryptedTier !== undefined;
  const isDecrypting = decrypt.isFetching;

  const hasScore = Boolean(scoreHandle && scoreHandle !== ZERO_HANDLE);
  const canDecrypt = Boolean(hasContract && isConnected && address && hasScore && !isDecrypting && !isAllowing);

  useEffect(() => {
    if (hasScore && awaitingScore) setAwaitingScore(false);
  }, [hasScore, awaitingScore]);
  useEffect(() => {
    setDecryptEnabled(false);
  }, [scoreHandle]);
  useEffect(() => {
    if (decryptEnabled && isAllowed && isDecrypting) setMessage("Requesting decryption from KMS...");
  }, [decryptEnabled, isAllowed, isDecrypting]);

  const requestDecryption = useCallback(async () => {
    if (!canDecrypt) return;
    setDecryptEnabled(true);
    if (!isAllowed) {
      setMessage("Authorizing decryption... Check your wallet for a signature request.");
      try {
        await allowAsync([contractAddr]);
        setMessage("Authorization complete. Requesting decryption...");
      } catch (err) {
        setMessage(`Authorization failed: ${formatError(err)}`);
        setDecryptEnabled(false);
      }
      return;
    }
    setMessage("Requesting decryption from KMS...");
  }, [canDecrypt, isAllowed, allowAsync, contractAddr]);

  useEffect(() => {
    if (decrypt.error) {
      setMessage(`Decryption failed: ${decrypt.error.message}`);
      setDecryptEnabled(false);
    }
  }, [decrypt.error]);

  useEffect(() => {
    const ctrl = new AbortController();
    window.addEventListener(ZamaSDKEvents.CredentialsCached, () => setMessage("Credentials ready, decrypting..."), {
      signal: ctrl.signal,
    });
    window.addEventListener(ZamaSDKEvents.DecryptEnd, () => setMessage("Decryption complete!"), {
      signal: ctrl.signal,
    });
    window.addEventListener(
      ZamaSDKEvents.DecryptError,
      (e: Event) => {
        setMessage(`Decryption error: ${(e as CustomEvent).detail?.message || "Unknown error"}`);
        setDecryptEnabled(false);
      },
      { signal: ctrl.signal },
    );
    return () => ctrl.abort();
  }, []);

  // ---------- Apply For Score ----------
  const applyForScore = useCallback(
    async (txCount: number, totalVolumeEth: number, walletAgeDays: number) => {
      if (isProcessing || !hasContract || !cipher?.address || !address || !publicClient) return;
      setIsProcessing(true);
      setAwaitingScore(false);
      setDecryptEnabled(false);
      setPolledScoreHandle(undefined);
      setPolledTierHandle(undefined);
      setMessage("Encrypting financial data...");
      try {
        let totalVolumeWei = parseEther(totalVolumeEth.toString());
        if (totalVolumeWei > MAX_EUINT64) totalVolumeWei = MAX_EUINT64;
        const txCountBig = BigInt(txCount) > MAX_EUINT32 ? MAX_EUINT32 : BigInt(txCount);
        const ageBig = BigInt(walletAgeDays) > MAX_EUINT32 ? MAX_EUINT32 : BigInt(walletAgeDays);

        const enc = await encrypt.mutateAsync({
          values: [
            { value: txCountBig, type: "euint32" },
            { value: totalVolumeWei, type: "euint64" },
            { value: ageBig, type: "euint32" },
          ],
          contractAddress: cipher.address,
          userAddress: address,
        });

        setMessage("Submitting encrypted application...");
        const hash = await writeContractAsync({
          address: cipher.address,
          abi: cipher.abi,
          functionName: "applyForScore",
          args: [
            bytesToHex(enc.handles[0]!),
            bytesToHex(enc.handles[1]!),
            bytesToHex(enc.handles[2]!),
            bytesToHex(enc.inputProof),
            bytesToHex(enc.inputProof),
            bytesToHex(enc.inputProof),
          ],
          gas: 15_000_000n,
        });

        setMessage("Transaction sent. Waiting for confirmation...");
        await waitForReceipt(hash);
        setMessage("Score application confirmed! Your encrypted score is now on-chain.");
        setAwaitingScore(true);
        startPollingScore();
      } catch (e) {
        setMessage(`Application failed: ${formatError(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      hasContract,
      cipher,
      address,
      publicClient,
      encrypt,
      writeContractAsync,
      waitForReceipt,
      startPollingScore,
      MAX_EUINT64,
      MAX_EUINT32,
    ],
  );

  // ---------- Reveal Tier ----------
  const revealTier = useCallback(
    async (tier: number) => {
      if (!hasContract || !cipher?.address || !publicClient) return;
      setIsProcessing(true);
      setMessage("Revealing tier...");
      try {
        const hash = await writeContractAsync({
          address: cipher.address,
          abi: cipher.abi,
          functionName: "revealTier",
          args: [tier],
          gas: 1_000_000n,
        });
        await waitForReceipt(hash);
        setMessage("Tier revealed!");
        userTierResult.refetch();
      } catch (e) {
        setMessage(`Reveal failed: ${formatError(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [hasContract, cipher, publicClient, writeContractAsync, waitForReceipt, userTierResult],
  );

  // ---------- Borrow ----------
  const borrow = useCallback(
    async (amountEth: string) => {
      if (!hasContract || !cipher?.address || !publicClient) return;
      setIsProcessing(true);
      setMessage("Processing loan...");
      try {
        const hash = await writeContractAsync({
          address: cipher.address,
          abi: cipher.abi,
          functionName: "borrow",
          args: [parseEther(amountEth)],
          gas: 1_000_000n,
        });
        await waitForReceipt(hash);
        setMessage("Loan received!");
        loanResult.refetch();
        poolBalanceResult.refetch();
        totalAssetsResult.refetch();
        totalBorrowsResult.refetch();
        utilizationResult.refetch();
      } catch (e) {
        setMessage(`Borrow failed: ${formatError(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      hasContract,
      cipher,
      publicClient,
      writeContractAsync,
      waitForReceipt,
      loanResult,
      poolBalanceResult,
      totalAssetsResult,
      totalBorrowsResult,
      utilizationResult,
    ],
  );

  // ---------- Repay ----------
  const repayLoan = useCallback(
    async (amountEth: string) => {
      if (!hasContract || !cipher?.address || !publicClient) return;
      setIsProcessing(true);
      setMessage("Repaying loan...");
      try {
        const hash = await writeContractAsync({
          address: cipher.address,
          abi: cipher.abi,
          functionName: "repayLoan",
          value: parseEther(amountEth),
          gas: 1_000_000n,
        });
        await waitForReceipt(hash);
        setMessage("Repayment successful!");
        loanResult.refetch();
        repaymentDueResult.refetch();
        poolBalanceResult.refetch();
        totalAssetsResult.refetch();
        totalBorrowsResult.refetch();
        utilizationResult.refetch();
      } catch (e) {
        setMessage(`Repay failed: ${formatError(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      hasContract,
      cipher,
      publicClient,
      writeContractAsync,
      waitForReceipt,
      loanResult,
      repaymentDueResult,
      poolBalanceResult,
      totalAssetsResult,
      totalBorrowsResult,
      utilizationResult,
    ],
  );

  // ---------- Deposit ----------
  const depositLiquidity = useCallback(
    async (amountEth: string) => {
      if (!hasContract || !cipher?.address || !publicClient) return;
      setIsProcessing(true);
      setMessage("Depositing liquidity...");
      try {
        const hash = await writeContractAsync({
          address: cipher.address,
          abi: cipher.abi,
          functionName: "depositLiquidity",
          value: parseEther(amountEth),
          gas: 1_000_000n,
        });
        await waitForReceipt(hash);
        setMessage("Liquidity deposited!");
        poolBalanceResult.refetch();
        totalAssetsResult.refetch();
        userDepositValueResult.refetch();
        userDepositsResult.refetch();
      } catch (e) {
        setMessage(`Deposit failed: ${formatError(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      hasContract,
      cipher,
      publicClient,
      writeContractAsync,
      waitForReceipt,
      poolBalanceResult,
      totalAssetsResult,
      userDepositValueResult,
      userDepositsResult,
    ],
  );

  // ---------- Withdraw ----------
  const withdrawLiquidity = useCallback(
    async (amountEth: string) => {
      if (!hasContract || !cipher?.address || !publicClient) return;
      setIsProcessing(true);
      setMessage("Withdrawing liquidity...");
      try {
        const hash = await writeContractAsync({
          address: cipher.address,
          abi: cipher.abi,
          functionName: "withdrawLiquidity",
          args: [parseEther(amountEth)],
          gas: 1_000_000n,
        });
        await waitForReceipt(hash);
        setMessage("Liquidity withdrawn!");
        poolBalanceResult.refetch();
        totalAssetsResult.refetch();
        userDepositValueResult.refetch();
        userDepositsResult.refetch();
        totalBorrowsResult.refetch();
        utilizationResult.refetch();
      } catch (e) {
        setMessage(`Withdraw failed: ${formatError(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      hasContract,
      cipher,
      publicClient,
      writeContractAsync,
      waitForReceipt,
      poolBalanceResult,
      totalAssetsResult,
      userDepositValueResult,
      userDepositsResult,
      totalBorrowsResult,
      utilizationResult,
    ],
  );

  return {
    contractAddress: cipher?.address,
    hasContract,
    isConnected,
    address,

    scoreHandle,
    decryptedScore,
    isScoreDecrypted,

    tierHandle,
    decryptedTier,
    isTierDecrypted,
    userTier,
    tierLimit,
    defaultCount,

    loanInfo,
    loanActive: loanInfo.active,
    loanPrincipal: loanInfo.principal,
    loanRepaid: loanInfo.repaid,
    repaymentDue,

    poolBalance,
    totalAssets,
    totalBorrows,
    utilizationBps,
    userDepositValue,
    userDeposits,
    borrowFeeBps,
    interestBps,
    contractBalance,

    hasScore,

    isProcessing,
    isDecrypting,
    isAllowing,
    canDecrypt,
    awaitingScore,
    message,

    applyForScore,
    revealTier,
    borrow,
    repayLoan,
    depositLiquidity,
    withdrawLiquidity,
    requestDecryption,
    refresh: () => {
      scoreResult.refetch();
      tierResult.refetch();
      userTierResult.refetch();
      defaultCountResult.refetch();
      loanResult.refetch();
      repaymentDueResult.refetch();
      poolBalanceResult.refetch();
      totalAssetsResult.refetch();
      totalBorrowsResult.refetch();
      utilizationResult.refetch();
      userDepositValueResult.refetch();
      userDepositsResult.refetch();
      borrowFeeBpsResult.refetch();
      interestBpsResult.refetch();
    },
  };
};
