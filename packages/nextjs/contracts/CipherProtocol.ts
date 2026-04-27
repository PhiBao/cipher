/**
 * CipherProtocol deployment — Sepolia
 *
 * Contract: 0x8FFb89F8363f395F96Bd266Cac6bA46ECF3FA9AC
 * Verified: https://sepolia.etherscan.io/address/0x8FFb89F8363f395F96Bd266Cac6bA46ECF3FA9AC
 */
import type { ContractDeployment } from "~~/utils/contract";

const REMOTE = {
  11155111: {
    address: "0x8FFb89F8363f395F96Bd266Cac6bA46ECF3FA9AC",
    abi: [
      {
        type: "receive",
        stateMutability: "payable",
      },
      {
        type: "function",
        name: "LOAN_DURATION",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_A_LIMIT",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_A_THRESHOLD",
        inputs: [],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_B_LIMIT",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_B_THRESHOLD",
        inputs: [],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_C_LIMIT",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_C_THRESHOLD",
        inputs: [],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_D_LIMIT",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "TIER_D_THRESHOLD",
        inputs: [],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "applyForScore",
        inputs: [
          { name: "extTxCount", type: "bytes32", internalType: "externalEuint32" },
          { name: "extTotalVolume", type: "bytes32", internalType: "externalEuint64" },
          { name: "extWalletAgeDays", type: "bytes32", internalType: "externalEuint32" },
          { name: "proofTx", type: "bytes", internalType: "bytes" },
          { name: "proofVol", type: "bytes", internalType: "bytes" },
          { name: "proofAge", type: "bytes", internalType: "bytes" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
      },
      {
        type: "function",
        name: "borrow",
        inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
      },
      {
        type: "function",
        name: "confidentialProtocolId",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "defaultCount",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "depositLiquidity",
        inputs: [],
        outputs: [],
        stateMutability: "payable",
      },
      {
        type: "function",
        name: "encryptedScores",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "encryptedTiers",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "getDefaultCount",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "getEncryptedScore",
        inputs: [],
        outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "getEncryptedTier",
        inputs: [],
        outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "getLoanInfo",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [
          {
            name: "",
            type: "tuple",
            internalType: "struct CipherProtocol.Loan",
            components: [
              { name: "principal", type: "uint256", internalType: "uint256" },
              { name: "repaid", type: "uint256", internalType: "uint256" },
              { name: "active", type: "bool", internalType: "bool" },
              { name: "startTime", type: "uint256", internalType: "uint256" },
            ],
          },
        ],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "getPoolBalance",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "getTierLimit",
        inputs: [{ name: "tier", type: "uint8", internalType: "uint8" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "pure",
      },
      {
        type: "function",
        name: "liquidate",
        inputs: [{ name: "borrower", type: "address", internalType: "address" }],
        outputs: [],
        stateMutability: "nonpayable",
      },
      {
        type: "function",
        name: "loans",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [
          { name: "principal", type: "uint256", internalType: "uint256" },
          { name: "repaid", type: "uint256", internalType: "uint256" },
          { name: "active", type: "bool", internalType: "bool" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "view",
      },
      {
        type: "function",
        name: "repayLoan",
        inputs: [],
        outputs: [],
        stateMutability: "payable",
      },
      {
        type: "function",
        name: "revealTier",
        inputs: [{ name: "tier", type: "uint8", internalType: "uint8" }],
        outputs: [],
        stateMutability: "nonpayable",
      },
      {
        type: "function",
        name: "userTier",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
        stateMutability: "view",
      },
      {
        type: "event",
        name: "DefaultRecorded",
        inputs: [
          { name: "user", type: "address", indexed: true, internalType: "address" },
          { name: "newDefaultCount", type: "uint32", indexed: false, internalType: "uint32" },
        ],
        anonymous: false,
      },
      {
        type: "event",
        name: "LiquidityDeposited",
        inputs: [
          { name: "lender", type: "address", indexed: true, internalType: "address" },
          { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
      },
      {
        type: "event",
        name: "LoanRepaid",
        inputs: [
          { name: "user", type: "address", indexed: true, internalType: "address" },
          { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
      },
      {
        type: "event",
        name: "LoanTaken",
        inputs: [
          { name: "user", type: "address", indexed: true, internalType: "address" },
          { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
      },
      {
        type: "event",
        name: "ScoreApplied",
        inputs: [
          { name: "user", type: "address", indexed: true, internalType: "address" },
          { name: "scoreHandle", type: "bytes32", indexed: false, internalType: "bytes32" },
        ],
        anonymous: false,
      },
      {
        type: "event",
        name: "TierRevealed",
        inputs: [
          { name: "user", type: "address", indexed: true, internalType: "address" },
          { name: "tier", type: "uint8", indexed: false, internalType: "uint8" },
        ],
        anonymous: false,
      },
      {
        type: "error",
        name: "SenderNotAllowedToUseHandle",
        inputs: [
          { name: "handle", type: "bytes32", internalType: "bytes32" },
          { name: "sender", type: "address", internalType: "address" },
        ],
      },
      {
        type: "error",
        name: "ZamaProtocolUnsupported",
        inputs: [],
      },
    ],
    deployedOnBlock: 10742337,
  },
} as const;

export const CipherProtocol = {
  ...REMOTE,
} as const satisfies Partial<Record<number, ContractDeployment>>;
