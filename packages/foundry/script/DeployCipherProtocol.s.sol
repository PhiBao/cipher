// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {CipherProtocol} from "../src/CipherProtocol.sol";

contract DeployCipherProtocol is Script {
    function run() external {
        vm.startBroadcast();

        CipherProtocol cipher = new CipherProtocol();
        console.log("CipherProtocol deployed at:", address(cipher));

        vm.stopBroadcast();
    }
}
