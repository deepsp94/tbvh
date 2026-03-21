// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/TBVHEscrow.sol";

contract Deploy is Script {
    function run() external {
        address teeSigner = vm.envAddress("TEE_SIGNER");

        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        TBVHEscrow escrow = new TBVHEscrow(address(usdc), teeSigner);

        vm.stopBroadcast();

        console.log("MockUSDC deployed at:", address(usdc));
        console.log("TBVHEscrow deployed at:", address(escrow));
        console.log("TEE Signer:", teeSigner);
    }
}
