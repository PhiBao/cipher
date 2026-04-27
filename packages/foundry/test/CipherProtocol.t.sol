// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {CipherProtocol} from "../src/CipherProtocol.sol";
import {euint32, externalEuint32, externalEuint64} from "encrypted-types/EncryptedTypes.sol";

contract CipherProtocolTest is FhevmTest {
    CipherProtocol cipher;
    address cipherAddress;
    uint256 internal constant ALICE_PK = 0xA11CE;
    uint256 internal constant BOB_PK = 0xB0B;
    address alice;
    address bob;

    function setUp() public override {
        super.setUp();
        cipher = new CipherProtocol();
        cipherAddress = address(cipher);
        alice = vm.addr(ALICE_PK);
        bob = vm.addr(BOB_PK);
    }

    function test_applyForScoreAndDecrypt() public {
        uint32 txCount = 100;
        uint64 totalVolume = 5e18;
        uint32 walletAge = 365;

        (externalEuint32 encTxCount, bytes memory proofTx) = encryptUint32(txCount, alice, cipherAddress);
        (externalEuint64 encVolume, bytes memory proofVol) = encryptUint64(totalVolume, alice, cipherAddress);
        (externalEuint32 encAge, bytes memory proofAge) = encryptUint32(walletAge, alice, cipherAddress);

        vm.prank(alice);
        cipher.applyForScore(encTxCount, encVolume, encAge, proofTx, proofVol, proofAge);

        vm.prank(alice);
        euint32 encryptedScore = cipher.getEncryptedScore();
        bytes memory sig = signUserDecrypt(ALICE_PK, cipherAddress);
        uint256 clearScore = userDecrypt(euint32.unwrap(encryptedScore), alice, cipherAddress, sig);

        assertEq(clearScore, 850);
    }

    function test_tierComputation() public {
        uint32 txCount = 10;
        uint64 totalVolume = 1e17;
        uint32 walletAge = 30;

        (externalEuint32 encTxCount, bytes memory proofTx) = encryptUint32(txCount, alice, cipherAddress);
        (externalEuint64 encVolume, bytes memory proofVol) = encryptUint64(totalVolume, alice, cipherAddress);
        (externalEuint32 encAge, bytes memory proofAge) = encryptUint32(walletAge, alice, cipherAddress);

        vm.prank(alice);
        cipher.applyForScore(encTxCount, encVolume, encAge, proofTx, proofVol, proofAge);

        vm.prank(alice);
        euint32 encryptedTier = cipher.getEncryptedTier();
        bytes memory sig = signUserDecrypt(ALICE_PK, cipherAddress);
        uint256 clearTier = userDecrypt(euint32.unwrap(encryptedTier), alice, cipherAddress, sig);

        assertEq(clearTier, 3);
    }

    function test_borrowFlowWithFee() public {
        // Setup score for alice
        uint32 txCount = 200;
        uint64 totalVolume = 10e18;
        uint32 walletAge = 500;

        (externalEuint32 encTxCount, bytes memory proofTx) = encryptUint32(txCount, alice, cipherAddress);
        (externalEuint64 encVolume, bytes memory proofVol) = encryptUint64(totalVolume, alice, cipherAddress);
        (externalEuint32 encAge, bytes memory proofAge) = encryptUint32(walletAge, alice, cipherAddress);

        vm.prank(alice);
        cipher.applyForScore(encTxCount, encVolume, encAge, proofTx, proofVol, proofAge);

        // Fund pool with 20 ETH from bob
        vm.deal(bob, 20 ether);
        vm.prank(bob);
        cipher.depositLiquidity{value: 20 ether}();

        // Reveal tier
        vm.prank(alice);
        cipher.revealTier(1); // Tier A

        uint256 aliceBefore = alice.balance;

        // Borrow 5 ETH
        vm.prank(alice);
        cipher.borrow(5 ether);

        uint256 fee = (5 ether * cipher.BORROW_FEE_BPS()) / cipher.BPS_DENOMINATOR();
        assertEq(alice.balance - aliceBefore, 5 ether - fee);

        CipherProtocol.Loan memory loan = cipher.getLoanInfo(alice);
        assertTrue(loan.active);
        assertEq(loan.principal, 5 ether);
        assertEq(cipher.totalBorrows(), 5 ether);
    }

    function test_repayWithInterest() public {
        test_borrowFlowWithFee();

        uint256 interest = (5 ether * cipher.INTEREST_BPS()) / cipher.BPS_DENOMINATOR();
        uint256 totalDue = 5 ether + interest;

        vm.deal(alice, totalDue);
        vm.prank(alice);
        cipher.repayLoan{value: totalDue}();

        CipherProtocol.Loan memory loan = cipher.getLoanInfo(alice);
        assertFalse(loan.active);
        assertEq(cipher.totalBorrows(), 0);
    }

    function test_liquidationRecordsDefault() public {
        test_borrowFlowWithFee();

        assertEq(cipher.defaultCount(alice), 0);

        vm.warp(block.timestamp + 31 days);

        cipher.liquidate(alice);

        assertEq(cipher.defaultCount(alice), 1);
        assertEq(cipher.totalBorrows(), 0);

        CipherProtocol.Loan memory loan = cipher.getLoanInfo(alice);
        assertFalse(loan.active);
    }

    function test_depositorYieldFromFees() public {
        // Bob deposits 20 ETH
        vm.deal(bob, 20 ether);
        vm.prank(bob);
        cipher.depositLiquidity{value: 20 ether}();

        // Alice gets score, reveals tier, borrows
        uint32 txCount = 200;
        uint64 totalVolume = 10e18;
        uint32 walletAge = 500;

        (externalEuint32 encTxCount, bytes memory proofTx) = encryptUint32(txCount, alice, cipherAddress);
        (externalEuint64 encVolume, bytes memory proofVol) = encryptUint64(totalVolume, alice, cipherAddress);
        (externalEuint32 encAge, bytes memory proofAge) = encryptUint32(walletAge, alice, cipherAddress);

        vm.prank(alice);
        cipher.applyForScore(encTxCount, encVolume, encAge, proofTx, proofVol, proofAge);

        vm.prank(alice);
        cipher.revealTier(1);

        vm.prank(alice);
        cipher.borrow(5 ether);

        // Bob's position should have grown by the borrow fee
        uint256 fee = (5 ether * cipher.BORROW_FEE_BPS()) / cipher.BPS_DENOMINATOR();
        uint256 bobValue = cipher.getUserDepositValue(bob);
        assertEq(bobValue, 20 ether + fee);

        // Alice repays principal + interest so pool has cash for Bob to withdraw
        uint256 interest = (5 ether * cipher.INTEREST_BPS()) / cipher.BPS_DENOMINATOR();
        vm.deal(alice, 5 ether + interest);
        vm.prank(alice);
        cipher.repayLoan{value: 5 ether + interest}();

        // Bob can now withdraw his full position
        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        cipher.withdrawLiquidity(bobValue);
        assertEq(bob.balance - bobBefore, bobValue);
    }

    function test_withdrawPartial() public {
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        cipher.depositLiquidity{value: 10 ether}();

        uint256 bobValue = cipher.getUserDepositValue(bob);
        assertEq(bobValue, 10 ether);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        cipher.withdrawLiquidity(5 ether);
        assertEq(bob.balance - bobBefore, 5 ether);

        assertEq(cipher.deposits(bob), 5 ether);
        assertEq(cipher.totalDeposits(), 5 ether);
    }
}
