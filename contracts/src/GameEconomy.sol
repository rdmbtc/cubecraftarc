// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GameEconomy - Business building and economic simulation on Arc
contract GameEconomy is Ownable, ReentrancyGuard {
    IERC20 public usdc;
    address public treasury;

    enum BusinessType { Shop, Farm, Mine, Factory, Marketplace, Tower }

    struct Business {
        uint256 parcelId;
        BusinessType businessType;
        uint8 level;
        uint256 revenuePerHour;
        uint256 lastClaimTime;
        uint256 totalEarned;
        bool active;
    }

    uint256 public nextBusinessId = 1;
    mapping(uint256 => Business) public businesses;
    mapping(address => uint256[]) public playerBusinesses;
    mapping(BusinessType => uint256) public buildCosts;
    mapping(BusinessType => uint256) public baseRevenue;

    event BusinessBuilt(uint256 indexed businessId, address indexed owner, BusinessType btype, uint256 parcelId);
    event RevenueClaimed(uint256 indexed businessId, address indexed owner, uint256 amount);
    event BusinessUpgraded(uint256 indexed businessId, uint8 newLevel);

    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = _treasury;

        buildCosts[BusinessType.Shop] = 10 * 1e6;
        buildCosts[BusinessType.Farm] = 5 * 1e6;
        buildCosts[BusinessType.Mine] = 15 * 1e6;
        buildCosts[BusinessType.Factory] = 25 * 1e6;
        buildCosts[BusinessType.Marketplace] = 50 * 1e6;
        buildCosts[BusinessType.Tower] = 100 * 1e6;

        baseRevenue[BusinessType.Shop] = 0.5 * 1e6;
        baseRevenue[BusinessType.Farm] = 0.3 * 1e6;
        baseRevenue[BusinessType.Mine] = 0.8 * 1e6;
        baseRevenue[BusinessType.Factory] = 1.2 * 1e6;
        baseRevenue[BusinessType.Marketplace] = 2.0 * 1e6;
        baseRevenue[BusinessType.Tower] = 3.0 * 1e6;
    }

    function buildBusiness(uint256 parcelId, BusinessType btype) external nonReentrant {
        uint256 cost = buildCosts[btype];
        require(cost > 0, "Invalid business type");
        require(usdc.transferFrom(msg.sender, treasury, cost), "USDC payment failed");

        uint256 businessId = nextBusinessId++;
        businesses[businessId] = Business({
            parcelId: parcelId,
            businessType: btype,
            level: 1,
            revenuePerHour: baseRevenue[btype],
            lastClaimTime: block.timestamp,
            totalEarned: 0,
            active: true
        });

        playerBusinesses[msg.sender].push(businessId);
        emit BusinessBuilt(businessId, msg.sender, btype, parcelId);
    }

    function claimRevenue(uint256 businessId) external nonReentrant {
        Business storage biz = businesses[businessId];
        require(biz.active, "Business not active");

        uint256 elapsed = block.timestamp - biz.lastClaimTime;
        uint256 revenue = (biz.revenuePerHour * elapsed) / 1 hours;

        if (revenue > 0) {
            require(usdc.transfer(msg.sender, revenue), "Revenue transfer failed");
            biz.lastClaimTime = block.timestamp;
            biz.totalEarned += revenue;
            emit RevenueClaimed(businessId, msg.sender, revenue);
        }
    }

    function upgradeBusiness(uint256 businessId) external nonReentrant {
        Business storage biz = businesses[businessId];
        require(biz.level < 10, "Max level");

        uint256 upgradeCost = buildCosts[biz.businessType] * uint256(biz.level);
        require(usdc.transferFrom(msg.sender, treasury, upgradeCost), "USDC payment failed");

        biz.level++;
        biz.revenuePerHour = baseRevenue[biz.businessType] * uint256(biz.level);
        emit BusinessUpgraded(businessId, biz.level);
    }

    function getPlayerBusinesses(address player) external view returns (uint256[] memory) {
        return playerBusinesses[player];
    }

    function getPendingRevenue(uint256 businessId) external view returns (uint256) {
        Business storage biz = businesses[businessId];
        if (!biz.active) return 0;
        uint256 elapsed = block.timestamp - biz.lastClaimTime;
        return (biz.revenuePerHour * elapsed) / 1 hours;
    }
}
