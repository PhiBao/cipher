// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {CipherProtocol} from "../src/CipherProtocol.sol";
import {euint32, euint64, externalEuint32, externalEuint64} from "encrypted-types/EncryptedTypes.sol";

contract CipherProtocolTest is FhevmTest {
    CipherProtocol cipher;
    address cipherAddress;
    uint256 internal constant ALICE_PK = 0xA11CE;
    address alice;

    function setUp() public override {
        super.setUp();
        cipher = new CipherProtocol();
        cipherAddress = address(cipher);
        alice = vm.addr(ALICE_PK);
    }

    function test_applyForScoreAndDecrypt() public {
        uint32 txCount = 100;
        uint64 totalVolume = 5e18; // 5 ETH
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

        // Expected: 300 + (100*5 + 5000*2 + 365*1 - 0) = 300 + 10865 = 11165 -> capped at 850
        assertEq(clearScore, 850);
    }

    function test_tierComputation() public {
        uint32 txCount = 10;
        uint64 totalVolume = 1e17; // 0.1 ETH
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

        // Expected: 300 + (50 + 200 + 30) = 580 -> Tier C (3)
        assertEq(clearTier, 3);
    }

    function test_borrowFlow() public {
        // Setup score for alice
        uint32 txCount = 200;
        uint64 totalVolume = 10e18;
        uint32 walletAge = 500;

        (externalEuint32 encTxCount, bytes memory proofTx) = encryptUint32(txCount, alice, cipherAddress);
        (externalEuint64 encVolume, bytes memory proofVol) = encryptUint64(totalVolume, alice, cipherAddress);
        (externalEuint32 encAge, bytes memory proofAge) = encryptUint32(walletAge, alice, cipherAddress);

        vm.prank(alice);
        cipher.applyForScore(encTxCount, encVolume, encAge, proofTx, proofVol, proofAge);

        // Fund pool
        cipher.depositLiquidity{value: 20 ether}();

        // Reveal tier
        vm.prank(alice);
        cipher.revealTier(1); // Tier A

        // Borrow
        vm.prank(alice);
        cipher.borrow(5 ether);

        CipherProtocol.Loan memory loan = cipher.getLoanInfo(alice);
        assertTrue(loan.active);
        assertEq(loan.principal, 5 ether);
    }

    function test_liquidationRecordsDefault() public {
        // Setup score and borrow
        uint32 txCount = 200;
        uint64 totalVolume = 10e18;
        uint32 walletAge = 500;

        (externalEuint32 encTxCount, bytes memory proofTx) = encryptUint32(txCount, alice, cipherAddress);
        (externalEuint64 encVolume, bytes memory proofVol) = encryptUint64(totalVolume, alice, cipherAddress);
        (externalEuint32 encAge, bytes memory proofAge) = encryptUint32(walletAge, alice, cipherAddress);

        vm.prank(alice);
        cipher.applyForScore(encTxCount, encVolume, encAge, proofTx, proofVol, proofAge);

        cipher.depositLiquidity{value: 20 ether}();

        vm.prank(alice);
        cipher.revealTier(1); // Tier A

        vm.prank(alice);
        cipher.borrow(5 ether);

        assertEq(cipher.defaultCount(alice), 0);

        // Warp past loan duration
        vm.warp(block.timestamp + 31 days);

        // Anyone can liquidate
        cipher.liquidate(alice);

        assertEq(cipher.defaultCount(alice), 1);
        CipherProtocol.Loan memory loan = cipher.getLoanInfo(alice);
        assertFalse(loan.active);
    }
}
