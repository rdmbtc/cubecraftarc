// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";
import "./LandNFT.sol";
import "./LandRental.sol";

/**
 * @title GameEconomy - Business building and economic simulation for CubeCraft Tycoon
 * @notice Players build businesses on owned/rented land, generate USDC revenue, and upgrade
 */
contract GameEconomy {
    // ============ State ============

    IERC20 public immutable usdc;
    LandNFT public immutable landNFT;
    LandRental public immutable landRental;
    address public gameAdmin;
    address public treasury;

    /// @notice Business type definitions
    enum BusinessType {
        Shop,          // 0 - Low cost, low revenue
        Restaurant,    // 1
        Factory,       // 2
        Office,        // 3
        Mall           // 5 - High cost, high revenue
    }

    /// @notice Business data
    struct Business {
        uint256 id;              // Business ID
        uint256 landTokenId;     // Land parcel this business is on
        BusinessType businessType;
        uint8 level;             // 1-5 upgrade level
        uint256 builtAt;         // Timestamp when built
        uint256 lastClaimTime;   // Last time revenue was claimed
        uint256 totalRevenue;    // Total revenue earned
        bool exists;             // Whether business exists
    }

    /// @notice Business type configuration
    struct BusinessConfig {
        uint256 buildCost;       // USDC cost to build (6 decimals)
        uint256 dailyRevenue;    // USDC revenue per day at level 1 (6 decimals)
        uint256 upgradeCost;     // USDC cost per upgrade level (6 decimals)
        uint8 maxLevel;          // Maximum upgrade level
        bool enabled;            // Whether this type is available
    }

    // Business ID => Business
    mapping(uint256 => Business) public businesses;

    // Land Token ID => Business ID (one business per land parcel)
    mapping(uint256 => uint256) public landBusiness;

    // Owner address => list of business IDs
    mapping(address => uint256[]) public ownerBusinesses;

    // Business Type => config
    mapping(BusinessType => BusinessConfig) public businessConfigs;

    // Revenue fee in basis points
    uint256 public revenueFeeBasisPoints;
    uint256 public constant MAX_REVENUE_FEE = 2000; // 20% max

    uint256 public nextBusinessId;
    uint256 public totalBusinesses;
    uint256 public totalRevenueGenerated;

    // Revenue cooldown - minimum time between claims
    uint256 public constant CLAIM_COOLDOWN = 1 hours;
    uint256 public constant MAX_ACCRUAL_DAYS = 30; // Max 30 days of unclaimed revenue

    // ============ Events ============

    event BusinessBuilt(uint256 indexed businessId, address indexed owner, uint256 indexed landTokenId, BusinessType businessType);
    event BusinessUpgraded(uint256 indexed businessId, uint8 oldLevel, uint8 newLevel);
    event RevenueClaimed(uint256 indexed businessId, address indexed owner, uint256 amount, uint256 fee);
    event BusinessDemolished(uint256 indexed businessId, uint256 indexed landTokenId);
    event BusinessConfigUpdated(BusinessType businessType, uint256 buildCost, uint256 dailyRevenue, uint256 upgradeCost);
    event AdminUpdated(address oldAdmin, address newAdmin);

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(msg.sender == gameAdmin, "GameEconomy: not admin");
        _;
    }

    modifier businessExists(uint256 businessId) {
        require(businesses[businessId].exists, "GameEconomy: business not found");
        _;
    }

    modifier onlyBusinessOwner(uint256 businessId) {
        require(
            _isBusinessOwner(msg.sender, businessId),
            "GameEconomy: not business owner"
        );
        _;
    }

    // ============ Constructor ============

    constructor(
        address _usdc,
        address _landNFT,
        address _landRental,
        address _treasury,
        address _admin,
        uint256 _revenueFeeBasisPoints
    ) {
        require(_usdc != address(0), "GameEconomy: zero USDC address");
        require(_landNFT != address(0), "GameEconomy: zero LandNFT address");
        require(_landRental != address(0), "GameEconomy: zero LandRental address");
        require(_treasury != address(0), "GameEconomy: zero treasury");
        require(_revenueFeeBasisPoints <= MAX_REVENUE_FEE, "GameEconomy: fee too high");

        usdc = IERC20(_usdc);
        landNFT = LandNFT(_landNFT);
        landRental = LandRental(payable(_landRental));
        treasury = _treasury;
        gameAdmin = _admin;
        revenueFeeBasisPoints = _revenueFeeBasisPoints;
        nextBusinessId = 1;

        // Initialize default business configs
        _initDefaultConfigs();
    }

    // ============ Business Building ============

    /**
     * @notice Build a business on a land parcel
     * @param landTokenId The land NFT token ID
     * @param businessType The type of business to build
     */
    function buildBusiness(uint256 landTokenId, BusinessType businessType) external {
        require(landNFT.ownerOf(landTokenId) != address(0), "GameEconomy: land doesn't exist");
        require(landBusiness[landTokenId] == 0, "GameEconomy: land already has business");
        require(_canBuildOnLand(msg.sender, landTokenId), "GameEconomy: no land access");
        require(businessConfigs[businessType].enabled, "GameEconomy: business type disabled");

        BusinessConfig memory config = businessConfigs[businessType];

        // Pay build cost
        require(
            usdc.transferFrom(msg.sender, treasury, config.buildCost),
            "GameEconomy: payment failed"
        );

        uint256 businessId = nextBusinessId++;
        totalBusinesses++;

        businesses[businessId] = Business({
            id: businessId,
            landTokenId: landTokenId,
            businessType: businessType,
            level: 1,
            builtAt: block.timestamp,
            lastClaimTime: block.timestamp,
            totalRevenue: 0,
            exists: true
        });

        landBusiness[landTokenId] = businessId;
        ownerBusinesses[msg.sender].push(businessId);

        emit BusinessBuilt(businessId, msg.sender, landTokenId, businessType);
    }

    /**
     * @notice Upgrade a business to the next level
     */
    function upgradeBusiness(uint256 businessId)
        external
        businessExists(businessId)
        onlyBusinessOwner(businessId)
    {
        Business storage biz = businesses[businessId];
        BusinessConfig memory config = businessConfigs[biz.businessType];

        require(biz.level < config.maxLevel, "GameEconomy: max level reached");

        uint256 upgradeCost = config.upgradeCost * biz.level; // Cost scales with current level

        require(
            usdc.transferFrom(msg.sender, treasury, upgradeCost),
            "GameEconomy: payment failed"
        );

        uint8 oldLevel = biz.level;
        biz.level++;

        emit BusinessUpgraded(businessId, oldLevel, biz.level);
    }

    /**
     * @notice Claim accumulated revenue from a business
     */
    function claimRevenue(uint256 businessId)
        external
        businessExists(businessId)
        onlyBusinessOwner(businessId)
    {
        Business storage biz = businesses[businessId];

        require(
            block.timestamp >= biz.lastClaimTime + CLAIM_COOLDOWN,
            "GameEconomy: claim cooldown"
        );

        uint256 revenue = _calculateRevenue(businessId);
        require(revenue > 0, "GameEconomy: no revenue to claim");

        uint256 fee = (revenue * revenueFeeBasisPoints) / 10000;
        uint256 ownerPayment = revenue - fee;

        // Treasury sends revenue from its balance (funded by build costs and fees)
        // In a real game, this would come from a revenue pool
        require(
            usdc.transfer(treasury, fee),
            "GameEconomy: fee transfer failed"
        );
        require(
            usdc.transfer(msg.sender, ownerPayment),
            "GameEconomy: payment failed"
        );

        biz.lastClaimTime = block.timestamp;
        biz.totalRevenue += ownerPayment;
        totalRevenueGenerated += revenue;

        emit RevenueClaimed(businessId, msg.sender, ownerPayment, fee);
    }

    /**
     * @notice Demolish a business (owner can reclaim land)
     */
    function demolishBusiness(uint256 businessId)
        external
        businessExists(businessId)
        onlyBusinessOwner(businessId)
    {
        Business storage biz = businesses[businessId];
        uint256 landTokenId = biz.landTokenId;

        // Claim any remaining revenue first
        uint256 revenue = _calculateRevenue(businessId);
        if (revenue > 0) {
            uint256 fee = (revenue * revenueFeeBasisPoints) / 10000;
            uint256 ownerPayment = revenue - fee;
            usdc.transfer(treasury, fee);
            usdc.transfer(msg.sender, ownerPayment);
            biz.totalRevenue += ownerPayment;
        }

        // Remove business
        delete landBusiness[landTokenId];
        biz.exists = false;
        totalBusinesses--;

        // Remove from owner's list
        _removeOwnerBusiness(msg.sender, businessId);

        emit BusinessDemolished(businessId, landTokenId);
    }

    // ============ Admin Functions ============

    function setBusinessConfig(
        BusinessType businessType,
        uint256 buildCost,
        uint256 dailyRevenue,
        uint256 upgradeCost,
        uint8 maxLevel,
        bool enabled
    ) external onlyAdmin {
        businessConfigs[businessType] = BusinessConfig({
            buildCost: buildCost,
            dailyRevenue: dailyRevenue,
            upgradeCost: upgradeCost,
            maxLevel: maxLevel,
            enabled: enabled
        });

        emit BusinessConfigUpdated(businessType, buildCost, dailyRevenue, upgradeCost);
    }

    function setRevenueFeeBasisPoints(uint256 _fee) external onlyAdmin {
        require(_fee <= MAX_REVENUE_FEE, "GameEconomy: fee too high");
        revenueFeeBasisPoints = _fee;
    }

    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "GameEconomy: zero address");
        treasury = _treasury;
    }

    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "GameEconomy: zero address");
        address old = gameAdmin;
        gameAdmin = _admin;
        emit AdminUpdated(old, _admin);
    }

    /**
     * @notice Fund the treasury so it can pay out revenue
     */
    function fundTreasury(uint256 amount) external {
        require(
            usdc.transferFrom(msg.sender, treasury, amount),
            "GameEconomy: funding failed"
        );
    }

    // ============ View Functions ============

    function getBusiness(uint256 businessId) external view businessExists(businessId) returns (Business memory) {
        return businesses[businessId];
    }

    function getBusinessConfig(BusinessType businessType) external view returns (BusinessConfig memory) {
        return businessConfigs[businessType];
    }

    function getOwnerBusinesses(address owner) external view returns (uint256[] memory) {
        return ownerBusinesses[owner];
    }

    function getPendingRevenue(uint256 businessId)
        external
        view
        businessExists(businessId)
        returns (uint256 total, uint256 ownerShare, uint256 fee)
    {
        total = _calculateRevenue(businessId);
        fee = (total * revenueFeeBasisPoints) / 10000;
        ownerShare = total - fee;
    }

    function getBusinessOnLand(uint256 landTokenId) external view returns (uint256) {
        return landBusiness[landTokenId];
    }

    function getRevenuePerDay(uint256 businessId)
        external
        view
        businessExists(businessId)
        returns (uint256)
    {
        Business storage biz = businesses[businessId];
        BusinessConfig memory config = businessConfigs[biz.businessType];
        // Revenue scales with level: level 1 = base, level 2 = 1.5x, level 3 = 2x, etc.
        return config.dailyRevenue * (100 + ((uint256(biz.level) - 1) * 50)) / 100;
    }

    // ============ Internal ============

    function _canBuildOnLand(address builder, uint256 landTokenId) internal view returns (bool) {
        // Must be land owner or active tenant
        if (landNFT.ownerOf(landTokenId) == builder) return true;

        // Check if they're an active tenant
        LandRental.Rental memory rental = landRental.getActiveRental(landTokenId);
        return rental.isActive && rental.tenant == builder;
    }

    function _isBusinessOwner(address user, uint256 businessId) internal view returns (bool) {
        Business storage biz = businesses[businessId];

        // Direct business owner
        uint256[] storage userBiz = ownerBusinesses[user];
        for (uint256 i = 0; i < userBiz.length; i++) {
            if (userBiz[i] == businessId) return true;
        }

        // Land owner (business might be on their land)
        uint256 landTokenId = biz.landTokenId;
        if (landNFT.ownerOf(landTokenId) == user) return true;

        return false;
    }

    function _calculateRevenue(uint256 businessId) internal view returns (uint256) {
        Business storage biz = businesses[businessId];
        BusinessConfig memory config = businessConfigs[biz.businessType];

        // Revenue per day scales with level
        uint256 dailyRevenue = config.dailyRevenue * (100 + ((uint256(biz.level) - 1) * 50)) / 100;

        // Calculate time elapsed, capped at MAX_ACCRUAL_DAYS
        uint256 elapsed = block.timestamp - biz.lastClaimTime;
        uint256 days = elapsed / 1 days;
        if (days > MAX_ACCRUAL_DAYS) days = MAX_ACCRUAL_DAYS;

        return dailyRevenue * days;
    }

    function _initDefaultConfigs() internal {
        // Shop: 10 USDC to build, 2 USDC/day, 5 USDC per upgrade
        businessConfigs[BusinessType.Shop] = BusinessConfig({
            buildCost: 10_000_000,       // 10 USDC
            dailyRevenue: 2_000_000,     // 2 USDC/day
            upgradeCost: 5_000_000,      // 5 USDC per level
            maxLevel: 5,
            enabled: true
        });

        // Restaurant: 25 USDC to build, 5 USDC/day, 10 USDC per upgrade
        businessConfigs[BusinessType.Restaurant] = BusinessConfig({
            buildCost: 25_000_000,       // 25 USDC
            dailyRevenue: 5_000_000,     // 5 USDC/day
            upgradeCost: 10_000_000,     // 10 USDC per level
            maxLevel: 5,
            enabled: true
        });

        // Factory: 50 USDC to build, 10 USDC/day, 20 USDC per upgrade
        businessConfigs[BusinessType.Factory] = BusinessConfig({
            buildCost: 50_000_000,       // 50 USDC
            dailyRevenue: 10_000_000,    // 10 USDC/day
            upgradeCost: 20_000_000,     // 20 USDC per level
            maxLevel: 5,
            enabled: true
        });

        // Office: 100 USDC to build, 20 USDC/day, 40 USDC per upgrade
        businessConfigs[BusinessType.Office] = BusinessConfig({
            buildCost: 100_000_000,      // 100 USDC
            dailyRevenue: 20_000_000,    // 20 USDC/day
            upgradeCost: 40_000_000,     // 40 USDC per level
            maxLevel: 5,
            enabled: true
        });

        // Mall: 250 USDC to build, 50 USDC/day, 100 USDC per upgrade
        businessConfigs[BusinessType.Mall] = BusinessConfig({
            buildCost: 250_000_000,      // 250 USDC
            dailyRevenue: 50_000_000,    // 50 USDC/day
            upgradeCost: 100_000_000,    // 100 USDC per level
            maxLevel: 5,
            enabled: true
        });
    }

    function _removeOwnerBusiness(address owner, uint256 businessId) internal {
        uint256[] storage bizList = ownerBusinesses[owner];
        for (uint256 i = 0; i < bizList.length; i++) {
            if (bizList[i] == businessId) {
                bizList[i] = bizList[bizList.length - 1];
                bizList.pop();
                break;
            }
        }
    }
}
