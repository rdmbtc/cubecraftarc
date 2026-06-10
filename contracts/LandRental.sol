// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";
import "./LandNFT.sol";

/**
 * @title LandRental - USDC-based land rental system for CubeCraft Tycoon
 * @notice Land owners list parcels for rent, tenants pay USDC to rent them
 */
contract LandRental {
    // ============ State ============

    IERC20 public immutable usdc;
    LandNFT public immutable landNFT;
    address public gameAdmin;
    address public treasury;

    /// @notice Fee percentage taken from rental payments (in basis points, e.g. 500 = 5%)
    uint256 public feeBasisPoints;
    uint256 public constant MAX_FEE_BASIS_POINTS = 1000; // 10% max

    /// @notice Rental listing for a land parcel
    struct RentalListing {
        uint256 pricePerDay;   // USDC price per day (6 decimals)
        bool isListed;         // Whether the parcel is listed for rent
        uint256 minDays;       // Minimum rental period
        uint256 maxDays;       // Maximum rental period
    }

    /// @notice Active rental agreement
    struct Rental {
        address tenant;        // Who is renting
        uint256 tokenId;       // Land NFT token ID
        uint256 startTime;     // Rental start timestamp
        uint256 endTime;       // Rental end timestamp
        uint256 totalPaid;     // Total USDC paid
        bool isActive;         // Whether rental is currently active
    }

    // Token ID => RentalListing
    mapping(uint256 => RentalListing) public listings;

    // Token ID => current active Rental
    mapping(uint256 => Rental) public activeRentals;

    // Token ID => rental history (array of past rentals)
    mapping(uint256 => Rental[]) public rentalHistory;

    // Tenant => list of token IDs they're currently renting
    mapping(address => uint256[]) public tenantRentals;

    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public treasuryRevenue;

    // ============ Events ============

    event LandListed(uint256 indexed tokenId, uint256 pricePerDay, uint256 minDays, uint256 maxDays);
    event LandUnlisted(uint256 indexed tokenId);
    event LandRented(uint256 indexed tokenId, address indexed tenant, uint256 startTime, uint256 endTime, uint256 totalCost);
    event RentalExpired(uint256 indexed tokenId, address indexed tenant);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event RevenueWithdrawn(address indexed to, uint256 amount);

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(msg.sender == gameAdmin, "LandRental: not admin");
        _;
    }

    modifier onlyLandOwner(uint256 tokenId) {
        require(landNFT.ownerOf(tokenId) == msg.sender, "LandRental: not land owner");
        _;
    }

    modifier listingExists(uint256 tokenId) {
        require(listings[tokenId].isListed, "LandRental: not listed");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _usdc,
        address _landNFT,
        address _treasury,
        address _admin,
        uint256 _feeBasisPoints
    ) {
        require(_usdc != address(0), "LandRental: zero USDC address");
        require(_landNFT != address(0), "LandRental: zero LandNFT address");
        require(_treasury != address(0), "LandRental: zero treasury");
        require(_feeBasisPoints <= MAX_FEE_BASIS_POINTS, "LandRental: fee too high");

        usdc = IERC20(_usdc);
        landNFT = LandNFT(_landNFT);
        treasury = _treasury;
        gameAdmin = _admin;
        feeBasisPoints = _feeBasisPoints;
    }

    // ============ Listing Management ============

    /**
     * @notice List a land parcel for rent
     * @param tokenId The land NFT token ID
     * @param pricePerDay USDC price per day (6 decimals)
     * @param minDays Minimum rental period in days
     * @param maxDays Maximum rental period in days (0 = no max)
     */
    function listLand(
        uint256 tokenId,
        uint256 pricePerDay,
        uint256 minDays,
        uint256 maxDays
    ) external onlyLandOwner(tokenId) {
        require(pricePerDay > 0, "LandRental: price must be > 0");
        require(minDays >= 1, "LandRental: min days >= 1");
        require(maxDays == 0 || maxDays >= minDays, "LandRental: max < min");
        require(!_hasActiveRental(tokenId), "LandRental: currently rented");

        listings[tokenId] = RentalListing({
            pricePerDay: pricePerDay,
            isListed: true,
            minDays: minDays,
            maxDays: maxDays
        });

        emit LandListed(tokenId, pricePerDay, minDays, maxDays);
    }

    /**
     * @notice Unlist a land parcel
     */
    function unlistLand(uint256 tokenId) external onlyLandOwner(tokenId) listingExists(tokenId) {
        require(!_hasActiveRental(tokenId), "LandRental: currently rented");
        delete listings[tokenId];
        emit LandUnlisted(tokenId);
    }

    /**
     * @notice Update rental price (only when not actively rented)
     */
    function updateListing(
        uint256 tokenId,
        uint256 newPricePerDay,
        uint256 newMinDays,
        uint256 newMaxDays
    ) external onlyLandOwner(tokenId) listingExists(tokenId) {
        require(!_hasActiveRental(tokenId), "LandRental: currently rented");
        require(newPricePerDay > 0, "LandRental: price must be > 0");
        require(newMinDays >= 1, "LandRental: min days >= 1");
        require(newMaxDays == 0 || newMaxDays >= newMinDays, "LandRental: max < min");

        listings[tokenId].pricePerDay = newPricePerDay;
        listings[tokenId].minDays = newMinDays;
        listings[tokenId].maxDays = newMaxDays;

        emit LandListed(tokenId, newPricePerDay, newMinDays, newMaxDays);
    }

    // ============ Rental ============

    /**
     * @notice Rent a listed land parcel
     * @param tokenId The land NFT token ID
     * @param days Number of days to rent
     */
    function rentLand(uint256 tokenId, uint256 days)
        external
        listingExists(tokenId)
    {
        require(!_hasActiveRental(tokenId), "LandRental: already rented");
        require(days >= listings[tokenId].minDays, "LandRental: below min days");
        require(
            listings[tokenId].maxDays == 0 || days <= listings[tokenId].maxDays,
            "LandRental: above max days"
        );

        address landOwner = landNFT.ownerOf(tokenId);
        require(msg.sender != landOwner, "LandRental: owner cannot rent own land");

        uint256 totalCost = listings[tokenId].pricePerDay * days;
        uint256 fee = (totalCost * feeBasisPoints) / 10000;
        uint256 ownerPayment = totalCost - fee;

        // Transfer USDC from tenant
        require(
            usdc.transferFrom(msg.sender, landOwner, ownerPayment),
            "LandRental: owner payment failed"
        );
        require(
            usdc.transferFrom(msg.sender, treasury, fee),
            "LandRental: fee payment failed"
        );

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (days * 1 days);

        activeRentals[tokenId] = Rental({
            tenant: msg.sender,
            tokenId: tokenId,
            startTime: startTime,
            endTime: endTime,
            totalPaid: totalCost,
            isActive: true
        });

        tenantRentals[msg.sender].push(tokenId);

        totalRevenue += totalCost;
        treasuryRevenue += fee;

        emit LandRented(tokenId, msg.sender, startTime, endTime, totalCost);
    }

    /**
     * @notice Claim expired rental (anyone can call to expire)
     */
    function expireRental(uint256 tokenId) external {
        Rental storage rental = activeRentals[tokenId];
        require(rental.isActive, "LandRental: no active rental");
        require(block.timestamp >= rental.endTime, "LandRental: not expired yet");

        address tenant = rental.tenant;
        rental.isActive = false;

        // Archive to history
        rentalHistory[tokenId].push(rental);

        // Remove from tenant's list
        _removeTenantRental(tenant, tokenId);

        // Clear active rental data
        delete activeRentals[tokenId];

        emit RentalExpired(tokenId, tenant);
    }

    // ============ Admin ============

    function setFeeBasisPoints(uint256 _feeBasisPoints) external onlyAdmin {
        require(_feeBasisPoints <= MAX_FEE_BASIS_POINTS, "LandRental: fee too high");
        uint256 oldFee = feeBasisPoints;
        feeBasisPoints = _feeBasisPoints;
        emit FeeUpdated(oldFee, _feeBasisPoints);
    }

    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "LandRental: zero address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "LandRental: zero address");
        gameAdmin = _admin;
    }

    // ============ View Functions ============

    function getListing(uint256 tokenId) external view returns (RentalListing memory) {
        return listings[tokenId];
    }

    function getActiveRental(uint256 tokenId) external view returns (Rental memory) {
        return activeRentals[tokenId];
    }

    function getRentalHistory(uint256 tokenId) external view returns (Rental[] memory) {
        return rentalHistory[tokenId];
    }

    function getTenantRentals(address tenant) external view returns (uint256[] memory) {
        return tenantRentals[tenant];
    }

    function isRented(uint256 tokenId) external view returns (bool) {
        return _hasActiveRental(tokenId);
    }

    function getRentalCost(uint256 tokenId, uint256 days)
        external
        view
        listingExists(tokenId)
        returns (uint256 totalCost, uint256 ownerPayment, uint256 fee)
    {
        totalCost = listings[tokenId].pricePerDay * days;
        fee = (totalCost * feeBasisPoints) / 10000;
        ownerPayment = totalCost - fee;
    }

    function isRentalExpired(uint256 tokenId) external view returns (bool) {
        if (!activeRentals[tokenId].isActive) return false;
        return block.timestamp >= activeRentals[tokenId].endTime;
    }

    function getRemainingTime(uint256 tokenId) external view returns (uint256) {
        if (!activeRentals[tokenId].isActive) return 0;
        if (block.timestamp >= activeRentals[tokenId].endTime) return 0;
        return activeRentals[tokenId].endTime - block.timestamp;
    }

    // ============ Internal ============

    function _hasActiveRental(uint256 tokenId) internal view returns (bool) {
        Rental storage rental = activeRentals[tokenId];
        if (!rental.isActive) return false;
        if (block.timestamp >= rental.endTime) return false;
        return true;
    }

    function _removeTenantRental(address tenant, uint256 tokenId) internal {
        uint256[] storage rentals = tenantRentals[tenant];
        for (uint256 i = 0; i < rentals.length; i++) {
            if (rentals[i] == tokenId) {
                rentals[i] = rentals[rentals.length - 1];
                rentals.pop();
                break;
            }
        }
    }
}
