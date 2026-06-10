// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LandNFT.sol";
import "../src/LandRental.sol";
import "../src/GameEconomy.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envOr("TREASURY_ADDRESS", msg.sender);

        // Arc Testnet USDC address
        address usdcAddress = 0x3600000000000000000000000000000000000000;

        vm.startBroadcast(deployerPrivateKey);

        LandNFT landNFT = new LandNFT();
        console.log("LandNFT deployed at:", address(landNFT));

        LandRental landRental = new LandRental(address(landNFT), usdcAddress, treasury);
        console.log("LandRental deployed at:", address(landRental));

        GameEconomy gameEconomy = new GameEconomy(usdcAddress, treasury);
        console.log("GameEconomy deployed at:", address(gameEconomy));

        vm.stopBroadcast();
    }
}
