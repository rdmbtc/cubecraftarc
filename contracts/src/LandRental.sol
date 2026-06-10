// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LandRental - USDC-based land rental on Arc Testnet
contract LandRental is Ownable, ReentrancyGuard {
    IERC721 public landNFT;
    IERC20 public usdc;
    address public treasury;
    uint256 public treasuryFeePercent = 5;

    struct Rental {
        address tenant;
        uint256 startTime;
        uint256 endTime;
        uint256 totalPaid;
        uint256 pricePerDay;
    }

    mapping(uint256 => Rental) public activeRentals;

    event RentalCreated(uint256 indexed tokenId, address indexed tenant, uint256 duration, uint256 amount);
    event RentalExpired(uint256 indexed tokenId);

    constructor(address _landNFT, address _usdc, address _treasury) Ownable(msg.sender) {
        landNFT = IERC721(_landNFT);
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    /// @notice Rent a land parcel for specified days. Price read from LandNFT.
    function rentParcel(uint256 tokenId, uint256 pricePerDay, uint256 days) external nonReentrant {
        require(days > 0 && days <= 365, "Invalid duration");

        Rental storage rental = activeRentals[tokenId];
        if (rental.tenant != address(0)) {
            require(block.timestamp >= rental.endTime, "Rental still active");
        }

        uint256 totalCost = pricePerDay * days;
        require(usdc.transferFrom(msg.sender, address(this), totalCost), "USDC transfer failed");

        uint256 fee = (totalCost * treasuryFeePercent) / 100;
        uint256 ownerPayment = totalCost - fee;

        address landOwner = landNFT.ownerOf(tokenId);
        usdc.transfer(landOwner, ownerPayment);
        usdc.transfer(treasury, fee);

        activeRentals[tokenId] = Rental({
            tenant: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + (days * 1 days),
            totalPaid: totalCost,
            pricePerDay: pricePerDay
        });

        emit RentalCreated(tokenId, msg.sender, days, totalCost);
    }

    function isRentalActive(uint256 tokenId) external view returns (bool) {
        Rental storage rental = activeRentals[tokenId];
        return rental.tenant != address(0) && block.timestamp < rental.endTime;
    }

    function getRental(uint256 tokenId) external view returns (Rental memory) {
        return activeRentals[tokenId];
    }

    function setTreasuryFee(uint256 _percent) external onlyOwner {
        require(_percent <= 20, "Fee too high");
        treasuryFeePercent = _percent;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
