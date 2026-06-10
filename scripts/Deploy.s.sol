// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/LandNFT.sol";
import "../contracts/LandRental.sol";
import "../contracts/GameEconomy.sol";

/**
 * @title DeployCubeCraft - Deployment script for CubeCraft Tycoon contracts on Arc Testnet
 */
contract DeployCubeCraft is Script {
    // Arc Testnet addresses
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);

        string memory baseURI = vm.envOr("LAND_BASE_URI", string("https://api.cubecraft.game/land/metadata/"));

        console.log("Deploying CubeCraft Tycoon contracts...");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("Admin:", admin);
        console.log("USDC:", USDC);
        console.log("Chain ID:", block.chainid);

        // ======== Deploy LandNFT ========
        vm.startBroadcast(deployerPrivateKey);
        
        LandNFT landNFT = new LandNFT(
            "CubeCraft Land",   // name
            "CCLAND",           // symbol
            baseURI,            // baseTokenURI
            admin               // gameAdmin
        );
        console.log("LandNFT deployed at:", address(landNFT));

        // ======== Deploy LandRental ========
        // 5% fee (500 basis points)
        LandRental landRental = new LandRental(
            USDC,               // usdc
            address(landNFT),   // landNFT
            treasury,           // treasury
            admin,              // gameAdmin
            500                 // feeBasisPoints (5%)
        );
        console.log("LandRental deployed at:", address(landRental));

        // ======== Deploy GameEconomy ========
        // 10% revenue fee (1000 basis points)
        GameEconomy gameEconomy = new GameEconomy(
            USDC,                   // usdc
            address(landNFT),       // landNFT
            address(landRental),    // landRental
            treasury,               // treasury
            admin,                  // gameAdmin
            1000                    // revenueFeeBasisPoints (10%)
        );
        console.log("GameEconomy deployed at:", address(gameEconomy));

        vm.stopBroadcast();

        // ======== Output Summary ========
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("LandNFT:      ", address(landNFT));
        console.log("LandRental:   ", address(landRental));
        console.log("GameEconomy:  ", address(gameEconomy));
        console.log("USDC:         ", USDC);
        console.log("Treasury:     ", treasury);
        console.log("Admin:        ", admin);
        console.log("========================================");

        // Write addresses to JSON for frontend
        string memory json = string(
            abi.encodePacked(
                '{"chainId":5042002,',
                '"contracts":{',
                '"LandNFT":"', vm.toString(address(landNFT)), '",',
                '"LandRental":"', vm.toString(address(landRental)), '",',
                '"GameEconomy":"', vm.toString(address(gameEconomy)), '"',
                '},',
                '"usdc":"', vm.toString(USDC), '",',
                '"treasury":"', vm.toString(treasury), '"',
                '}'
            )
        );

        string memory path = string(abi.encodePacked(vm.projectRoot(), "/deployments/arc-testnet.json"));
        vm.writeFile(path, json);
        console.log("Deployment addresses written to:", path);
    }
}
