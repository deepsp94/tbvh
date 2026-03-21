// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "../src/TBVHEscrow.sol";
import "../src/MockUSDC.sol";

contract TBVHEscrowTest is Test {
    TBVHEscrow escrow;
    MockUSDC usdc;

    uint256 signerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address signer;

    address buyer = address(0xB0B);
    address seller = address(0x5E11);

    bytes32 instanceId = keccak256("test-instance-id");
    uint256 depositAmount = 100 * 1e6; // 100 USDC

    function setUp() public {
        signer = vm.addr(signerKey);
        usdc = new MockUSDC();
        escrow = new TBVHEscrow(address(usdc), signer);

        // Fund buyer
        usdc.mint(buyer, 1000 * 1e6);
    }

    function _domainSeparator() internal view returns (bytes32) {
        bytes32 TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        return keccak256(abi.encode(
            TYPE_HASH,
            keccak256(bytes("TBVH")),
            keccak256(bytes("1")),
            block.chainid,
            address(escrow)
        ));
    }

    function _signOutcome(
        bytes32 _instanceId,
        address _buyer,
        address _seller,
        string memory _outcome,
        uint256 _finalPrice,
        uint256 _timestamp
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            escrow.OUTCOME_TYPEHASH(),
            _instanceId,
            _buyer,
            _seller,
            keccak256(bytes(_outcome)),
            _finalPrice,
            _timestamp
        ));

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // --- Deposit ---

    function test_deposit() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        (address depBuyer, uint256 depAmount, , bool settled) = escrow.deposits(instanceId);
        assertEq(depBuyer, buyer);
        assertEq(depAmount, depositAmount);
        assertFalse(settled);
        assertEq(usdc.balanceOf(address(escrow)), depositAmount);
    }

    function test_deposit_revert_double() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount * 2);
        escrow.deposit(instanceId, depositAmount);
        vm.expectRevert("Already deposited");
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();
    }

    function test_deposit_revert_zero() public {
        vm.startPrank(buyer);
        vm.expectRevert("Amount must be positive");
        escrow.deposit(instanceId, 0);
        vm.stopPrank();
    }

    // --- Release ---

    function test_release_accept() public {
        // Deposit
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 finalPrice = 75 * 1e6;
        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "ACCEPT", finalPrice, timestamp);

        uint256 sellerBefore = usdc.balanceOf(seller);
        uint256 buyerBefore = usdc.balanceOf(buyer);

        escrow.release(instanceId, seller, "ACCEPT", finalPrice, timestamp, sig);

        assertEq(usdc.balanceOf(seller), sellerBefore + finalPrice);
        assertEq(usdc.balanceOf(buyer), buyerBefore + (depositAmount - finalPrice));

        (, , , bool settled) = escrow.deposits(instanceId);
        assertTrue(settled);
    }

    function test_release_full_amount() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "ACCEPT", depositAmount, timestamp);

        escrow.release(instanceId, seller, "ACCEPT", depositAmount, timestamp, sig);

        assertEq(usdc.balanceOf(seller), depositAmount);
    }

    function test_release_zero_price() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "ACCEPT", 0, timestamp);

        uint256 buyerBefore = usdc.balanceOf(buyer);
        escrow.release(instanceId, seller, "ACCEPT", 0, timestamp, sig);

        assertEq(usdc.balanceOf(buyer), buyerBefore + depositAmount);
        assertEq(usdc.balanceOf(seller), 0);
    }

    function test_release_revert_reject_outcome() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "REJECT", 0, timestamp);

        vm.expectRevert("Outcome must be ACCEPT");
        escrow.release(instanceId, seller, "REJECT", 0, timestamp, sig);
    }

    function test_release_revert_wrong_signer() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        // Sign with wrong key
        uint256 wrongKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        bytes32 structHash = keccak256(abi.encode(
            escrow.OUTCOME_TYPEHASH(),
            instanceId, buyer, seller,
            keccak256(bytes("ACCEPT")),
            50 * 1e6,
            block.timestamp
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01", _domainSeparator(), structHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert("Invalid signer");
        escrow.release(instanceId, seller, "ACCEPT", 50 * 1e6, block.timestamp, sig);
    }

    function test_release_revert_price_exceeds_deposit() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        uint256 overPrice = depositAmount + 1;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "ACCEPT", overPrice, timestamp);

        vm.expectRevert("Price exceeds deposit");
        escrow.release(instanceId, seller, "ACCEPT", overPrice, timestamp, sig);
    }

    function test_release_revert_already_settled() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "ACCEPT", 50 * 1e6, timestamp);

        escrow.release(instanceId, seller, "ACCEPT", 50 * 1e6, timestamp, sig);

        vm.expectRevert("Already settled");
        escrow.release(instanceId, seller, "ACCEPT", 50 * 1e6, timestamp, sig);
    }

    // --- Refund with signature ---

    function test_refundWithSignature() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "REJECT", 0, timestamp);

        uint256 buyerBefore = usdc.balanceOf(buyer);
        escrow.refundWithSignature(instanceId, seller, "REJECT", 0, timestamp, sig);

        assertEq(usdc.balanceOf(buyer), buyerBefore + depositAmount);
        (, , , bool settled) = escrow.deposits(instanceId);
        assertTrue(settled);
    }

    function test_refundWithSignature_revert_accept() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        uint256 timestamp = block.timestamp;
        bytes memory sig = _signOutcome(instanceId, buyer, seller, "ACCEPT", 50 * 1e6, timestamp);

        vm.expectRevert("Outcome must be REJECT");
        escrow.refundWithSignature(instanceId, seller, "ACCEPT", 50 * 1e6, timestamp, sig);
    }

    // --- Timeout refund ---

    function test_refund_timeout() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        // Warp past timeout
        vm.warp(block.timestamp + 7 days + 1);

        uint256 buyerBefore = usdc.balanceOf(buyer);
        vm.prank(buyer);
        escrow.refund(instanceId);

        assertEq(usdc.balanceOf(buyer), buyerBefore + depositAmount);
    }

    function test_refund_revert_before_timeout() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert("Timeout not reached");
        escrow.refund(instanceId);
    }

    function test_refund_revert_not_buyer() public {
        vm.startPrank(buyer);
        usdc.approve(address(escrow), depositAmount);
        escrow.deposit(instanceId, depositAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(seller);
        vm.expectRevert("Only buyer can refund");
        escrow.refund(instanceId);
    }

    // --- Admin ---

    function test_setTeeSigner() public {
        address newSigner = address(0xDEAD);
        escrow.setTeeSigner(newSigner);
        assertEq(escrow.teeSigner(), newSigner);
    }

    function test_setTeeSigner_revert_nonOwner() public {
        vm.prank(buyer);
        vm.expectRevert();
        escrow.setTeeSigner(address(0xDEAD));
    }
}
