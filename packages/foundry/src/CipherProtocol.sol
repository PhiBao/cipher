// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, euint64, ebool, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CipherProtocol
/// @notice Confidential on-chain credit scoring and micro-lending powered by FHE.
/// @dev Users submit encrypted financial metrics; the protocol computes a credit score
///      entirely on encrypted data. Based on the score tier, users access tiered loans.
///      In production, tier revelation would be verified via ZK-proof or gateway callback.
contract CipherProtocol is ZamaEthereumConfig {
    // ============ Constants ============

    uint32 public constant TIER_A_THRESHOLD = 750;
    uint32 public constant TIER_B_THRESHOLD = 650;
    uint32 public constant TIER_C_THRESHOLD = 550;
    uint32 public constant TIER_D_THRESHOLD = 300;

    uint256 public constant TIER_A_LIMIT = 10 ether;
    uint256 public constant TIER_B_LIMIT = 5 ether;
    uint256 public constant TIER_C_LIMIT = 2 ether;
    uint256 public constant TIER_D_LIMIT = 0.5 ether;

    /// @notice Loans become eligible for liquidation after this duration.
    uint256 public constant LOAN_DURATION = 30 days;

    // ============ State ============

    /// @notice Encrypted credit score per user (range 300-850)
    mapping(address => euint32) public encryptedScores;

    /// @notice Encrypted tier per user (1=A, 2=B, 3=C, 4=D)
    mapping(address => euint32) public encryptedTiers;

    /// @notice User-revealed tier (1=A, 2=B, 3=C, 4=D).
    /// In production this would be set via ZK verification or gateway decryption callback.
    mapping(address => uint8) public userTier;

    /// @notice Number of recorded defaults per user (on-chain verifiable)
    mapping(address => uint32) public defaultCount;

    struct Loan {
        uint256 principal;
        uint256 repaid;
        bool active;
        uint256 startTime;
    }

    mapping(address => Loan) public loans;

    // ============ Events ============

    event ScoreApplied(address indexed user, bytes32 scoreHandle);
    event TierRevealed(address indexed user, uint8 tier);
    event LoanTaken(address indexed user, uint256 amount);
    event LoanRepaid(address indexed user, uint256 amount);
    event LiquidityDeposited(address indexed lender, uint256 amount);
    event DefaultRecorded(address indexed user, uint32 newDefaultCount);

    // ============ Credit Score Engine ============

    /// @notice Apply for a confidential credit score.
    /// @param extTxCount Encrypted number of on-chain transactions
    /// @param extTotalVolume Encrypted total transaction volume (wei)
    /// @param extWalletAgeDays Encrypted wallet age in days
    /// @param proofTx Zama input proof for txCount
    /// @param proofVol Zama input proof for totalVolume
    /// @param proofAge Zama input proof for walletAgeDays
    function applyForScore(
        externalEuint32 extTxCount,
        externalEuint64 extTotalVolume,
        externalEuint32 extWalletAgeDays,
        bytes calldata proofTx,
        bytes calldata proofVol,
        bytes calldata proofAge
    ) external {
        euint32 txCount = FHE.fromExternal(extTxCount, proofTx);
        euint64 totalVolume = FHE.fromExternal(extTotalVolume, proofVol);
        euint32 walletAgeDays = FHE.fromExternal(extWalletAgeDays, proofAge);

        // Defaults are read on-chain — no user input needed
        euint32 defaults = FHE.asEuint32(defaultCount[msg.sender]);

        // --- Encrypted weighted scoring formula ---
        // positive = txCount * 5 + (totalVolume / 1e15) * 2 + walletAgeDays * 1
        // negative = defaults * 100
        // raw = positive - negative (floored at 0)
        // score = 300 + raw (capped at 850)

        euint32 weightedTxCount = FHE.mul(txCount, FHE.asEuint32(5));

        // Scale volume down by 1e15 (so 1 ETH = 1e18 wei -> 1000 points)
        euint64 volumeDiv = FHE.div(totalVolume, uint64(1e15));
        euint32 volumeScore = FHE.mul(FHE.asEuint32(volumeDiv), FHE.asEuint32(2));

        euint32 weightedAge = FHE.mul(walletAgeDays, FHE.asEuint32(1));
        euint32 weightedDefaults = FHE.mul(defaults, FHE.asEuint32(100));

        euint32 positiveScore = FHE.add(FHE.add(weightedTxCount, volumeScore), weightedAge);

        // Avoid underflow: if negative > positive, raw = 0
        ebool negativeLarger = FHE.gt(weightedDefaults, positiveScore);
        euint32 rawScore = FHE.select(negativeLarger, FHE.asEuint32(0), FHE.sub(positiveScore, weightedDefaults));

        euint32 score = FHE.add(FHE.asEuint32(300), rawScore);

        // Cap at 850
        ebool aboveMax = FHE.gt(score, FHE.asEuint32(850));
        score = FHE.select(aboveMax, FHE.asEuint32(850), score);

        encryptedScores[msg.sender] = score;

        // Compute and store encrypted tier
        euint32 tier = _computeEncryptedTier(score);
        encryptedTiers[msg.sender] = tier;

        // ACL permissions
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);
        FHE.allowThis(tier);
        FHE.allow(tier, msg.sender);

        emit ScoreApplied(msg.sender, euint32.unwrap(score));
    }

    /// @notice Get the caller's encrypted credit score handle.
    function getEncryptedScore() external view returns (euint32) {
        return encryptedScores[msg.sender];
    }

    /// @notice Compute encrypted tier from encrypted score (1=A, 2=B, 3=C, 4=D).
    function _computeEncryptedTier(euint32 score) internal returns (euint32) {
        ebool isA = FHE.ge(score, FHE.asEuint32(TIER_A_THRESHOLD));
        ebool isB = FHE.ge(score, FHE.asEuint32(TIER_B_THRESHOLD));
        ebool isC = FHE.ge(score, FHE.asEuint32(TIER_C_THRESHOLD));

        // Default to tier D (4)
        euint32 tier = FHE.asEuint32(4);

        // Tier C: score >= 550 && score < 650
        ebool isTierC = FHE.and(isC, FHE.lt(score, FHE.asEuint32(TIER_B_THRESHOLD)));
        tier = FHE.select(isTierC, FHE.asEuint32(3), tier);

        // Tier B: score >= 650 && score < 750
        ebool isTierB = FHE.and(isB, FHE.lt(score, FHE.asEuint32(TIER_A_THRESHOLD)));
        tier = FHE.select(isTierB, FHE.asEuint32(2), tier);

        // Tier A: score >= 750
        tier = FHE.select(isA, FHE.asEuint32(1), tier);

        return tier;
    }

    /// @notice Get the caller's encrypted tier handle.
    function getEncryptedTier() external view returns (euint32) {
        return encryptedTiers[msg.sender];
    }

    /// @notice Get the maximum loan amount for a given tier.
    function getTierLimit(uint8 tier) external pure returns (uint256) {
        if (tier == 1) return TIER_A_LIMIT;
        if (tier == 2) return TIER_B_LIMIT;
        if (tier == 3) return TIER_C_LIMIT;
        if (tier == 4) return TIER_D_LIMIT;
        return 0;
    }

    /// @notice Get recorded defaults for a user.
    function getDefaultCount(address user) external view returns (uint32) {
        return defaultCount[user];
    }

    // ============ Tier Revelation (Production: ZK / Gateway) ============

    /// @notice Reveal the user's tier.
    /// @dev In a production deployment, this would be replaced by a ZK-proof verification
    ///      or a gateway decryption callback that proves the tier matches the encrypted score.
    function revealTier(uint8 tier) external {
        require(tier >= 1 && tier <= 4, "Invalid tier");
        require(FHE.isAllowed(encryptedScores[msg.sender], msg.sender), "No score found");
        userTier[msg.sender] = tier;
        emit TierRevealed(msg.sender, tier);
    }

    // ============ Lending Pool ============

    /// @notice Deposit ETH into the lending pool.
    function depositLiquidity() external payable {
        require(msg.value > 0, "Must deposit ETH");
        emit LiquidityDeposited(msg.sender, msg.value);
    }

    /// @notice Borrow ETH up to the tier limit.
    function borrow(uint256 amount) external {
        uint8 tier = userTier[msg.sender];
        require(tier > 0, "Tier not revealed");

        uint256 limit;
        if (tier == 1) limit = TIER_A_LIMIT;
        else if (tier == 2) limit = TIER_B_LIMIT;
        else if (tier == 3) limit = TIER_C_LIMIT;
        else limit = TIER_D_LIMIT;

        require(amount <= limit, "Exceeds tier limit");
        require(!loans[msg.sender].active, "Active loan exists");
        require(address(this).balance >= amount, "Insufficient liquidity");

        loans[msg.sender] = Loan({principal: amount, repaid: 0, active: true, startTime: block.timestamp});

        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit LoanTaken(msg.sender, amount);
    }

    /// @notice Repay an active loan.
    function repayLoan() external payable {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active loan");
        require(msg.value > 0, "Must repay something");

        uint256 newRepaid = loan.repaid + msg.value;
        // Cap repayment at 2x principal (100% interest ceiling for demo)
        require(newRepaid <= loan.principal * 2, "Overpayment");

        loan.repaid = newRepaid;
        if (loan.repaid >= loan.principal) {
            loan.active = false;
        }

        emit LoanRepaid(msg.sender, msg.value);
    }

    /// @notice Liquidate an overdue loan and record a default.
    /// @dev Anyone can call this after LOAN_DURATION has passed.
    function liquidate(address borrower) external {
        Loan storage loan = loans[borrower];
        require(loan.active, "No active loan");
        require(block.timestamp > loan.startTime + LOAN_DURATION, "Loan not overdue");

        loan.active = false;
        defaultCount[borrower]++;

        emit DefaultRecorded(borrower, defaultCount[borrower]);
    }

    /// @notice Get loan details for a user.
    function getLoanInfo(address user) external view returns (Loan memory) {
        return loans[user];
    }

    /// @notice Get total ETH available in the pool.
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        emit LiquidityDeposited(msg.sender, msg.value);
    }
}
